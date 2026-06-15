import { Fragment } from "react";
import {
  LayoutDashboard, BarChart3, ClipboardList, ClipboardCheck, MessageSquare, BookOpen, Settings,
  Users, Users2, Building2, UsersRound, Activity, Heart, Award, UserCircle,
  ShieldCheck, Briefcase, GitBranch, FlaskConical, LogOut, History, Shield,
  CreditCard, Receipt, ChevronDown, ChevronRight, FileText, Library, Ticket,
  GraduationCap, Bell, Newspaper, SlidersHorizontal, Wallet, FileMinus2, Repeat, Clock, UserPlus, Mail, Inbox, Webhook, Megaphone, Target, Blocks,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAccountRole } from "@/lib/accountRoles";
import { useOrgInstrumentAccess, DASHBOARD_INSTRUMENT_UUIDS } from "@/hooks/useOrgInstrumentAccess";
import { useOpsMembership } from "@/hooks/useOpsMembership";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: string;
  sectionHeader?: string;
}

const individualNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Results", url: "/my-results", icon: BarChart3 },
  { title: "My Development Plan", url: "/development-plan", icon: Target },
  { title: "Shared With Me", url: "/shared-with-me", icon: Inbox },
  { title: "Assessment", url: "/assessment", icon: ClipboardList },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "My Learning", url: "/my-learning", icon: GraduationCap },
  { title: "Resources", url: "/resources", icon: BookOpen },
];

const corporateNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Results", url: "/my-results", icon: BarChart3 },
  { title: "My Development Plan", url: "/development-plan", icon: Target },
  { title: "Shared", url: "/shared", icon: Inbox },
  { title: "Assessment", url: "/assessment", icon: ClipboardList },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "My Learning", url: "/my-learning", icon: GraduationCap },
  { title: "Resources", url: "/resources", icon: BookOpen },
];

const coachNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Assessments", url: "/assessment", icon: ClipboardList },
  { title: "My Results", url: "/my-results", icon: BarChart3 },
  { title: "My Development Plan", url: "/development-plan", icon: Target },
  { title: "Shared With Me", url: "/shared-with-me", icon: Inbox },
  { title: "My Clients", url: "/coach/clients", icon: Users },
  
  { title: "Orders & Invoices", url: "/coach/invoices", icon: Receipt },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "My Learning", url: "/my-learning", icon: GraduationCap },
  { title: "Resources", url: "/coach/resources", icon: BookOpen },
  { title: "Certification", url: "/coach/certification", icon: Award },
  { title: "My Profile", url: "/coach/profile", icon: UserCircle, disabled: true, badge: "Coming Soon" },
];

const adminNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Results", url: "/my-results", icon: BarChart3 },
  { title: "My Development Plan", url: "/development-plan", icon: Target },
  { title: "Shared", url: "/shared", icon: Inbox },
  { title: "Assessment", url: "/assessment", icon: ClipboardList },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Features", url: "/company/features", icon: ShieldCheck },
  
  { title: "My Learning", url: "/my-learning", icon: GraduationCap },
  { title: "Resources", url: "/admin/resources", icon: BookOpen },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
];

const superAdminNav: NavItem[] = [
  { title: "Assessment", url: "/assessment", icon: ClipboardList },
  { title: "My Results", url: "/my-results", icon: FileText },
  { title: "My Development Plan", url: "/development-plan", icon: Target },
  { title: "Shared With Me", url: "/shared-with-me", icon: Inbox },
  { title: "Members", url: "/super-admin/members", icon: Users },
  { title: "Global Features & Settings", url: "/super-admin/features", icon: SlidersHorizontal },
  
  { title: "Platform Health", url: "/super-admin/health", icon: Heart },
  { title: "Coach Invitations", url: "/super-admin/coaches", icon: Users },
  { title: "Organizations", url: "/super-admin/companies", icon: Briefcase },
  { title: "Version Management", url: "/super-admin/versions", icon: GitBranch },
  { title: "Content Authoring", url: "/super-admin/content-authoring", icon: Library },
  { title: "Learning Report", url: "/super-admin/learning-report", icon: ClipboardList },
  { title: "Newsletter", url: "/super-admin/newsletter", icon: Newspaper },
  
  { title: "My Learning", url: "/my-learning", icon: GraduationCap },
  { title: "Resources", url: "/resources", icon: BookOpen },
  { title: "Resource Authoring", url: "/super-admin/resources", icon: Library },
  { title: "Comp Coupons", url: "/super-admin/coupons", icon: Ticket },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "AI Research", url: "/super-admin/ai-research", icon: FlaskConical, disabled: true, badge: "Phase 2" },
];

