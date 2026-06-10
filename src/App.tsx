import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import PractitionerCoachGuard from "@/components/PractitionerCoachGuard";
import MentorGuard from "@/components/MentorGuard";
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
import OurApproach from "./pages/marketing/OurApproach";
import Podcast from "./pages/marketing/Podcast";
import Contact from "./pages/marketing/Contact";
import Products from "./pages/marketing/Products";
import Newsletter from "./pages/marketing/Newsletter";
import NewsletterArticle from "./pages/marketing/NewsletterArticle";
import NewsletterConfirm from "./pages/marketing/NewsletterConfirm";
import NewsletterUnsubscribe from "./pages/marketing/NewsletterUnsubscribe";
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
import DevelopmentPlan from "./pages/DevelopmentPlan";
import SharedResults from "./pages/SharedResults";
import Assessment from "./pages/Assessment";
import AiChat from "./pages/AiChat";
import AiChatHistory from "./pages/AiChatHistory";
import Resources from "./pages/Resources";
import ResourceReader from "./pages/ResourceReader";
import CertPathDetail from "./pages/learning/CertPathDetail";
import CurriculumDetail from "./pages/learning/CurriculumDetail";
import ModuleDetail from "./pages/learning/ModuleDetail";
import ContentItemViewer from "./pages/learning/ContentItemViewer";
import CertificationPage from "./pages/learning/CertificationPage";
import Pricing from "./pages/Pricing";
import SettingsPage from "./pages/Settings";
import PrivacySettings from "./pages/PrivacySettings";
import NotificationsPage from "./pages/Notifications";
import NotificationSettings from "./pages/NotificationSettings";
import SharingRequests from "./pages/SharingRequests";
import PeerSharingOptIn from "./pages/PeerSharingOptIn";
import PeerAccessResponded from "./pages/PeerAccessResponded";
import BillingSettings from "./pages/BillingSettings";
import CoachClients from "./pages/coach/CoachClients";
import OrderAssessment from "./pages/coach/OrderAssessment";
import ClientResults from "./pages/coach/ClientResults";
import CoachInvoices from "./pages/coach/CoachInvoices";
import CoachProfile from "./pages/coach/CoachProfile";

import MentorPortal from "./pages/mentor/MentorPortal";
import MentorTraineeDetail from "./pages/mentor/MentorTraineeDetail";
import FeedbackTemplates from "./pages/mentor/FeedbackTemplates";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTeams from "./pages/admin/AdminTeams";
import AdminResources from "./pages/admin/AdminResources";
import Features from "./pages/company/Features";
import CompanyDashboard from "./pages/company/CompanyDashboard";
import PTPDashboard from "./pages/company/PTPDashboard";
import AirsaDashboard from "./pages/company/AirsaDashboard";
import InterventionsPage from "./pages/company/InterventionsPage";
import Members from "./pages/super-admin/Members";
import PlatformHealth from "./pages/super-admin/PlatformHealth";
import PlatformFeatures from "./pages/super-admin/PlatformFeatures";

import CompanyAccounts from "./pages/super-admin/CompanyAccounts";
import VersionManagement from "./pages/super-admin/VersionManagement";
import CompanyDetail from "./pages/super-admin/CompanyDetail";
import CoachManagement from "./pages/super-admin/CoachManagement";
import CoachReport from "./pages/super-admin/CoachReport";
import CreateOrganization from "./pages/super-admin/CreateOrganization";
import ContentAuthoring from "./pages/super-admin/ContentAuthoring";

