import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FinancialProvider } from "@/contexts/FinancialContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import DataInputPage from "./pages/DataInputPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FinancialProvider>
        <BrowserRouter>
          <Routes>
            {/* Dashboard: full-width, no sidebar */}
            <Route path="/" element={<Index />} />
            {/* Input page: with sidebar layout */}
            <Route
              path="/input"
              element={
                <DashboardLayout>
                  <DataInputPage />
                </DashboardLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </FinancialProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
