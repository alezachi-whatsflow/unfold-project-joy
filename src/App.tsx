import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FinancialProvider } from "@/contexts/FinancialContext";
import { CustomerProvider } from "@/contexts/CustomerContext";
import { ProductProvider } from "@/contexts/ProductContext";
import { CostLinesProvider } from "@/contexts/CostLinesContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import DataInputPage from "./pages/DataInputPage";
import CustomersPage from "./pages/CustomersPage";
import ProductsPage from "./pages/ProductsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FinancialProvider>
        <CustomerProvider>
          <ProductProvider>
            <CostLinesProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<DashboardLayout><Index /></DashboardLayout>} />
                <Route
                  path="/input"
                  element={
                    <DashboardLayout>
                      <DataInputPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <DashboardLayout>
                      <CustomersPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <DashboardLayout>
                      <ProductsPage />
                    </DashboardLayout>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </CostLinesProvider>
          </ProductProvider>
        </CustomerProvider>
      </FinancialProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
