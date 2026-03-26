import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { Product, ProductMetrics, ProductHealth } from "@/types/products";
import { WHATSFLOW_PRODUCTS } from "@/lib/productData";
import { useTenantId } from "@/hooks/useTenantId";

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

interface ProductContextType {
  products: Product[];
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

  // Load products per tenant: only Whatsflow EDTECH has seed data, others start empty
  const [products, setProducts] = useState<Product[]>(() => {
    if (!tenantId) return [];
    const key = `wf_products_${tenantId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Only seed Whatsflow EDTECH with hardcoded products
    return tenantId === WHATSFLOW_TENANT ? WHATSFLOW_PRODUCTS : [];
  });

  // Persist products to localStorage per tenant
  useEffect(() => {
    if (!tenantId) return;
    const key = `wf_products_${tenantId}`;
    try { localStorage.setItem(key, JSON.stringify(products)); } catch {}
  }, [products, tenantId]);

  const addProduct = useCallback((product: Product) => {
    setProducts((prev) => [...prev, product]);
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p))
    );
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
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
      value={{ products, addProduct, updateProduct, deleteProduct, getMetrics, portfolioKPIs }}
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