const crmNav: NavItem[] = [
  { title: "Pipeline", url: "/operations/pipeline", icon: GitBranch, sectionHeader: "CRM" },
  { title: "Dashboard", url: "/operations/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/operations/leads", icon: UserPlus },
  { title: "Lead Capture", url: "/operations/lead-capture", icon: Webhook },
  { title: "Accounts", url: "/operations/accounts", icon: Building2 },
  { title: "Contacts", url: "/operations/contacts", icon: UsersRound },
  { title: "Deals", url: "/operations/deals", icon: Briefcase },
  { title: "Campaigns", url: "/operations/campaigns", icon: Megaphone },
  { title: "Activity", url: "/operations/activities", icon: Activity },
  { title: "Email Templates", url: "/operations/email-templates", icon: Mail },
  { title: "Inbound", url: "/operations/inbound", icon: Inbox },
];

const operationsNav: NavItem[] = [
  { title: "Customers", url: "/operations/customers", icon: Users2, sectionHeader: "Operations" },
  { title: "My Time", url: "/operations/my-time", icon: Clock },
  { title: "Items", url: "/operations/items", icon: Library },
  { title: "Invoices", url: "/operations/invoices", icon: Receipt },
  { title: "Estimates", url: "/operations/estimates", icon: FileText },
  { title: "Retainers", url: "/operations/retainers", icon: Wallet },
  { title: "Credit notes", url: "/operations/credit-notes", icon: FileMinus2 },
  { title: "Recurring expenses", url: "/operations/recurring-expenses", icon: Repeat },
  { title: "Recurring invoices", url: "/operations/recurring-invoices", icon: Repeat },
  { title: "Reports", url: "/operations/reports", icon: BarChart3 },
  { title: "Settings", url: "/operations/settings", icon: Settings },
];

function getNavItems(profile: { account_type?: string | null; is_practitioner_coach?: boolean } | null | undefined): NavItem[] {
  const accountType = profile?.account_type;
  switch (accountType) {
    case "coach":
      return coachNav;
    case "company_admin":
    case "org_admin":
      return adminNav;
    case "brainwise_super_admin": {
      if (profile?.is_practitioner_coach === true) {
        // Drop /coach/resources from appended coach nav since super admin
        // already has its own Resources entry above.
        const superUrls = new Set(superAdminNav.map((i) => i.url));
        const filtered = coachNav.filter((i) => i.url !== "/coach/resources" && !superUrls.has(i.url));
        const coachToolsWithHeader = filtered.map((item, idx) =>
          idx === 0 ? { ...item, sectionHeader: "Coach Tools" } : item
        );
        return [...superAdminNav, ...coachToolsWithHeader];
      }
      return superAdminNav;
    }
    case "corporate_employee":
      return corporateNav;
    case "individual":
    default:
      return individualNav;
  }
}

