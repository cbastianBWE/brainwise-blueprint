import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
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
import OperationsGuard from "@/components/OperationsGuard";
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
import ForPractitioners from "./pages/marketing/ForPractitioners";
import ForIndividuals from "./pages/marketing/ForIndividuals";
import ForEnterprise from "./pages/marketing/ForEnterprise";
import Certification from "./pages/marketing/Certification";
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
import TeamReport from "./pages/TeamReport";
import PairedReport from "./pages/PairedReport";
import TeamPairedReports from "./pages/TeamPairedReports";
import TeamReportsSharedWithMe from "./pages/TeamReportsSharedWithMe";
import PairedReportsSharedWithMe from "./pages/PairedReportsSharedWithMe";
import DevelopmentPlan from "./pages/DevelopmentPlan";
import SharedResults from "./pages/SharedResults";
import SharedWithMe from "@/pages/SharedWithMe";
import Assessment from "./pages/Assessment";
import AiChat from "./pages/AiChat";
import AiChatHistory from "./pages/AiChatHistory";
import Resources from "./pages/Resources";
import MyLearning from "./pages/MyLearning";
import CoachingActivities from "./pages/coaching/CoachingActivities";
import CoachingActivityRunner from "./pages/coaching/CoachingActivityRunner";
import CoachingSessionView from "./pages/coaching/CoachingSessionView";
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
import OrgMembers from "./pages/coach/OrgMembers";
import CoachInvoices from "./pages/coach/CoachInvoices";
import CoachProfile from "./pages/coach/CoachProfile";

