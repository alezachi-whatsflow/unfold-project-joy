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
import { toast } from "sonner";

interface CustomerContextType {
  customers: Customer[];
  activeCustomers: Customer[];
  totalMRR: number;
  totalCustomers: number;
  activeCount: number;
  churnedCount: number;
  isLoading: boolean;
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
    () => customers.filter((c) => c.status.toLowerCase() === "ativo"),
    [customers]
  );

  const totalMRR = useMemo(
    () => activeCustomers.reduce((sum, c) => sum + c.valorUltimaCobranca, 0),
    [activeCustomers]
  );

  const activeCount = activeCustomers.length;
  const churnedCount = useMemo(
    () => customers.filter((c) => c.status.toLowerCase() === "desativado").length,
    [customers]
  );

  const importCustomersHandler = useCallback(
    async (newCustomers: Customer[]) => {
      try {
        await importCustomersBatch(newCustomers);
        await loadCustomers();
      } catch (err) {
        console.error("Erro ao importar clientes:", err);
        toast.error("Erro ao importar clientes para o banco");
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
        totalMRR,
        totalCustomers: customers.length,
        activeCount,
        churnedCount,
        isLoading,
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