import AssetLibrary from "./pages/super-admin/AssetLibrary";
import LessonBlocksEditor from "./pages/super-admin/LessonBlocksEditor";
import QuizQuestionsEditor from "./pages/super-admin/QuizQuestionsEditor";
import AdminResourceAuthoring from "./pages/super-admin/AdminResourceAuthoring";
import AdminNewsletter from "./pages/super-admin/AdminNewsletter";
import AdminNewsletterArticle from "./pages/super-admin/AdminNewsletterArticle";
import CompCouponsManagement from "./pages/super-admin/CompCouponsManagement";
import OperationsCustomers from "./pages/operations/OperationsCustomers";
import OperationsCustomerDetail from "./pages/operations/OperationsCustomerDetail";
import OperationsInvoices from "./pages/operations/OperationsInvoices";
import OperationsItems from "./pages/operations/OperationsItems";
import OperationsProjectDetail from "./pages/operations/OperationsProjectDetail";
import OperationsMyTime from "./pages/operations/OperationsMyTime";
import OperationsInvoiceDetail from "./pages/operations/OperationsInvoiceDetail";
import InvoiceForm from "./pages/operations/InvoiceForm";
import InvoiceFromWork from "./pages/operations/InvoiceFromWork";
import OperationsEstimates from "./pages/operations/OperationsEstimates";
import OperationsEstimateDetail from "./pages/operations/OperationsEstimateDetail";
import EstimateForm from "./pages/operations/EstimateForm";
import OperationsRetainers from "./pages/operations/OperationsRetainers";
import OperationsRetainerDetail from "./pages/operations/OperationsRetainerDetail";
import RetainerForm from "./pages/operations/RetainerForm";
import OperationsCreditNotes from "./pages/operations/OperationsCreditNotes";
import OperationsCreditNoteDetail from "./pages/operations/OperationsCreditNoteDetail";
import CreditNoteForm from "./pages/operations/CreditNoteForm";
import OperationsRecurringExpenses from "./pages/operations/OperationsRecurringExpenses";
import OperationsRecurringInvoices from "./pages/operations/OperationsRecurringInvoices";
import OperationsRecurringInvoiceDetail from "./pages/operations/OperationsRecurringInvoiceDetail";
import RecurringInvoiceForm from "./pages/operations/RecurringInvoiceForm";
import OperationsReports from "./pages/operations/OperationsReports";
import OperationsDashboard from "./pages/operations/OperationsDashboard";
import OperationsSettings from "./pages/operations/OperationsSettings";
import OperationsImport from "./pages/operations/OperationsImport";
import OperationsLeads from "./pages/operations/OperationsLeads";
import OperationsLeadDetail from "./pages/operations/OperationsLeadDetail";
import OperationsAccounts from "./pages/operations/OperationsAccounts";
import OperationsCampaigns from "./pages/operations/OperationsCampaigns";
import OperationsAccountDetail from "./pages/operations/OperationsAccountDetail";
import OperationsContacts from "./pages/operations/OperationsContacts";
import OperationsContactDetail from "./pages/operations/OperationsContactDetail";
import OperationsDeals from "./pages/operations/OperationsDeals";
import OperationsDealDetail from "./pages/operations/OperationsDealDetail";
import OperationsPipeline from "./pages/operations/OperationsPipeline";
import OperationsActivities from "./pages/operations/OperationsActivities";
import OperationsEmailTemplates from "./pages/operations/OperationsEmailTemplates";
import OperationsInbound from "./pages/operations/OperationsInbound";
import OperationsLeadCapture from "./pages/operations/OperationsLeadCapture";
import PublicInvoicePay from "./pages/public/PublicInvoicePay";
import PublicEstimateRespond from "./pages/public/PublicEstimateRespond";
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
            <Route path="/pay/:token" element={<PublicInvoicePay />} />
            <Route path="/estimate/:token" element={<PublicEstimateRespond />} />
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
            <Route path="/our-approach" element={<OurApproach />} />
            <Route path="/evolve" element={<Navigate to="/our-approach" replace />} />
            <Route path="/podcast" element={<Podcast />} />
            <Route path="/contact" element={<Contact />} />
            {/* Newsletter — confirm/unsubscribe MUST precede :slug to avoid being swallowed */}
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/newsletter/confirm/:token" element={<NewsletterConfirm />} />
            <Route path="/newsletter/unsubscribe/:token" element={<NewsletterUnsubscribe />} />
            <Route path="/newsletter/:slug" element={<NewsletterArticle />} />
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
              <Route path="/learning/content-item/:contentItemId" element={<ContentItemViewer />} />
              
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/privacy" element={<PrivacySettings />} />
              <Route path="/settings/notifications" element={<NotificationSettings />} />
              <Route path="/notifications" element={<NotificationsPage />} />
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
              <Route path="/coach/certification" element={<PractitionerCoachGuard><CertificationPage /></PractitionerCoachGuard>} />
              <Route path="/mentor" element={<MentorGuard><MentorPortal /></MentorGuard>} />
              <Route path="/mentor/trainee/:traineeId" element={<MentorGuard><MentorTraineeDetail /></MentorGuard>} />
              <Route path="/mentor/feedback-templates" element={<MentorGuard><FeedbackTemplates /></MentorGuard>} />

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
              <Route path="/super-admin/members" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><Members /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/members/:userId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><Members /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/users" element={<Navigate to="/super-admin/members" replace />} />
              <Route path="/super-admin/health" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><PlatformHealth /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/features" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><PlatformFeatures /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/coaches" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CoachManagement /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/coach-report/:coachUserId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CoachReport /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/companies" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CompanyAccounts /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/create-organization" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CreateOrganization /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/company/:orgId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CompanyDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/versions" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><VersionManagement /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/content-authoring" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><ContentAuthoring /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/learning-admin" element={<Navigate to="/super-admin/members" replace />} />
              <Route path="/super-admin/resources" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><AdminResourceAuthoring /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/newsletter" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><AdminNewsletter /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/newsletter/:articleId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><AdminNewsletterArticle /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/coupons" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CompCouponsManagement /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/asset-library" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><AssetLibrary /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/content-authoring/lessons/:contentItemId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><LessonBlocksEditor /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/content-authoring/quizzes/:contentItemId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><QuizQuestionsEditor /></SuperAdminSessionProvider></RoleGuard>} />

              {/* Operations (super-admin gated for now; refine later via operations.users membership) */}
              <Route path="/operations/customers" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsCustomers /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/customers/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsCustomerDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/my-time" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsMyTime /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/items" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsItems /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/invoices" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsInvoices /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/invoices/new" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><InvoiceForm /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/invoices/from-work" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><InvoiceFromWork /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/invoices/:id/edit" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><InvoiceForm /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/invoices/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsInvoiceDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/estimates" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsEstimates /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/estimates/new" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><EstimateForm /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/estimates/:id/edit" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><EstimateForm /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/estimates/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsEstimateDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/retainers" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsRetainers /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/retainers/new" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><RetainerForm /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/retainers/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsRetainerDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/credit-notes" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsCreditNotes /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/credit-notes/new" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CreditNoteForm /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/credit-notes/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsCreditNoteDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/recurring-expenses" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsRecurringExpenses /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/recurring-invoices" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsRecurringInvoices /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/recurring-invoices/new" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><RecurringInvoiceForm /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/recurring-invoices/:id/edit" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><RecurringInvoiceForm /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/recurring-invoices/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsRecurringInvoiceDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/projects/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsProjectDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/dashboard" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsDashboard /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/reports" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsReports /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/settings" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsSettings /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/import" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsImport /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/leads" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsLeads /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/leads/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsLeadDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/lead-capture" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsLeadCapture /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/accounts" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsAccounts /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/accounts/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsAccountDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/campaigns" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsCampaigns /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/contacts" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsContacts /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/contacts/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsContactDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/deals" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsDeals /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/deals/:id" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsDealDetail /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/pipeline" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsPipeline /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/activities" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsActivities /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/email-templates" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsEmailTemplates /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/operations/inbound" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><OperationsInbound /></SuperAdminSessionProvider></RoleGuard>} />
            </Route>

            {/* Legacy redirects */}
            <Route path="/coach-portal" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
            <Route path="/super-admin" element={<Navigate to="/super-admin/members" replace />} />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </ImpersonationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