function formatAccountType(type: string | null | undefined): string {
  switch (type) {
    case "individual": return "Individual";
    case "corporate_employee": return "Corporate";
    case "coach": return "Coach";
    case "company_admin": return "Company Admin";
    case "org_admin": return "Org Admin";
    case "brainwise_super_admin": return "Super Admin";
    default: return "User";
  }
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { profile } = useUserProfile();
  const { isCorp, isMentor, isSuperAdmin } = useAccountRole();

  const { membership: opsMembership } = useOpsMembership();
  const [opsModuleAccess, setOpsModuleAccess] = useState<{ crm: boolean; ops: boolean }>({ crm: false, ops: false });

  useEffect(() => {
    if (!user || !opsMembership) {
      setOpsModuleAccess({ crm: false, ops: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: crm }, { data: ops }] = await Promise.all([
        supabase.rpc("user_has_feature", { p_user: user.id, p_feature: "module:CRM" }),
        supabase.rpc("user_has_feature", { p_user: user.id, p_feature: "module:OPERATIONS" }),
      ]);
      if (cancelled) return;
      setOpsModuleAccess({ crm: !!crm, ops: !!ops });
    })();
    return () => { cancelled = true; };
  }, [user, opsMembership]);

  const [hasDashboardAccess, setHasDashboardAccess] = useState(false);
  useEffect(() => {
    if (!user) { setHasDashboardAccess(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("user_has_feature", { p_user: user.id, p_feature: "dashboard_access" });
      if (!cancelled) setHasDashboardAccess(!!data);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const baseNavItems = getNavItems(profile);
  const navItems = (() => {
    let items = baseNavItems;
    if (isMentor || isSuperAdmin) {
      const clientsIdx = items.findIndex((i) => i.url === "/coach/clients");
      if (clientsIdx !== -1) {
        const mentorItems: NavItem[] = [
          { title: "Mentor Portal", url: "/mentor", icon: GraduationCap },
          { title: "Feedback Templates", url: "/mentor/feedback-templates", icon: MessageSquare },
        ];
        const copy = [...items];
        copy.splice(clientsIdx + 1, 0, ...mentorItems);
        items = copy;
      }
    }
    if (opsMembership) {
      if (opsModuleAccess.crm) items = [...items, ...crmNav];
      if (opsModuleAccess.ops) items = [...items, ...operationsNav];
    }
    return items;
  })();
  const isSettingsOpen = location.pathname.startsWith('/settings');
  const isClientsOpen = location.pathname.startsWith('/coach/clients') || location.pathname.startsWith('/coach/client-results');
  const isDashboardsOpen = location.pathname.startsWith('/company/nai-dashboard')
    || location.pathname.startsWith('/company/ptp-dashboard')
    || location.pathname.startsWith('/company/airsa-dashboard');
  const showDashboardsMenu = profile?.account_type === 'company_admin' || profile?.account_type === 'org_admin' || profile?.account_type === 'brainwise_super_admin';
  const { orgInstrumentIncluded } = useOrgInstrumentAccess();
  const showNaiDashboard = orgInstrumentIncluded(DASHBOARD_INSTRUMENT_UUIDS.NAI);
  const showPtpDashboard = orgInstrumentIncluded(DASHBOARD_INSTRUMENT_UUIDS.PTP);
  const showAirsaDashboard = orgInstrumentIncluded(DASHBOARD_INSTRUMENT_UUIDS.AIRSA);
  const hasAnyDashboard = showNaiDashboard || showPtpDashboard || showAirsaDashboard;
  const settingsSubItems: { title: string; url: string; icon: React.ElementType; disabled?: boolean; badge?: string }[] = [
    { title: 'General Settings', url: '/settings', icon: Settings },
    { title: 'Notifications', url: '/settings/notifications', icon: Bell },
    { title: 'Privacy & Permissions', url: '/settings/privacy', icon: Shield },
    { title: 'Access History', url: '/settings/access-history', icon: History },
    ...(isCorp ? [] : [{ title: 'Billing & Receipts', url: '/settings/billing', icon: CreditCard }]),
  ];

  const coachSettingsSubItems: typeof settingsSubItems = [
    { title: 'General Settings', url: '/settings', icon: Settings },
    { title: 'Notifications', url: '/settings/notifications', icon: Bell },
    { title: 'Privacy & Permissions', url: '/settings/privacy', icon: Shield },
    { title: 'Access History', url: '/settings/access-history', icon: History },
    { title: 'Billing & Receipts', url: '/settings/billing', icon: CreditCard, disabled: true, badge: 'Coming Soon' },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        {!collapsed && (
          <div className="space-y-0.5 overflow-hidden">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              {profile?.full_name || profile?.email || "User"}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {formatAccountType(profile?.account_type)}
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const sectionHeaderEl = item.sectionHeader ? (
                  <div
                    key={`hdr-${item.sectionHeader}`}
                    className={collapsed ? "sr-only" : "px-2 pt-3 pb-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50 font-semibold"}
                  >
                    {item.sectionHeader}
                  </div>
                ) : null;
                if (item.title === "My Clients") {
                  return (
                    <Fragment key={`f-${item.title}${item.url}`}>
                      {sectionHeaderEl}
                      <SidebarMenuItem key="my-clients">
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/coach/clients"
                            className="hover:bg-sidebar-accent"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          >
                            <Users className="h-4 w-4 shrink-0" />
                            {!collapsed && (
                              <div className="flex items-center justify-between flex-1">
                                <span>My Clients</span>
                                {isClientsOpen
                                  ? <ChevronDown className="h-3 w-3" />
                                  : <ChevronRight className="h-3 w-3" />
                                }
                              </div>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                        {isClientsOpen && !collapsed && (
                          <div className="ml-4 mt-1 space-y-1">
                            <SidebarMenuItem key="/coach/client-results">
                              <SidebarMenuButton asChild>
                                <NavLink
                                  to="/coach/client-results"
                                  end
                                  className="hover:bg-sidebar-accent text-sm"
                                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                >
                                  <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                                  <span>Client Results</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </div>
                        )}
                      </SidebarMenuItem>
                    </Fragment>
                  );
                }
                if (item.title === "Content Authoring") {
                  return (
                    <Fragment key={`f-${item.title}${item.url}`}>
                      {sectionHeaderEl}
                      <SidebarMenuItem key={item.title + item.url}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end
                            className="hover:bg-sidebar-accent"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {!collapsed && (
                        <div className="ml-4 mt-1 space-y-1">
                          <SidebarMenuItem key="/super-admin/content-authoring/lessons">
                            <SidebarMenuButton asChild>
                              <NavLink
                                to="/super-admin/content-authoring/lessons"
                                end
                                className="hover:bg-sidebar-accent text-sm"
                                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              >
                                <Blocks className="h-3.5 w-3.5 shrink-0" />
                                <span>Lesson Builder</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </div>
                      )}
                    </Fragment>
                  );
                }
                return (
                  <Fragment key={`f-${item.title}${item.url}`}>
                    {sectionHeaderEl}
                  <SidebarMenuItem key={item.title + item.url}>
                    <SidebarMenuButton asChild disabled={item.disabled}>
                      {item.disabled ? (
                        <span className="flex items-center gap-2 opacity-50 cursor-not-allowed px-2 py-1.5">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && (
                            <>
                              <span>{item.title}</span>
                              {item.badge && (
                                <span className="ml-auto text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      ) : (
                        <NavLink
                          to={item.url}
                          end
                          className="hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  </Fragment>
                );
              })}
              {showDashboardsMenu && hasAnyDashboard && hasDashboardAccess && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/company/nai-dashboard"
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1">
                          <span>Dashboards</span>
                          {isDashboardsOpen
                            ? <ChevronDown className="h-3 w-3" />
                            : <ChevronRight className="h-3 w-3" />
                          }
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                  {isDashboardsOpen && !collapsed && (
                    <div className="ml-4 mt-1 space-y-1">
                      {showNaiDashboard && (
                      <SidebarMenuItem key="/company/nai-dashboard">
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/company/nai-dashboard"
                            end
                            className="hover:bg-sidebar-accent text-sm"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          >
                            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                            <span>NAI Dashboard</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      )}
                      {showPtpDashboard && (
                      <SidebarMenuItem key="/company/ptp-dashboard">
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/company/ptp-dashboard"
                            end
                            className="hover:bg-sidebar-accent text-sm"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          >
                            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                            <span>PTP Dashboard</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      )}
                      {showAirsaDashboard && (
                      <SidebarMenuItem key="/company/airsa-dashboard">
                        <SidebarMenuButton asChild>
                          <NavLink
                            to="/company/airsa-dashboard"
                            end
                            className="hover:bg-sidebar-accent text-sm"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          >
                            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                            <span>AIRSA Dashboard</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      )}
                    </div>
                  )}
                </SidebarMenuItem>
              )}
              {(profile?.account_type === 'company_admin' || profile?.account_type === 'org_admin') && hasDashboardAccess && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard/interventions"
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <ClipboardCheck className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Interventions</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/settings"
                    className="hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span>Settings</span>
                        {isSettingsOpen
                          ? <ChevronDown className="h-3 w-3" />
                          : <ChevronRight className="h-3 w-3" />
                        }
                      </div>
                    )}
                  </NavLink>
                </SidebarMenuButton>
                {isSettingsOpen && !collapsed && (
                  <div className="ml-4 mt-1 space-y-1">
                    {(profile?.account_type === 'coach' ? coachSettingsSubItems : settingsSubItems).map(item => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild disabled={item.disabled}>
                          {item.disabled ? (
                            <span className="flex items-center gap-2 opacity-50 cursor-not-allowed px-2 py-1.5 text-sm">
                              <item.icon className="h-3.5 w-3.5 shrink-0" />
                              <span>{item.title}</span>
                              {item.badge && (
                                <span className="ml-auto text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                                  {item.badge}
                                </span>
                              )}
                            </span>
                          ) : (
                            <NavLink
                              to={item.url}
                              end
                              className="hover:bg-sidebar-accent text-sm"
                              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            >
                              <item.icon className="h-3.5 w-3.5 shrink-0" />
                              <span>{item.title}</span>
                            </NavLink>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </div>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
