import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { MobileTabBar } from "@/components/MobileTabBar";
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
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
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
import IASkillsPage from "./pages/IASkillsPage";
import IAAuditorPage from "./pages/IAAuditorPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import CopilotPage from "./pages/CopilotPage";

import ConversationsPage from "./pages/ConversationsPage";
import SupportPage from "./pages/SupportPage";
import WaConnectionsPage from "./pages/WaConnectionsPage";
import AssinaturaPage from "./pages/AssinaturaPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotFound from "./pages/NotFound";
import ManualPage from "./pages/ManualPage";
import ComunidadePage from "./pages/sistema/ComunidadePage";
import TutoriaisPage from "./pages/sistema/TutoriaisPage";
import ManualSistemaPage from "./pages/sistema/ManualSistemaPage";
import OnboardingPage from "./pages/sistema/OnboardingPage";
import { TourProvider } from "@/contexts/TourContext";
import { TourOverlay } from "@/components/tour/TourOverlay";

// SuperAdmin
import SuperAdminLayout from "./pages/superadmin/SuperAdminLayout";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import SuperAdminTenants from "./pages/superadmin/SuperAdminTenants";
import SuperAdminLicenses from "./pages/superadmin/SuperAdminLicenses";
import SuperAdminAuditLog from "./pages/superadmin/SuperAdminAuditLog";
import SuperAdminConfig from "./pages/superadmin/SuperAdminConfig";

// God Admin
import GodAdminLayout from "./pages/god-admin/GodAdminLayout";
import GodAdminDashboard from "./pages/god-admin/GodAdminDashboard";
import GodAdminWhitelabels from "./pages/god-admin/GodAdminWhitelabels";
import GodAdminDirectClients from "./pages/god-admin/GodAdminDirectClients";
import GodAdminLicenses from "./pages/god-admin/GodAdminLicenses";
import GodAdminEnvironments from "./pages/god-admin/GodAdminEnvironments";
import GodAdminAuditLog from "./pages/god-admin/GodAdminAuditLog";
import GodAdminFeatureFlags from "./pages/god-admin/GodAdminFeatureFlags";
import GodAdminConfig from "./pages/god-admin/GodAdminConfig";

// Nexus
import { NexusProvider } from "./contexts/NexusContext";
import NexusLogin from "./pages/nexus/NexusLogin";
import NexusLayout from "./pages/nexus/NexusLayout";
import NexusDashboard from "./pages/nexus/NexusDashboard";
import NexusLicenses from "./pages/nexus/NexusLicenses";
import NexusLicenseDetail from "./pages/nexus/NexusLicenseDetail";
import NexusFinanceiro from "./pages/nexus/NexusFinanceiro";
import NexusEquipe from "./pages/nexus/NexusEquipe";
import NexusAuditLog from "./pages/nexus/NexusAuditLog";
import NexusFeatureFlags from "./pages/nexus/NexusFeatureFlags";
import NexusTickets from "./pages/nexus/NexusTickets";
import NexusConfiguracoes from "./pages/nexus/NexusConfiguracoes";
import NexusIntegracoes from "./pages/nexus/NexusIntegracoes";
import NexusAIConfig from "./pages/nexus/NexusAIConfig";
import NexusCheckouts from "./pages/nexus/NexusCheckouts";
import NexusWhitelabels from "./pages/nexus/NexusWhitelabels";
import NexusLifecycle from "./pages/nexus/NexusLifecycle";
// WhiteLabel Phase 3 Portal
import WLLayout from "./pages/wl/WLLayout";
import WLDashboard from "./pages/wl/WLDashboard";
import WLClients from "./pages/wl/WLClients";
import WLClientDetail from "./pages/wl/WLClientDetail";
import WLLicenses from "./pages/wl/WLLicenses";
import WLBranding from "./pages/wl/WLBranding";
import WLAudit from "./pages/wl/WLAudit";
import WLConfig from "./pages/wl/WLConfig";

// Checkout & Activation (public)
import CheckoutPage from "./pages/CheckoutPage";
import AguardandoAtivacaoPage from "./pages/AguardandoAtivacaoPage";
import ActivationPage from "./pages/ActivationPage";

// Legal (public)
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";

// IAZIS — Payment Orchestration (tier-based dashboard)
import { IazisModule } from '@/modules/iazis'
import { IazisPublicCheckout } from '@/modules/iazis/components/checkout'

import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";

export const queryClient = new QueryClient();

