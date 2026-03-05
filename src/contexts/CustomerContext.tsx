import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Customer } from "@/types/customers";
import {
  fetchCustomers,
  importCustomersBatch,
  deleteCustomerById,
} from "@/lib/customerQueries";
import { useFinancial } from "@/contexts/FinancialContext";
import { toast } from "sonner";

/**
 * Determines if a customer was active during a given month (YYYY-MM).
 * Uses explicit status first, then date logic as fallback.
 */
function isActiveInMonth(customer: Customer, month: string): boolean {
  const statusLower = customer.status.toLowerCase();

  if (statusLower === "ativo") return true;

  if (
    statusLower === "inativo" ||
    statusLower === "desativado" ||
    statusLower === "bloqueado" ||
    statusLower === "cancelado"
  )
    return false;

  // Fallback: date-based logic
  const [year, mon] = month.split("-").map(Number);
  const endOfMonth = new Date(year, mon, 0);
  const startOfMonth = new Date(year, mon - 1, 1);

  if (!customer.dataAtivacao) return false;
  const activationDate = new Date(customer.dataAtivacao);
  if (isNaN(activationDate.getTime()) || activationDate > endOfMonth) return false;

  // Check cancellation
  if (customer.dataCancelado) {
    const cancelDate = new Date(customer.dataCancelado);
    if (!isNaN(cancelDate.getTime()) && cancelDate < startOfMonth) return false;
  }

  // Check bloqueio (block)
  if (customer.dataBloqueio && !customer.dataDesbloqueio) {
    const blockDate = new Date(customer.dataBloqueio);
    if (!isNaN(blockDate.getTime()) && blockDate < startOfMonth) return false;
  }

  return true;
}

interface CustomerMonthMetrics {
  totalCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  mrr: number;
}

interface CustomerContextType {
  customers: Customer[];
  activeCustomers: Customer[];
  inactiveCustomers: Customer[];
  totalMRR: number;
  totalCustomers: number;
  activeCount: number;
  churnedCount: number;
  isLoading: boolean;
  selectedMonth: string;
  importCustomers: (customers: Customer[]) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  getCustomerMetricsForMonth: (month: string) => CustomerMonthMetrics;
  getAvailableMonths: () => string[];
}

const CustomerContext = createContext<CustomerContextType | null>(null);

export function CustomerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { selectedMonth } = useFinancial();

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
      toast.error("Erro ao carregar clientes do banco de dados");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const activeCustomers = useMemo(
    () => customers.filter((c) => isActiveInMonth(c, selectedMonth)),
    [customers, selectedMonth]
  );

  const inactiveCustomers = useMemo(
    () => customers.filter((c) => !isActiveInMonth(c, selectedMonth)),
    [customers, selectedMonth]
  );

  const totalMRR = useMemo(
    () => activeCustomers.reduce((sum, c) => sum + c.valorUltimaCobranca, 0),
    [activeCustomers]
  );

  const activeCount = activeCustomers.length;
  const churnedCount = inactiveCustomers.length;

  const importCustomersHandler = useCallback(
    async (newCustomers: Customer[]) => {
      setCustomers((prev) => {
        const emailMap = new Map(prev.map((c) => [c.email, c]));
        for (const nc of newCustomers) {
          emailMap.set(nc.email, nc);
        }
        return Array.from(emailMap.values()).sort((a, b) =>
          a.nome.localeCompare(b.nome)
        );
      });

      try {
        await importCustomersBatch(newCustomers);
        await loadCustomers();
      } catch (err) {
        console.error("Erro ao importar clientes:", err);
        toast.error("Erro ao salvar no banco — dados exibidos localmente.");
      }
    },
    [loadCustomers]
  );

  const deleteCustomerHandler = useCallback(
    async (id: string) => {
      try {
        await deleteCustomerById(id);
        await loadCustomers();
      } catch (err) {
        console.error("Erro ao deletar cliente:", err);
        toast.error("Erro ao deletar cliente do banco");
      }
    },
    [loadCustomers]
  );

  const getCustomerMetricsForMonth = useCallback(
    (month: string): CustomerMonthMetrics => {
      const active = customers.filter((c) => isActiveInMonth(c, month));
      const mrr = active.reduce((sum, c) => sum + c.valorUltimaCobranca, 0);

      // New customers: activated in this month
      const [year, mon] = month.split("-").map(Number);
      const newCustomers = customers.filter((c) => {
        if (!c.dataAtivacao) return false;
        const d = new Date(c.dataAtivacao);
        return d.getFullYear() === year && d.getMonth() + 1 === mon;
      }).length;

      // Churned: cancelled in this month
      const churnedCustomers = customers.filter((c) => {
        if (!c.dataCancelado) return false;
        const d = new Date(c.dataCancelado);
        return d.getFullYear() === year && d.getMonth() + 1 === mon;
      }).length;

      return {
        totalCustomers: active.length,
        newCustomers,
        churnedCustomers,
        mrr,
      };
    },
    [customers]
  );

  const getAvailableMonths = useCallback((): string[] => {
    const months = new Set<string>();
    for (const c of customers) {
      if (c.dataAtivacao) {
        const d = new Date(c.dataAtivacao);
        if (!isNaN(d.getTime())) {
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }
      }
      if (c.dataCancelado) {
        const d = new Date(c.dataCancelado);
        if (!isNaN(d.getTime())) {
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }
      }
    }
    return Array.from(months).sort();
  }, [customers]);

  return (
    <CustomerContext.Provider
      value={{
        customers,
        activeCustomers,
        inactiveCustomers,
        totalMRR,
        totalCustomers: customers.length,
        activeCount,
        churnedCount,
        isLoading,
        selectedMonth,
        importCustomers: importCustomersHandler,
        deleteCustomer: deleteCustomerHandler,
        refetch: loadCustomers,
        getCustomerMetricsForMonth,
        getAvailableMonths,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers() {
  const ctx = useContext(CustomerContext);
  if (!ctx)
    throw new Error("useCustomers must be used within CustomerProvider");
  return ctx;
}