import MentorPortal from "./pages/mentor/MentorPortal";
import MentorTraineeDetail from "./pages/mentor/MentorTraineeDetail";
import FeedbackTemplates from "./pages/mentor/FeedbackTemplates";
import AdminUsers from "./pages/admin/AdminUsers";
import SharedHub from "@/pages/SharedHub";
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
import LessonBuilderList from "./pages/super-admin/LessonBuilderList";
import LearningReport from "./pages/super-admin/LearningReport";
import QuizQuestionsEditor from "./pages/super-admin/QuizQuestionsEditor";
import AdminResourceAuthoring from "./pages/super-admin/AdminResourceAuthoring";
import AdminNewsletter from "./pages/super-admin/AdminNewsletter";
import AdminNewsletterArticle from "./pages/super-admin/AdminNewsletterArticle";
import CompCouponsManagement from "./pages/super-admin/CompCouponsManagement";
import ReportCapacityRequests from "./pages/super-admin/ReportCapacityRequests";
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
import OperationsExpenses from "./pages/operations/OperationsExpenses";
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
import VerifyCertification from "./pages/VerifyCertification";
import EpnComplete from "./pages/EpnComplete";
import AirsaManagerComplete from "./pages/AirsaManagerComplete";
import VerifyConversion from "./pages/VerifyConversion";
import Departed from "./pages/Departed";
import MfaEnrollment from "./pages/MfaEnrollment";
import AccessHistory from "./pages/AccessHistory";
import Help from "./pages/Help";
import ReportPaymentConfirmed from "./pages/ReportPaymentConfirmed";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import ImpersonationProvider from "@/contexts/ImpersonationProvider";
import ImpersonationBanner from "@/components/impersonation/ImpersonationBanner";
import ImpersonationChrome from "@/components/impersonation/ImpersonationChrome";
import OrgBrandingInjector from "@/components/OrgBrandingInjector";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ImpersonationProvider>
            <OrgBrandingInjector />
            <CookieConsentBanner />
            <ImpersonationBanner />
            <ImpersonationChrome />
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/pay/:token" element={<PublicInvoicePay />} />
            <Route path="/estimate/:token" element={<PublicEstimateRespond />} />
            <Route path="/verify/cert/:certId" element={<VerifyCertification />} />
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
            <Route path="/services" element={<Navigate to="/for-enterprise" replace />} />
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
            <Route path="/for-practitioners" element={<ForPractitioners />} />
            <Route path="/for-individuals" element={<ForIndividuals />} />
            <Route path="/for-enterprise" element={<ForEnterprise />} />
            <Route path="/certification" element={<Certification />} />
            <Route path="/pricing" element={<PricingRouter />} />
            <Route path="/_dev/tile-preview" element={<TilePreview />} />

            {/* Departed route — protected, but ProtectedRoute won't redirect away from /departed */}
            <Route path="/departed" element={<ProtectedRoute><Departed /></ProtectedRoute>} />
            <Route path="/report-payment-confirmed" element={<ProtectedRoute><ReportPaymentConfirmed /></ProtectedRoute>} />
            

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
              <Route path="/assessment" element={<SubscriptionGate feature="module:ASSESSMENTS"><Assessment /></SubscriptionGate>} />
              <Route path="/epn-complete/:assignmentId" element={<SubscriptionGate feature="module:ASSESSMENTS"><EpnComplete /></SubscriptionGate>} />
              <Route path="/airsa-manager-complete/:managerAssessmentId" element={<SubscriptionGate feature="module:ASSESSMENTS"><AirsaManagerComplete /></SubscriptionGate>} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-results" element={<MyResults />} />
              <Route path="/team-report/:teamProfileId" element={<TeamReport />} />
              <Route path="/paired-report/:pairedProfileId" element={<PairedReport />} />
              <Route path="/team-paired-reports" element={<RoleGuard allowedRoles={["coach","org_admin","company_admin","brainwise_super_admin"]}><TeamPairedReports /></RoleGuard>} />
              <Route path="/shared/team-reports" element={<TeamReportsSharedWithMe />} />
              <Route path="/shared/paired-reports" element={<PairedReportsSharedWithMe />} />
              <Route path="/shared-results" element={<SharedResults />} />
              <Route path="/shared-with-me" element={<SharedWithMe />} />
              <Route path="/shared" element={<SharedHub />} />
              <Route path="/development-plan" element={<DevelopmentPlan />} />
              <Route path="/coaching" element={<CoachingActivities />} />
              <Route path="/coaching/:activityId" element={<CoachingActivityRunner />} />
              <Route path="/coaching/session/:sessionId" element={<CoachingSessionView />} />
              <Route path="/ai-chat" element={<SubscriptionGate feature="ai_chat"><AiChat /></SubscriptionGate>} />
              <Route path="/ai-chat/history" element={<SubscriptionGate feature="ai_chat"><AiChatHistory /></SubscriptionGate>} />
              <Route path="/resources" element={<SubscriptionGate feature="module:LMS"><Resources /></SubscriptionGate>} />
              <Route path="/my-learning" element={<SubscriptionGate feature="module:LMS"><MyLearning /></SubscriptionGate>} />
              <Route path="/resources/:resourceId" element={<SubscriptionGate feature="module:LMS"><ResourceReader /></SubscriptionGate>} />
              <Route path="/learning/cert-path/:certPathId" element={<SubscriptionGate feature="module:LMS"><CertPathDetail /></SubscriptionGate>} />
              <Route path="/learning/curriculum/:curriculumId" element={<SubscriptionGate feature="module:LMS"><CurriculumDetail /></SubscriptionGate>} />
              <Route path="/learning/module/:moduleId" element={<SubscriptionGate feature="module:LMS"><ModuleDetail /></SubscriptionGate>} />
              <Route path="/learning/content-item/:contentItemId" element={<SubscriptionGate feature="module:LMS"><ContentItemViewer /></SubscriptionGate>} />
              
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/privacy" element={<PrivacySettings />} />
              <Route path="/settings/notifications" element={<NotificationSettings />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings/sharing-requests" element={<SharingRequests />} />
              <Route path="/settings/billing" element={<CorpRedirect toastMessage="Your organization handles billing directly."><BillingSettings /></CorpRedirect>} />
              <Route path="/settings/access-history" element={<AccessHistory />} />
              <Route path="/help" element={<Help />} />

              {/* Coach */}
              <Route path="/coach/clients" element={<PractitionerCoachGuard><CoachClients /></PractitionerCoachGuard>} />
              <Route path="/coach/order-assessment" element={<PractitionerCoachGuard><OrderAssessment /></PractitionerCoachGuard>} />
              <Route path="/coach/client-results" element={<PractitionerCoachGuard><ClientResults /></PractitionerCoachGuard>} />
              <Route path="/coach/org-members" element={<PractitionerCoachGuard><OrgMembers /></PractitionerCoachGuard>} />
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
              <Route path="/company/nai-dashboard" element={<RoleGuard allowedRoles={["company_admin", "org_admin", "brainwise_super_admin"]}><SubscriptionGate feature="dashboard_access"><CompanyDashboard /></SubscriptionGate></RoleGuard>} />
              <Route path="/company/dashboard" element={<Navigate to="/company/nai-dashboard" replace />} />
              <Route path="/company/ptp-dashboard" element={<RoleGuard allowedRoles={["company_admin", "org_admin", "brainwise_super_admin"]}><SubscriptionGate feature="dashboard_access"><PTPDashboard /></SubscriptionGate></RoleGuard>} />
              <Route path="/company/airsa-dashboard" element={<RoleGuard allowedRoles={["company_admin", "org_admin", "brainwise_super_admin"]}><SubscriptionGate feature="dashboard_access"><AirsaDashboard /></SubscriptionGate></RoleGuard>} />
              <Route path="/dashboard/interventions" element={<RoleGuard allowedRoles={["company_admin", "org_admin"]}><SubscriptionGate feature="dashboard_access"><InterventionsPage /></SubscriptionGate></RoleGuard>} />
              <Route path="/admin/teams" element={<Navigate to="/dashboard" replace />} />
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
             <Route path="/super-admin/learning-report" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><LearningReport /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/learning-admin" element={<Navigate to="/super-admin/members" replace />} />
              <Route path="/super-admin/resources" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><AdminResourceAuthoring /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/newsletter" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><AdminNewsletter /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/newsletter/:articleId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><AdminNewsletterArticle /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/coupons" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><CompCouponsManagement /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/report-requests" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><ReportCapacityRequests /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/asset-library" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><AssetLibrary /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/content-authoring/lessons" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><LessonBuilderList /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/content-authoring/lessons/:contentItemId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><LessonBlocksEditor /></SuperAdminSessionProvider></RoleGuard>} />
              <Route path="/super-admin/content-authoring/quizzes/:contentItemId" element={<RoleGuard allowedRoles={["brainwise_super_admin"]}><SuperAdminSessionProvider><QuizQuestionsEditor /></SuperAdminSessionProvider></RoleGuard>} />

              {/* Operations - CRM module */}
              <Route element={<OperationsGuard module="CRM"><SuperAdminSessionProvider><Outlet /></SuperAdminSessionProvider></OperationsGuard>}>
                <Route path="/operations/pipeline" element={<OperationsPipeline />} />
                <Route path="/operations/dashboard" element={<OperationsDashboard />} />
                <Route path="/operations/leads" element={<OperationsLeads />} />
                <Route path="/operations/leads/:id" element={<OperationsLeadDetail />} />
                <Route path="/operations/lead-capture" element={<OperationsLeadCapture />} />
                <Route path="/operations/accounts" element={<OperationsAccounts />} />
                <Route path="/operations/accounts/:id" element={<OperationsAccountDetail />} />
                <Route path="/operations/contacts" element={<OperationsContacts />} />
                <Route path="/operations/contacts/:id" element={<OperationsContactDetail />} />
                <Route path="/operations/deals" element={<OperationsDeals />} />
                <Route path="/operations/deals/:id" element={<OperationsDealDetail />} />
                <Route path="/operations/campaigns" element={<OperationsCampaigns />} />
                <Route path="/operations/activities" element={<OperationsActivities />} />
                <Route path="/operations/email-templates" element={<OperationsEmailTemplates />} />
                <Route path="/operations/inbound" element={<OperationsInbound />} />
              </Route>

              {/* Operations - OPERATIONS module */}
              <Route element={<OperationsGuard module="OPERATIONS"><SuperAdminSessionProvider><Outlet /></SuperAdminSessionProvider></OperationsGuard>}>
                <Route path="/operations/customers" element={<OperationsCustomers />} />
                <Route path="/operations/customers/:id" element={<OperationsCustomerDetail />} />
                <Route path="/operations/my-time" element={<OperationsMyTime />} />
                <Route path="/operations/items" element={<OperationsItems />} />
                <Route path="/operations/invoices" element={<OperationsInvoices />} />
                <Route path="/operations/invoices/new" element={<InvoiceForm />} />
                <Route path="/operations/invoices/from-work" element={<InvoiceFromWork />} />
                <Route path="/operations/invoices/:id/edit" element={<InvoiceForm />} />
                <Route path="/operations/invoices/:id" element={<OperationsInvoiceDetail />} />
                <Route path="/operations/estimates" element={<OperationsEstimates />} />
                <Route path="/operations/estimates/new" element={<EstimateForm />} />
                <Route path="/operations/estimates/:id/edit" element={<EstimateForm />} />
                <Route path="/operations/estimates/:id" element={<OperationsEstimateDetail />} />
                <Route path="/operations/retainers" element={<OperationsRetainers />} />
                <Route path="/operations/retainers/new" element={<RetainerForm />} />
                <Route path="/operations/retainers/:id" element={<OperationsRetainerDetail />} />
                <Route path="/operations/credit-notes" element={<OperationsCreditNotes />} />
                <Route path="/operations/credit-notes/new" element={<CreditNoteForm />} />
                <Route path="/operations/credit-notes/:id" element={<OperationsCreditNoteDetail />} />
                <Route path="/operations/recurring-expenses" element={<OperationsRecurringExpenses />} />
                <Route path="/operations/recurring-invoices" element={<OperationsRecurringInvoices />} />
                <Route path="/operations/recurring-invoices/new" element={<RecurringInvoiceForm />} />
                <Route path="/operations/recurring-invoices/:id/edit" element={<RecurringInvoiceForm />} />
                <Route path="/operations/recurring-invoices/:id" element={<OperationsRecurringInvoiceDetail />} />
                <Route path="/operations/projects/:id" element={<OperationsProjectDetail />} />
                <Route path="/operations/expenses" element={<OperationsExpenses />} />
                <Route path="/operations/reports" element={<OperationsReports />} />
                <Route path="/operations/settings" element={<OperationsSettings />} />
                <Route path="/operations/import" element={<OperationsImport />} />
              </Route>
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
