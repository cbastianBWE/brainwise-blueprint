import {
  LayoutDashboard, BarChart3, ClipboardList, MessageSquare, BookOpen, Settings,
  Users, Building2, UsersRound, Activity, Heart, Award, UserCircle,
  ShieldCheck, Briefcase, GitBranch, FlaskConical, LogOut, History, Shield,
  CreditCard,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
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
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Privacy & Permissions", url: "/settings/privacy", icon: Shield },
];

const coachNav: NavItem[] = [
  { title: "My Assessments", url: "/assessment", icon: ClipboardList },
  { title: "My Results", url: "/my-results", icon: BarChart3 },
  { title: "My Clients", url: "/coach/clients", icon: Users },
  { title: "Client Results", url: "/coach/client-results", icon: BarChart3 },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "Resources", url: "/coach/resources", icon: BookOpen, disabled: true, badge: "Coming Soon" },
  { title: "Certification", url: "/coach/certification", icon: Award, disabled: true, badge: "Coming Soon" },
  { title: "My Profile", url: "/coach/profile", icon: UserCircle, disabled: true, badge: "Coming Soon" },
  { title: "Billing", url: "/settings/billing", icon: CreditCard, disabled: true, badge: "Coming Soon" },
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Organizations", url: "/admin/organizations", icon: Building2 },
  { title: "Teams", url: "/admin/teams", icon: UsersRound },
  { title: "Participation", url: "/admin/participation", icon: Activity },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "Resources", url: "/admin/resources", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

const superAdminNav: NavItem[] = [
  { title: "Platform Health", url: "/super-admin/health", icon: Heart },
  { title: "Company Accounts", url: "/super-admin/companies", icon: Briefcase },
  { title: "Version Management", url: "/super-admin/versions", icon: GitBranch },
  { title: "AI Chat", url: "/ai-chat", icon: MessageSquare },
  { title: "Chat History", url: "/ai-chat/history", icon: History },
  { title: "AI Research", url: "/super-admin/ai-research", icon: FlaskConical, disabled: true, badge: "Phase 2" },
  { title: "Settings", url: "/settings", icon: Settings },
];

function getNavItems(accountType: string | null | undefined): NavItem[] {
  switch (accountType) {
    case "coach":
      return coachNav;
    case "admin":
      return adminNav;
    case "brainwise_super_admin":
      return superAdminNav;
    case "individual":
    case "corporate_employee":
    default:
      return individualNav;
  }
}

function formatAccountType(type: string | null | undefined): string {
  switch (type) {
    case "individual": return "Individual";
    case "corporate_employee": return "Corporate";
    case "coach": return "Coach";
    case "admin": return "Admin";
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

  const navItems = getNavItems(profile?.account_type);

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
              {navItems.map((item) => (
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
              ))}
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