/** Legacy /wl/:slug → /partners/:slug redirect */
function WLRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const rest = window.location.pathname.replace(`/wl/${slug}`, '');
  return <Navigate to={`/partners/${slug}${rest}`} replace />;
}

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

    {/* Checkout, Ativação — totalmente públicos */}
    <Route path="/checkout" element={<CheckoutPage />} />
    <Route path="/aguardando-ativacao" element={<AguardandoAtivacaoPage />} />
    <Route path="/ativar/:token" element={<ActivationPage />} />

    {/* IAZIS — Public checkout page (no auth required) */}
    <Route path="/pay/:slug" element={<IazisPublicCheckout />} />

    {/* Legal — Public pages (required by Google OAuth) */}
    <Route path="/privacidade" element={<PrivacyPolicyPage />} />
    <Route path="/termos" element={<TermsOfServicePage />} />

    {/* ═══ Admin Core (formerly Nexus) ═══ */}
    <Route path="/admin-core/login" element={<NexusLogin />} />
    <Route path="/admin-core" element={<AuthGuard><NexusProvider><NexusLayout /></NexusProvider></AuthGuard>}>
      <Route index element={<NexusDashboard />} />
      <Route path="licencas" element={<NexusLicenses />} />
      <Route path="licencas/:id" element={<NexusLicenseDetail />} />
      <Route path="partners" element={<NexusWhitelabels />} />
      <Route path="lifecycle" element={<NexusLifecycle />} />
      <Route path="checkouts" element={<NexusCheckouts />} />
      <Route path="financeiro" element={<NexusFinanceiro />} />
      <Route path="equipe" element={<NexusEquipe />} />
      <Route path="auditoria" element={<NexusAuditLog />} />
      <Route path="flags" element={<NexusFeatureFlags />} />
      <Route path="tickets" element={<NexusTickets />} />
      <Route path="configuracoes" element={<NexusConfiguracoes />} />
      <Route path="configuracoes/integracoes" element={<NexusIntegracoes />} />
      <Route path="ia" element={<NexusAIConfig />} />
    </Route>
    {/* Legacy /nexus → /admin-core redirects */}
    <Route path="/nexus/login" element={<Navigate to="/admin-core/login" replace />} />
    <Route path="/nexus/*" element={<Navigate to="/admin-core" replace />} />
    <Route path="/nexus" element={<Navigate to="/admin-core" replace />} />

    {/* ═══ Pzaafi Partners (formerly WhiteLabel) ═══ */}
    <Route path="/partners/:slug" element={<AuthGuard><WLLayout /></AuthGuard>}>
      <Route index element={<WLDashboard />} />
      <Route path="clientes" element={<WLClients />} />
      <Route path="clientes/:clientId" element={<WLClientDetail />} />
      <Route path="licencas" element={<WLLicenses />} />
      <Route path="branding" element={<WLBranding />} />
      <Route path="suporte" element={<WLAudit />} />
      <Route path="config" element={<WLConfig />} />
    </Route>
    {/* Legacy /wl → /partners redirects */}
    <Route path="/wl/:slug/*" element={<WLRedirect />} />
    <Route path="/wl/:slug" element={<WLRedirect />} />

    {/* SuperAdmin Portal */}
    <Route path="/superadmin" element={<AuthGuard><SuperAdminLayout /></AuthGuard>}>
      <Route index element={<SuperAdminDashboard />} />
      <Route path="tenants" element={<SuperAdminTenants />} />
      <Route path="licencas" element={<SuperAdminLicenses />} />
      <Route path="audit" element={<SuperAdminAuditLog />} />
      <Route path="config" element={<SuperAdminConfig />} />
    </Route>

    {/* God Admin Portal */}
    <Route path="/god-admin" element={<AuthGuard><GodAdminLayout /></AuthGuard>}>
      <Route index element={<GodAdminDashboard />} />
      <Route path="whitelabels" element={<GodAdminWhitelabels />} />
      <Route path="direct-clients" element={<GodAdminDirectClients />} />
      <Route path="licencas" element={<GodAdminLicenses />} />
      <Route path="ambientes" element={<GodAdminEnvironments />} />
      <Route path="audit" element={<GodAdminAuditLog />} />
      <Route path="flags" element={<GodAdminFeatureFlags />} />
      <Route path="config" element={<GodAdminConfig />} />
    </Route>

    {/* Protected — each route wrapped with module permission */}
    <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
    
    {/* Phase 4: Client Portal */}
    <Route path="/app/:slug" element={<AuthGuard><RouteErrorBoundary section="App"><DashboardLayout /></RouteErrorBoundary></AuthGuard>}>
      <Route index element={<ProtectedRoute module="dashboard"><Index /></ProtectedRoute>} />
      <Route path="home" element={<ProtectedRoute module="dashboard"><HomePage /></ProtectedRoute>} />
      <Route path="dashboard" element={<ProtectedRoute module="dashboard"><Index /></ProtectedRoute>} />
      <Route path="vendas" element={<ProtectedRoute module="vendas"><RouteErrorBoundary section="Vendas"><VendasPage /></RouteErrorBoundary></ProtectedRoute>} />
      <Route path="input" element={<ProtectedRoute module="inserir_dados"><DataInputPage /></ProtectedRoute>} />
      <Route path="cobrancas" element={<ProtectedRoute module="cobrancas"><CobrancasPage /></ProtectedRoute>} />
      <Route path="expenses" element={<ProtectedRoute module="despesas"><ExpensesPage /></ProtectedRoute>} />
      <Route path="revenue" element={<ProtectedRoute module="receitas"><RevenuePage /></ProtectedRoute>} />
      <Route path="fiscal" element={<ProtectedRoute module="fiscal"><FiscalPage /></ProtectedRoute>} />
      <Route path="comissoes" element={<ProtectedRoute module="comissoes"><ComissoesPage /></ProtectedRoute>} />
      <Route path="customers" element={<ProtectedRoute module="clientes"><CustomersPage /></ProtectedRoute>} />
      <Route path="atividades" element={<ProtectedRoute module="clientes"><ActivitiesPage /></ProtectedRoute>} />
      <Route path="products" element={<ProtectedRoute module="produtos"><ProductsPage /></ProtectedRoute>} />
      <Route path="intelligence" element={<ProtectedRoute module="intelligence"><IntelligencePage /></ProtectedRoute>} />
      <Route path="settings" element={<ProtectedRoute module="configuracoes"><SettingsPage /></ProtectedRoute>} />
      <Route path="usuarios" element={<ProtectedRoute module="usuarios"><UsersPage /></ProtectedRoute>} />
      <Route path="reports" element={<ProtectedRoute module="relatorios"><ReportsPage /></ProtectedRoute>} />
      <Route path="perfil" element={<ProfilePage />} />
      <Route path="mensageria" element={<ProtectedRoute module="mensageria"><RouteErrorBoundary section="Mensageria"><MensageriaPage /></RouteErrorBoundary></ProtectedRoute>} />
      <Route path="integracoes" element={<ProtectedRoute module="mensageria"><RouteErrorBoundary section="Integracoes"><IntegracoesPage /></RouteErrorBoundary></ProtectedRoute>} />
      <Route path="ia" element={<Navigate to="../intelligence" replace />} />
      <Route path="ia/auditor" element={<Navigate to="../intelligence" replace />} />
      <Route path="copilot" element={<ProtectedRoute module="intelligence"><CopilotPage /></ProtectedRoute>} />
      <Route path="conversas" element={<Navigate to="../suporte" replace />} />
      <Route path="suporte" element={<ProtectedRoute module="mensageria"><SupportPage /></ProtectedRoute>} />
      <Route path="assinatura" element={<AssinaturaPage />} />
      <Route path="analytics" element={<ProtectedRoute module="dashboard"><AnalyticsPage /></ProtectedRoute>} />
      <Route path="wa-connections" element={<Navigate to="integracoes" replace />} />
      <Route path="sistema/comunidade" element={<ComunidadePage />} />
      <Route path="sistema/tutoriais" element={<TutoriaisPage />} />
      <Route path="sistema/manual" element={<ManualSistemaPage />} />
      <Route path="sistema/onboarding" element={<OnboardingPage />} />
      <Route path="iazis" element={<IazisModule />} />
    </Route>

    <Route path="/whatsapp" element={<AuthGuard><ProtectedRoute module="mensageria"><WhatsAppPage /></ProtectedRoute></AuthGuard>} />
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
    <ErrorBoundary>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SidebarPrefsProvider>
          <TourProvider>
          <FinancialProvider>
            <CustomerProvider>
              <ProductProvider>
                <CostLinesProvider>
                <IntelligenceProvider>
                <AsaasProvider>
                  <TourOverlay />
                  <AppRoutes />
                  <MobileTabBar />
                  <PWAInstallPrompt />
                </AsaasProvider>
                </IntelligenceProvider>
                </CostLinesProvider>
              </ProductProvider>
            </CustomerProvider>
          </FinancialProvider>
          </TourProvider>
          </SidebarPrefsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
