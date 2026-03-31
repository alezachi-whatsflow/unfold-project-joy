import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { Product, ProductMetrics, ProductHealth } from "@/types/products";
import { WHATSFLOW_PRODUCTS } from "@/lib/productData";
import { useTenantId } from "@/hooks/useTenantId";
import { supabase } from "@/integrations/supabase/client";

export function calculateProductMetrics(product: Product): ProductMetrics {
  const totalCosts =
    product.cogs +
    product.laborCost +
    product.supportCost +
    product.price * (product.salesCommission / 100);

  const contributionMargin = product.price - totalCosts;
  const contributionMarginPercent =
    product.price > 0 ? (contributionMargin / product.price) * 100 : 0;

  let health: ProductHealth;
  if (contributionMarginPercent >= 70) health = "excellent";
  else if (contributionMarginPercent >= 50) health = "good";
  else if (contributionMarginPercent >= 30) health = "warning";
  else health = "critical";

  return { contributionMargin, contributionMarginPercent, health };
}

/* ── Map DB row to Product type ── */
function dbToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category || "plan_base",
    type: row.type || "recurring",
    status: row.is_active ? "active" : "inactive",
    price: Number(row.price) || 0,
    billingCycle: row.billing_cycle || "monthly",
    cogs: Number(row.cogs) || 0,
    laborCost: Number(row.labor_cost) || 0,
    salesCommission: Number(row.sales_commission_pct) || 0,
    supportCost: Number(row.support_cost) || 0,
    description: row.description || undefined,
    activeCustomers: row.active_customers || 0,
    mrr: Number(row.mrr) || 0,
    totalRevenue: Number(row.total_revenue) || 0,
    includes: row.metadata?.includes || undefined,
    features: row.metadata?.features || undefined,
    limitations: row.metadata?.limitations || undefined,
    hourlyRate: row.metadata?.hourlyRate || undefined,
    monthlyHours: row.metadata?.monthlyHours || undefined,
    weeklyHours: row.metadata?.weeklyHours || undefined,
    deliveryTime: row.metadata?.deliveryTime || undefined,
    churnRate: row.metadata?.churnRate || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/* ── Map Product to DB row ── */
function productToDb(p: Product, tenantId: string): Record<string, any> {
  return {
    id: p.id,
    tenant_id: tenantId,
    name: p.name,
    category: p.category,
    type: p.type,
    price: p.price,
    billing_cycle: p.billingCycle,
    cogs: p.cogs,
    labor_cost: p.laborCost,
    sales_commission_pct: p.salesCommission,
    support_cost: p.supportCost,
    description: p.description || null,
    active_customers: p.activeCustomers,
    mrr: p.mrr,
    total_revenue: p.totalRevenue,
    is_active: p.status === "active",
    metadata: {
      includes: p.includes,
      features: p.features,
      limitations: p.limitations,
      hourlyRate: p.hourlyRate,
      monthlyHours: p.monthlyHours,
      weeklyHours: p.weeklyHours,
      deliveryTime: p.deliveryTime,
      churnRate: p.churnRate,
    },
    updated_at: new Date().toISOString(),
  };
}

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getMetrics: (product: Product) => ProductMetrics;
  portfolioKPIs: {
    totalProducts: number;
    recurringCount: number;
    oneTimeCount: number;
    avgMargin: number;
    totalMRR: number;
    mostProfitableProduct: { name: string; margin: number } | null;
  };
}

const ProductContext = createContext<ProductContextType | null>(null);

