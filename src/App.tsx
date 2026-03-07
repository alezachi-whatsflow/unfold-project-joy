import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { FinancialProvider } from "@/contexts/FinancialContext";
import { CustomerProvider } from "@/contexts/CustomerContext";
import { ProductProvider } from "@/contexts/ProductContext";
import { CostLinesProvider } from "@/contexts/CostLinesContext";
import { IntelligenceProvider } from "@/contexts/IntelligenceContext";
import { AsaasProvider } from "@/contexts/AsaasContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarPrefsProvider } from "@/contexts/SidebarPrefsContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import DataInputPage from "./pages/DataInputPage";
import CustomersPage from "./pages/CustomersPage";
import ProductsPage from "./pages/ProductsPage";
import IntelligencePage from "./pages/IntelligencePage";
import CobrancasPage from "./pages/CobrancasPage";
import ExpensesPage from "./pages/ExpensesPage";
import RevenuePage from "./pages/RevenuePage";
import ReportsPage from "./pages/ReportsPage";
import ComissoesPage from "./pages/ComissoesPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />

    {/* Protected */}
    <Route path="/" element={<ProtectedRoute><DashboardLayout><Index /></DashboardLayout></ProtectedRoute>} />
    <Route path="/input" element={<ProtectedRoute><DashboardLayout><DataInputPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/cobrancas" element={<ProtectedRoute><DashboardLayout><CobrancasPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/expenses" element={<ProtectedRoute><DashboardLayout><ExpensesPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/revenue" element={<ProtectedRoute><DashboardLayout><RevenuePage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/comissoes" element={<ProtectedRoute><DashboardLayout><ComissoesPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/customers" element={<ProtectedRoute><DashboardLayout><CustomersPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/products" element={<ProtectedRoute><DashboardLayout><ProductsPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/intelligence" element={<ProtectedRoute><DashboardLayout><IntelligencePage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><DashboardLayout><ReportsPage /></DashboardLayout></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SidebarPrefsProvider>
          <FinancialProvider>
            <CustomerProvider>
              <ProductProvider>
                <CostLinesProvider>
                <IntelligenceProvider>
                <AsaasProvider>
                  <AppRoutes />
                </AsaasProvider>
                </IntelligenceProvider>
                </CostLinesProvider>
              </ProductProvider>
            </CustomerProvider>
          </FinancialProvider>
          </SidebarPrefsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
