import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import SubscriptionGate from "@/components/SubscriptionGate";
import { SuperAdminSessionProvider } from "@/hooks/useSuperAdminSession";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import DemographicConsent from "./pages/DemographicConsent";
import DemographicForm from "./pages/DemographicForm";
import Dashboard from "./pages/Dashboard";
import MyResults from "./pages/MyResults";
import Assessment from "./pages/Assessment";
import AiChat from "./pages/AiChat";
import AiChatHistory from "./pages/AiChatHistory";
import Resources from "./pages/Resources";
import Pricing from "./pages/Pricing";
import SettingsPage from "./pages/Settings";
import PrivacySettings from "./pages/PrivacySettings";
import BillingSettings from "./pages/BillingSettings";
import CoachClients from "./pages/coach/CoachClients";
import OrderAssessment from "./pages/coach/OrderAssessment";
import ClientResults from "./pages/coach/ClientResults";
import CoachInvoices from "./pages/coach/CoachInvoices";
import CoachProfile from "./pages/coach/CoachProfile";
import Certification from "./pages/coach/Certification";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminTeams from "./pages/admin/AdminTeams";
import AdminParticipation from "./pages/admin/AdminParticipation";
import AdminResources from "./pages/admin/AdminResources";
import PlatformHealth from "./pages/super-admin/PlatformHealth";
import CompanyAccounts from "./pages/super-admin/CompanyAccounts";
import VersionManagement from "./pages/super-admin/VersionManagement";
import CompanyDetail from "./pages/super-admin/CompanyDetail";
import CoachManagement from "./pages/super-admin/CoachManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            

            {/* Protected routes without sidebar */}
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/demographic-consent" element={<ProtectedRoute><DemographicConsent /></ProtectedRoute>} />
            <Route path="/demographic-form" element={<ProtectedRoute><DemographicForm /></ProtectedRoute>} />
            

            {/* Protected routes with sidebar layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {/* Individual / Corporate Employee */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/assessment" element={<Assessment />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-results" element={<MyResults />} />
              <Route path="/ai-chat" element={<SubscriptionGate><AiChat /></SubscriptionGate>} />
              <Route path="/ai-chat/history" element={<SubscriptionGate><AiChatHistory /></SubscriptionGate>} />
              <Route path="/resources" element={<SubscriptionGate><Resources /></SubscriptionGate>} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/privacy" element={<PrivacySettings />} />
              <Route path="/settings/billing" element={<BillingSettings />} />

              {/* Coach */}
              <Route path="/coach/clients" element={<RoleGuard allowedRoles={["coach"]}><CoachClients /></RoleGuard>} />
              <Route path="/coach/order-assessment" element={<RoleGuard allowedRoles={["coach"]}><OrderAssessment /></RoleGuard>} />
              <Route path="/coach/client-results" element={<RoleGuard allowedRoles={["coach"]}><ClientResults /></RoleGuard>} />
              <Route path="/coach/invoices" element={<RoleGuard allowedRoles={["coach"]}><CoachInvoices /></RoleGuard>} />
              <Route path="/coach/resources" element={<RoleGuard allowedRoles={["coach"]}><Resources /></RoleGuard>} />
              <Route path="/coach/profile" element={<RoleGuard allowedRoles={["coach"]}><CoachProfile /></RoleGuard>} />
              <Route path="/coach/certification" element={<RoleGuard allowedRoles={["coach"]}><Certification /></RoleGuard>} />

              {/* Admin */}
              <Route path="/admin/users" element={<RoleGuard allowedRoles={["admin"]}><AdminUsers /></RoleGuard>} />
              <Route path="/admin/organizations" element={<RoleGuard allowedRoles={["admin"]}><AdminOrganizations /></RoleGuard>} />
              <Route path="/admin/teams" element={<RoleGuard allowedRoles={["admin"]}><AdminTeams /></RoleGuard>} />
              <Route path="/admin/participation" element={<RoleGuard allowedRoles={["admin"]}><AdminParticipation /></RoleGuard>} />
              <Route path="/admin/resources" element={<RoleGuard allowedRoles={["admin"]}><AdminResources /></RoleGuard>} />

              {/* Super Admin */}
              <Route path="/super-admin/health" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><PlatformHealth /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/coaches" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CoachManagement /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/companies" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CompanyAccounts /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/company/:orgId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CompanyDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/versions" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><VersionManagement /></SuperAdminSessionProvider></RoleGuard>} />
            </Route>

            {/* Legacy redirects */}
            <Route path="/coach-portal" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