const WHATSFLOW_TENANT = "00000000-0000-0000-0000-000000000001";

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const tenantId = useTenantId();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Load products from database
  useEffect(() => {
    if (!tenantId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("[ProductContext] Error loading products:", error);
        // Fallback: try localStorage migration
        const localKey = `wf_products_${tenantId}`;
        try {
          const saved = localStorage.getItem(localKey);
          if (saved) {
            const localProducts: Product[] = JSON.parse(saved);
            setProducts(localProducts);
            // Migrate to DB in background
            migrateLocalToDb(localProducts, tenantId);
            return;
          }
        } catch { /* ignore */ }

        // Final fallback for Whatsflow tenant
        if (tenantId === WHATSFLOW_TENANT) setProducts(WHATSFLOW_PRODUCTS);
        else setProducts([]);
      } else if (data && data.length > 0) {
        setProducts(data.map(dbToProduct));
      } else {
        // No data in DB — try localStorage migration
        const localKey = `wf_products_${tenantId}`;
        try {
          const saved = localStorage.getItem(localKey);
          if (saved) {
            const localProducts: Product[] = JSON.parse(saved);
            setProducts(localProducts);
            migrateLocalToDb(localProducts, tenantId);
            return;
          }
        } catch { /* ignore */ }

        // Seed with defaults for Whatsflow tenant
        if (tenantId === WHATSFLOW_TENANT) {
          setProducts(WHATSFLOW_PRODUCTS);
          migrateLocalToDb(WHATSFLOW_PRODUCTS, tenantId);
        } else {
          setProducts([]);
        }
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [tenantId]);

  // One-time migration from localStorage to DB
  async function migrateLocalToDb(localProducts: Product[], tid: string) {
    for (const p of localProducts) {
      const row = productToDb(p, tid);
      await (supabase as any)
        .from("products")
        .upsert(row, { onConflict: "id" })
        .then(({ error }: any) => {
          if (error) console.warn("[ProductContext] Migration upsert error:", error);
        });
    }
    // Clear localStorage after successful migration
    localStorage.removeItem(`wf_products_${tid}`);
    console.log(`[ProductContext] Migrated ${localProducts.length} products from localStorage to DB`);
    setLoading(false);
  }

  const addProduct = useCallback((product: Product) => {
    setProducts((prev) => [...prev, product]);
    if (tenantId) {
      const row = productToDb(product, tenantId);
      (supabase as any).from("products").insert(row).then(({ error }: any) => {
        if (error) console.error("[ProductContext] Insert error:", error);
      });
    }
  }, [tenantId]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p))
    );
    if (tenantId) {
      // Re-build the full row from the updated product
      setProducts((prev) => {
        const updated = prev.find((p) => p.id === id);
        if (updated) {
          const row = productToDb(updated, tenantId);
          (supabase as any).from("products").update(row).eq("id", id).then(({ error }: any) => {
            if (error) console.error("[ProductContext] Update error:", error);
          });
        }
        return prev;
      });
    }
  }, [tenantId]);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    (supabase as any).from("products").delete().eq("id", id).then(({ error }: any) => {
      if (error) console.error("[ProductContext] Delete error:", error);
    });
  }, []);

  const getMetrics = useCallback((product: Product) => {
    return calculateProductMetrics(product);
  }, []);

  const portfolioKPIs = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === "active");
    const recurringCount = activeProducts.filter((p) => p.type === "recurring").length;
    const oneTimeCount = activeProducts.filter((p) => p.type === "one_time").length;

    const margins = activeProducts.map((p) => calculateProductMetrics(p));
    const avgMargin =
      margins.length > 0
        ? margins.reduce((s, m) => s + m.contributionMarginPercent, 0) / margins.length
        : 0;

    const totalMRR = activeProducts
      .filter((p) => p.type === "recurring")
      .reduce((s, p) => s + p.mrr, 0);

    let mostProfitableProduct: { name: string; margin: number } | null = null;
    let maxMargin = -Infinity;
    activeProducts.forEach((p) => {
      const m = calculateProductMetrics(p);
      if (m.contributionMarginPercent > maxMargin) {
        maxMargin = m.contributionMarginPercent;
        mostProfitableProduct = { name: p.name, margin: m.contributionMarginPercent };
      }
    });

    return {
      totalProducts: activeProducts.length,
      recurringCount,
      oneTimeCount,
      avgMargin,
      totalMRR,
      mostProfitableProduct,
    };
  }, [products]);

  return (
    <ProductContext.Provider
      value={{ products, loading, addProduct, updateProduct, deleteProduct, getMetrics, portfolioKPIs }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProducts must be used within ProductProvider");
  return ctx;
}
