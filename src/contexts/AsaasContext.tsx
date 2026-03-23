import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { AsaasPayment, AsaasCustomer, DunningRule } from "@/types/asaas";
import {
  fetchAsaasPayments,
  fetchAsaasCustomers,
  fetchDunningRules,
  syncCustomersFromAsaas,
  syncPaymentsFromAsaas,
  calculatePaymentStats,
  type PaymentStats,
} from "@/lib/asaasQueries";
import { toast } from "sonner";

interface AsaasContextType {
  payments: AsaasPayment[];
  customers: AsaasCustomer[];
  dunningRules: DunningRule[];
  stats: PaymentStats | null;
  isLoading: boolean;
  isSyncing: boolean;
  environment: "sandbox" | "production";
  setEnvironment: (env: "sandbox" | "production") => void;
  syncAll: () => Promise<void>;
  syncCustomers: () => Promise<void>;
  syncPayments: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AsaasContext = createContext<AsaasContextType | null>(null);

export function AsaasProvider({ children }: { children: React.ReactNode }) {
  const [payments, setPayments] = useState<AsaasPayment[]>([]);
  const [customers, setCustomers] = useState<AsaasCustomer[]>([]);
  const [dunningRules, setDunningRules] = useState<DunningRule[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [tenantId, setTenantId] = useState<string>("");

  useEffect(() => {
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from("user_tenants").select("tenant_id").eq("user_id", user.id).limit(1).single()
            .then(({ data }) => { if (data?.tenant_id) setTenantId(data.tenant_id); });
        }
      });
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    try {
      setIsLoading(true);
      const [p, c, d] = await Promise.all([
        fetchAsaasPayments(tenantId),
        fetchAsaasCustomers(tenantId),
        fetchDunningRules(tenantId),
      ]);
      setPayments(p);
      setCustomers(c);
      setDunningRules(d);
      setStats(calculatePaymentStats(p));
    } catch (err) {
      console.error("Erro ao carregar dados Asaas:", err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const syncCustomersHandler = useCallback(async () => {
    try {
      setIsSyncing(true);
      const count = await syncCustomersFromAsaas(tenantId, environment);
      toast.success(`${count} clientes sincronizados do Asaas`);
      await loadData();
    } catch (err) {
      console.error("Erro ao sincronizar clientes:", err);
      toast.error("Erro ao sincronizar clientes do Asaas");
    } finally {
      setIsSyncing(false);
    }
  }, [environment, loadData]);

  const syncPaymentsHandler = useCallback(async () => {
    try {
      setIsSyncing(true);
      const count = await syncPaymentsFromAsaas(tenantId, environment);
      toast.success(`${count} cobranças sincronizadas do Asaas`);
      await loadData();
    } catch (err) {
      console.error("Erro ao sincronizar cobranças:", err);
      toast.error("Erro ao sincronizar cobranças do Asaas");
    } finally {
      setIsSyncing(false);
    }
  }, [environment, loadData]);

  const syncAll = useCallback(async () => {
    await syncCustomersHandler();
    await syncPaymentsHandler();
  }, [syncCustomersHandler, syncPaymentsHandler]);

  return (
    <AsaasContext.Provider
      value={{
        payments,
        customers,
        dunningRules,
        stats,
        isLoading,
        isSyncing,
        environment,
        setEnvironment,
        syncAll,
        syncCustomers: syncCustomersHandler,
        syncPayments: syncPaymentsHandler,
        refetch: loadData,
      }}
    >
      {children}
    </AsaasContext.Provider>
  );
}

export function useAsaas() {
  const ctx = useContext(AsaasContext);
  if (!ctx) throw new Error("useAsaas must be used within AsaasProvider");
  return ctx;
}
