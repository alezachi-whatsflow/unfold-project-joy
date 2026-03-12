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
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
import DataInputPage from "./pages/DataInputPage";
import CustomersPage from "./pages/CustomersPage";
import ProductsPage from "./pages/ProductsPage";
import IntelligencePage from "./pages/IntelligencePage";
import CobrancasPage from "./pages/CobrancasPage";
import ExpensesPage from "./pages/ExpensesPage";
import RevenuePage from "./pages/RevenuePage";
import ReportsPage from "./pages/ReportsPage";
import ComissoesPage from "./pages/ComissoesPage";
import FiscalPage from "./pages/FiscalPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AcessoNegadoPage from "./pages/AcessoNegadoPage";
import ProfilePage from "./pages/ProfilePage";
import UsersPage from "./pages/UsersPage";
import VendasPage from "./pages/VendasPage";
import MensageriaPage from "./pages/MensageriaPage";
import IntegracoesPage from "./pages/IntegracoesPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import CrmPage from "./pages/CrmPage";
import ConversationsPage from "./pages/ConversationsPage";
import WaConnectionsPage from "./pages/WaConnectionsPage";
import AssinaturaPage from "./pages/AssinaturaPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotFound from "./pages/NotFound";
import ManualPage from "./pages/ManualPage";
import ComunidadePage from "./pages/sistema/ComunidadePage";
import TutoriaisPage from "./pages/sistema/TutoriaisPage";
import ManualSistemaPage from "./pages/sistema/ManualSistemaPage";
import OnboardingPage from "./pages/sistema/OnboardingPage";

// SuperAdmin
import SuperAdminLayout from "./pages/superadmin/SuperAdminLayout";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import SuperAdminTenants from "./pages/superadmin/SuperAdminTenants";
import SuperAdminLicenses from "./pages/superadmin/SuperAdminLicenses";
import SuperAdminAuditLog from "./pages/superadmin/SuperAdminAuditLog";
import SuperAdminConfig from "./pages/superadmin/SuperAdminConfig";

import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
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
    <Route path="/acesso-negado" element={<AuthGuard><AcessoNegadoPage /></AuthGuard>} />

    {/* SuperAdmin Portal */}
    <Route path="/superadmin" element={<AuthGuard><SuperAdminLayout /></AuthGuard>}>
      <Route index element={<SuperAdminDashboard />} />
      <Route path="tenants" element={<SuperAdminTenants />} />
      <Route path="licencas" element={<SuperAdminLicenses />} />
      <Route path="audit" element={<SuperAdminAuditLog />} />
      <Route path="config" element={<SuperAdminConfig />} />
    </Route>

    {/* Protected — each route wrapped with module permission */}
    <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
    <Route path="/dashboard" element={<AuthGuard><DashboardLayout><ProtectedRoute module="dashboard"><Index /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/vendas" element={<AuthGuard><DashboardLayout><ProtectedRoute module="vendas"><VendasPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/input" element={<AuthGuard><DashboardLayout><ProtectedRoute module="inserir_dados"><DataInputPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/cobrancas" element={<AuthGuard><DashboardLayout><ProtectedRoute module="cobrancas"><CobrancasPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/expenses" element={<AuthGuard><DashboardLayout><ProtectedRoute module="despesas"><ExpensesPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/revenue" element={<AuthGuard><DashboardLayout><ProtectedRoute module="receitas"><RevenuePage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/fiscal" element={<AuthGuard><DashboardLayout><ProtectedRoute module="fiscal"><FiscalPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/comissoes" element={<AuthGuard><DashboardLayout><ProtectedRoute module="comissoes"><ComissoesPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/customers" element={<AuthGuard><DashboardLayout><ProtectedRoute module="clientes"><CustomersPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/products" element={<AuthGuard><DashboardLayout><ProtectedRoute module="produtos"><ProductsPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/intelligence" element={<AuthGuard><DashboardLayout><ProtectedRoute module="intelligence"><IntelligencePage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/settings" element={<AuthGuard><DashboardLayout><ProtectedRoute module="configuracoes"><SettingsPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/usuarios" element={<AuthGuard><DashboardLayout><ProtectedRoute module="usuarios"><UsersPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/reports" element={<AuthGuard><DashboardLayout><ProtectedRoute module="relatorios"><ReportsPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/perfil" element={<AuthGuard><DashboardLayout><ProfilePage /></DashboardLayout></AuthGuard>} />
    <Route path="/mensageria" element={<AuthGuard><DashboardLayout><ProtectedRoute module="mensageria"><MensageriaPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/integracoes" element={<AuthGuard><DashboardLayout><ProtectedRoute module="mensageria"><IntegracoesPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/whatsapp" element={<AuthGuard><ProtectedRoute module="mensageria"><WhatsAppPage /></ProtectedRoute></AuthGuard>} />
    <Route path="/crm" element={<AuthGuard><DashboardLayout><ProtectedRoute module="clientes"><CrmPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/conversas" element={<AuthGuard><DashboardLayout><ProtectedRoute module="mensageria"><ConversationsPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/wa-connections" element={<AuthGuard><DashboardLayout><ProtectedRoute module="mensageria"><WaConnectionsPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/assinatura" element={<AuthGuard><DashboardLayout><AssinaturaPage /></DashboardLayout></AuthGuard>} />
    <Route path="/analytics" element={<AuthGuard><DashboardLayout><ProtectedRoute module="dashboard"><AnalyticsPage /></ProtectedRoute></DashboardLayout></AuthGuard>} />
    <Route path="/manual" element={<AuthGuard><ManualPage /></AuthGuard>} />
    <Route path="/sistema/comunidade" element={<AuthGuard><ComunidadePage /></AuthGuard>} />
    <Route path="/sistema/tutoriais" element={<AuthGuard><TutoriaisPage /></AuthGuard>} />
    <Route path="/sistema/manual" element={<AuthGuard><ManualSistemaPage /></AuthGuard>} />
    <Route path="/sistema/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />
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
