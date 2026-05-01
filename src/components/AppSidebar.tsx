import {
  LayoutDashboard, BarChart3, ClipboardList, ClipboardCheck, MessageSquare, BookOpen, Settings,
  Users, Users2, Building2, UsersRound, Activity, Heart, Award, UserCircle,
  ShieldCheck, Briefcase, GitBranch, FlaskConical, LogOut, History, Shield,
  CreditCard, Receipt, ChevronDown, ChevronRight, Plus, FileText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAccountRole } from "@/lib/accountRoles";
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
}

const individualNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Results", url: "/my-results", icon: BarChart3 },
  { title: "Assessment", url: "/assessment", icon: ClipboardList },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "Resources", url: "/resources", icon: BookOpen },
];

const corporateNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Results", url: "/my-results", icon: BarChart3 },
  { title: "Shared Results", url: "/shared-results", icon: Users2 },
  { title: "Assessment", url: "/assessment", icon: ClipboardList },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "Resources", url: "/resources", icon: BookOpen },
];

const coachNav: NavItem[] = [
  { title: "My Assessments", url: "/assessment", icon: ClipboardList },
  { title: "My Results", url: "/my-results", icon: BarChart3 },
  { title: "My Clients", url: "/coach/clients", icon: Users },
  
  { title: "Orders & Invoices", url: "/coach/invoices", icon: Receipt },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "Resources", url: "/coach/resources", icon: BookOpen, disabled: true, badge: "Coming Soon" },
  { title: "Certification", url: "/coach/certification", icon: Award, disabled: true, badge: "Coming Soon" },
  { title: "My Profile", url: "/coach/profile", icon: UserCircle, disabled: true, badge: "Coming Soon" },
];

const adminNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Results", url: "/my-results", icon: BarChart3 },
  { title: "Shared Results", url: "/shared-results", icon: Users2 },
  { title: "Assessment", url: "/assessment", icon: ClipboardList },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Features", url: "/company/features", icon: ShieldCheck },
  { title: "Teams", url: "/admin/teams", icon: UsersRound },
  { title: "Resources", url: "/admin/resources", icon: BookOpen },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
];

const superAdminNav: NavItem[] = [
  { title: "Assessment", url: "/assessment", icon: ClipboardList },
  { title: "My Results", url: "/my-results", icon: FileText },
  { title: "Platform Health", url: "/super-admin/health", icon: Heart },
  { title: "Coach Management", url: "/super-admin/coaches", icon: Users },
  { title: "Company Accounts", url: "/super-admin/companies", icon: Briefcase },
  { title: "Create Organization", url: "/super-admin/create-organization", icon: Plus },
  { title: "Version Management", url: "/super-admin/versions", icon: GitBranch },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "AI Research", url: "/super-admin/ai-research", icon: FlaskConical, disabled: true, badge: "Phase 2" },
];

function getNavItems(accountType: string | null | undefined): NavItem[] {
  switch (accountType) {
    case "coach":
      return coachNav;
    case "company_admin":
    case "org_admin":
      return adminNav;
    case "brainwise_super_admin":
      return superAdminNav;
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
  const { signOut } = useAuth();
  const { profile } = useUserProfile();
  const { isCorp } = useAccountRole();

  const navItems = getNavItems(profile?.account_type);
  const isSettingsOpen = location.pathname.startsWith('/settings');
  const isClientsOpen = location.pathname.startsWith('/coach/clients') || location.pathname.startsWith('/coach/client-results');
  const isDashboardsOpen = location.pathname.startsWith('/company/nai-dashboard') || location.pathname.startsWith('/company/ptp-dashboard');
  const showDashboardsMenu = profile?.account_type === 'company_admin' || profile?.account_type === 'org_admin' || profile?.account_type === 'brainwise_super_admin';
  const settingsSubItems: { title: string; url: string; icon: React.ElementType; disabled?: boolean; badge?: string }[] = [
    { title: 'General Settings', url: '/settings', icon: Settings },
    { title: 'Privacy & Permissions', url: '/settings/privacy', icon: Shield },
    ...(isCorp ? [] : [{ title: 'Billing & Receipts', url: '/settings/billing', icon: CreditCard }]),
  ];

  const coachSettingsSubItems: typeof settingsSubItems = [
    { title: 'General Settings', url: '/settings', icon: Settings },
    { title: 'Privacy & Permissions', url: '/settings/privacy', icon: Shield },
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
                if (item.title === "My Clients") {
                  return (
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
                  );
                }
                return (
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
                );
              })}
              {showDashboardsMenu && (
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
                    </div>
                  )}
                </SidebarMenuItem>
              )}
              {(profile?.account_type === 'company_admin' || profile?.account_type === 'org_admin') && (
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
