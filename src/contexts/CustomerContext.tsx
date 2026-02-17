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
 * Active = activated on or before end of month AND (not deactivated OR deactivated after start of month).
 */
function isActiveInMonth(customer: Customer, month: string): boolean {
  const [year, mon] = month.split("-").map(Number);
  // Last day of the month
  const endOfMonth = new Date(year, mon, 0); // day 0 of next month = last day
  const startOfMonth = new Date(year, mon - 1, 1);

  // Must have an activation date on or before end of month
  if (!customer.dataAtivacao) return false;
  const activationDate = new Date(customer.dataAtivacao);
  if (activationDate > endOfMonth) return false;

  // If no deactivation date, still active
  if (!customer.dataDesativacao) return true;

  // Deactivated after the start of the month means they were active at some point
  const deactivationDate = new Date(customer.dataDesativacao);
  return deactivationDate >= startOfMonth;
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
      // Update local state optimistically so KPIs refresh immediately
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
