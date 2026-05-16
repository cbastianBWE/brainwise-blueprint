import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import PractitionerCoachGuard from "@/components/PractitionerCoachGuard";
import SubscriptionGate from "@/components/SubscriptionGate";
import CorpRedirect from "@/components/CorpRedirect";
import { SuperAdminSessionProvider } from "@/hooks/useSuperAdminSession";
import AppLayout from "@/components/AppLayout";
import Home from "./pages/marketing/Home";
import ComingSoon from "./pages/marketing/ComingSoon";
import Privacy from "./pages/marketing/Privacy";
import Terms from "./pages/marketing/Terms";
import Cookies from "./pages/marketing/Cookies";
import InternationalCompliance from "./pages/marketing/InternationalCompliance";
import Services from "./pages/marketing/Services";
import Evolve from "./pages/marketing/Evolve";
import Contact from "./pages/marketing/Contact";
import Products from "./pages/marketing/Products";
import PricingRouter from "./pages/PricingRouter";
import TilePreview from "./pages/_dev/TilePreview";
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
import SharedResults from "./pages/SharedResults";
import Assessment from "./pages/Assessment";
import AiChat from "./pages/AiChat";
import AiChatHistory from "./pages/AiChatHistory";
import Resources from "./pages/Resources";
import ResourceReader from "./pages/ResourceReader";
import CertPathDetail from "./pages/learning/CertPathDetail";
import CurriculumDetail from "./pages/learning/CurriculumDetail";
import ModuleDetail from "./pages/learning/ModuleDetail";
import Pricing from "./pages/Pricing";
import SettingsPage from "./pages/Settings";
import PrivacySettings from "./pages/PrivacySettings";
import SharingRequests from "./pages/SharingRequests";
import PeerSharingOptIn from "./pages/PeerSharingOptIn";
import PeerAccessResponded from "./pages/PeerAccessResponded";
import BillingSettings from "./pages/BillingSettings";
import CoachClients from "./pages/coach/CoachClients";
import OrderAssessment from "./pages/coach/OrderAssessment";
import ClientResults from "./pages/coach/ClientResults";
import CoachInvoices from "./pages/coach/CoachInvoices";
import CoachProfile from "./pages/coach/CoachProfile";
import Certification from "./pages/coach/Certification";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTeams from "./pages/admin/AdminTeams";
import AdminResources from "./pages/admin/AdminResources";
import Features from "./pages/company/Features";
import CompanyDashboard from "./pages/company/CompanyDashboard";
import PTPDashboard from "./pages/company/PTPDashboard";
import AirsaDashboard from "./pages/company/AirsaDashboard";
import InterventionsPage from "./pages/company/InterventionsPage";
import PlatformHealth from "./pages/super-admin/PlatformHealth";
import SuperAdminUsers from "./pages/super-admin/Users";
import CompanyAccounts from "./pages/super-admin/CompanyAccounts";
import VersionManagement from "./pages/super-admin/VersionManagement";
import CompanyDetail from "./pages/super-admin/CompanyDetail";
import CoachManagement from "./pages/super-admin/CoachManagement";
import CreateOrganization from "./pages/super-admin/CreateOrganization";
import ContentAuthoring from "./pages/super-admin/ContentAuthoring";
import AssetLibrary from "./pages/super-admin/AssetLibrary";
import LessonBlocksEditor from "./pages/super-admin/LessonBlocksEditor";
import QuizQuestionsEditor from "./pages/super-admin/QuizQuestionsEditor";
import AdminResourceAuthoring from "./pages/super-admin/AdminResourceAuthoring";
import CompCouponsManagement from "./pages/super-admin/CompCouponsManagement";
import EpnComplete from "./pages/EpnComplete";
import AirsaManagerComplete from "./pages/AirsaManagerComplete";
import VerifyConversion from "./pages/VerifyConversion";
import Departed from "./pages/Departed";
import MfaEnrollment from "./pages/MfaEnrollment";
import AccessHistory from "./pages/AccessHistory";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import ImpersonationProvider from "@/contexts/ImpersonationProvider";
import ImpersonationBanner from "@/components/impersonation/ImpersonationBanner";
import ImpersonationChrome from "@/components/impersonation/ImpersonationChrome";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationProvider>
            <CookieConsentBanner />
            <ImpersonationBanner />
            <ImpersonationChrome />
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/coming-soon" element={<ComingSoon />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/peer-access-responded" element={<PeerAccessResponded />} />
            <Route path="/auth/verify-conversion" element={<VerifyConversion />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/international-privacy" element={<InternationalCompliance />} />
            <Route path="/services" element={<Services />} />
            <Route path="/evolve" element={<Evolve />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/products" element={<Products />} />
            <Route path="/pricing" element={<PricingRouter />} />
            <Route path="/_dev/tile-preview" element={<TilePreview />} />

            {/* Departed route — protected, but ProtectedRoute won't redirect away from /departed */}
            <Route path="/departed" element={<ProtectedRoute><Departed /></ProtectedRoute>} />
            

            {/* Protected routes without sidebar */}
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/demographic-consent" element={<ProtectedRoute><DemographicConsent /></ProtectedRoute>} />
            <Route path="/demographic-form" element={<ProtectedRoute><DemographicForm /></ProtectedRoute>} />
            <Route path="/mfa-enrollment" element={<ProtectedRoute><MfaEnrollment /></ProtectedRoute>} />
            <Route path="/peer-sharing-optin" element={<ProtectedRoute><PeerSharingOptIn /></ProtectedRoute>} />
            

            {/* Protected routes with sidebar layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {/* Individual / Corporate Employee */}
              <Route path="/settings/plan" element={<CorpRedirect toastMessage="Your organization handles billing directly."><Pricing /></CorpRedirect>} />
              <Route path="/assessment" element={<Assessment />} />
              <Route path="/epn-complete/:assignmentId" element={<EpnComplete />} />
              <Route path="/airsa-manager-complete/:managerAssessmentId" element={<AirsaManagerComplete />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-results" element={<MyResults />} />
              <Route path="/shared-results" element={<SharedResults />} />
              <Route path="/ai-chat" element={<SubscriptionGate feature="ai_chat"><AiChat /></SubscriptionGate>} />
              <Route path="/ai-chat/history" element={<SubscriptionGate feature="ai_chat"><AiChatHistory /></SubscriptionGate>} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/:resourceId" element={<ResourceReader />} />
              <Route path="/learning/cert-path/:certPathId" element={<CertPathDetail />} />
              <Route path="/learning/curriculum/:curriculumId" element={<CurriculumDetail />} />
              <Route path="/learning/module/:moduleId" element={<ModuleDetail />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/privacy" element={<PrivacySettings />} />
              <Route path="/settings/sharing-requests" element={<SharingRequests />} />
              <Route path="/settings/billing" element={<CorpRedirect toastMessage="Your organization handles billing directly."><BillingSettings /></CorpRedirect>} />
              <Route path="/settings/access-history" element={<AccessHistory />} />

              {/* Coach */}
              <Route path="/coach/clients" element={<PractitionerCoachGuard><CoachClients /></PractitionerCoachGuard>} />
              <Route path="/coach/order-assessment" element={<PractitionerCoachGuard><OrderAssessment /></PractitionerCoachGuard>} />
              <Route path="/coach/client-results" element={<PractitionerCoachGuard><ClientResults /></PractitionerCoachGuard>} />
              <Route path="/coach/invoices" element={<PractitionerCoachGuard><CoachInvoices /></PractitionerCoachGuard>} />
              <Route path="/coach/resources" element={<RoleGuard allowedRoles={["coach"]}><Resources /></RoleGuard>} />
              <Route path="/coach/profile" element={<PractitionerCoachGuard><CoachProfile /></PractitionerCoachGuard>} />
              <Route path="/coach/certification" element={<PractitionerCoachGuard><Certification /></PractitionerCoachGuard>} />

              {/* Admin */}
              <Route path="/admin/users" element={<RoleGuard allowedRoles={["company_admin", "org_admin"]}><AdminUsers /></RoleGuard>} />
              <Route path="/company/features" element={<RoleGuard allowedRoles={["company_admin", "org_admin"]}><Features /></RoleGuard>} />
              <Route path="/company/nai-dashboard" element={<RoleGuard allowedRoles={["company_admin", "org_admin", "brainwise_super_admin"]}><CompanyDashboard /></RoleGuard>} />
              <Route path="/company/dashboard" element={<Navigate to="/company/nai-dashboard" replace />} />
              <Route path="/company/ptp-dashboard" element={<RoleGuard allowedRoles={["company_admin", "org_admin", "brainwise_super_admin"]}><PTPDashboard /></RoleGuard>} />
              <Route path="/company/airsa-dashboard" element={<RoleGuard allowedRoles={["company_admin", "org_admin", "brainwise_super_admin"]}><AirsaDashboard /></RoleGuard>} />
              <Route path="/dashboard/interventions" element={<RoleGuard allowedRoles={["company_admin", "org_admin"]}><InterventionsPage /></RoleGuard>} />
              <Route path="/admin/teams" element={<RoleGuard allowedRoles={["company_admin", "org_admin"]}><AdminTeams /></RoleGuard>} />
              <Route path="/admin/resources" element={<RoleGuard allowedRoles={["company_admin", "org_admin"]}><AdminResources /></RoleGuard>} />

              {/* Super Admin */}
              <Route path="/super-admin/users" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><SuperAdminUsers /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/health" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><PlatformHealth /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/coaches" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CoachManagement /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/companies" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CompanyAccounts /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/create-organization" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CreateOrganization /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/company/:orgId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CompanyDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/versions" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><VersionManagement /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/content-authoring" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><ContentAuthoring /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/resources" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><AdminResourceAuthoring /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/coupons" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CompCouponsManagement /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/asset-library" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><AssetLibrary /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/content-authoring/lessons/:contentItemId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><LessonBlocksEditor /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/content-authoring/quizzes/:contentItemId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><QuizQuestionsEditor /></SuperAdminSessionProvider></RoleGuard>} />
            </Route>

            {/* Legacy redirects */}
            <Route path="/coach-portal" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/super-admin" element={<Navigate to="/super-admin/users" replace />} />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
