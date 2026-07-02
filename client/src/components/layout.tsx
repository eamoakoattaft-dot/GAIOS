import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileSpreadsheet,
  ServerCog,
  GraduationCap,
  Building2,
  BookOpen,
  ClipboardList,
  Rocket,
  Bot,
  Users,
  Moon,
  Sun,
  Menu,
  X,
  Search,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { LogoWordmark, Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  testid: string;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Executive Overview", icon: LayoutDashboard, testid: "nav-overview" },
  { href: "/grants", label: "Grant Administration", icon: FileSpreadsheet, testid: "nav-grants" },
  { href: "/it", label: "IT & Digital Infrastructure", icon: ServerCog, testid: "nav-it" },
  { href: "/training", label: "Training & Onboarding", icon: GraduationCap, testid: "nav-training" },
  { href: "/donors", label: "Donor Tracker", icon: Building2, testid: "nav-donors" },
  { href: "/curriculum", label: "Curriculum", icon: BookOpen, testid: "nav-curriculum" },
  { href: "/agents", label: "AI Agents", icon: Bot, testid: "nav-agents" },
  { href: "/templates", label: "Templates", icon: ClipboardList, testid: "nav-templates" },
  { href: "/launch", label: "90-Day Launch", icon: Rocket, testid: "nav-launch" },
  { href: "/team", label: "Team", icon: Users, testid: "nav-team", adminOnly: true },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeRole, memberships, activeOrgId } = useAuth();

  const isAdmin = activeRole === "ed" || activeRole === "rso" || activeRole === "it";
  const activeOrg = memberships.find((m) => m.org_id === activeOrgId)?.org;
  const visibleNav = NAV.filter((n) => !n.adminOnly || isAdmin);

  const isActive = (href: string) => {
    if (href === "/") return location === "/" || location === "";
    return location === href || location.startsWith(href + "/");
  };

  return (
    <div className="grid h-dvh w-full grid-rows-[auto_1fr] md:grid-cols-[260px_1fr] md:grid-rows-1 overflow-hidden bg-background">
      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between border-b border-border bg-sidebar text-sidebar-foreground px-4 py-3">
        <button
          data-testid="button-mobile-menu"
          aria-label="Toggle navigation"
          className="p-1.5 rounded-md hover:bg-sidebar-accent"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <LogoWordmark />
        <button
          data-testid="button-theme-toggle-mobile"
          aria-label="Toggle theme"
          className="p-1.5 rounded-md hover:bg-sidebar-accent"
          onClick={toggle}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Sidebar — desktop & mobile drawer */}
      <aside
        data-testid="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-col z-30 overflow-y-auto scroll-contain",
          "md:flex md:relative md:row-span-2",
          mobileOpen ? "absolute inset-0 flex pt-14" : "hidden",
        )}
      >
        <div className="hidden md:flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <LogoWordmark />
        </div>
        {activeOrg && (
          <div className="hidden md:block px-5 pt-3 pb-1 text-[11px] text-sidebar-foreground/60">
            Organization
            <div className="text-[13px] text-sidebar-foreground font-medium tracking-tight mt-0.5" data-testid="active-org">
              {activeOrg.name}
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testid}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] font-medium tracking-tight transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon size={16} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border text-[11px] text-sidebar-foreground/60 leading-relaxed">
          <p className="font-semibold text-sidebar-foreground/80 tracking-tight">System v0.9</p>
          <p>Internal pre-launch build. Operational data is illustrative.</p>
          <div className="mt-3 grid grid-cols-2 gap-1.5" aria-label="CSTEM brand color codes">
            <div
              className="rounded-md border border-white/10 bg-[#4E8255] px-2 py-1 text-[10px] font-semibold text-white"
              data-testid="brand-color-green"
            >
              #4E8255
            </div>
            <div
              className="rounded-md border border-white/10 bg-[#393B3A] px-2 py-1 text-[10px] font-semibold text-white"
              data-testid="brand-color-charcoal"
            >
              #393B3A
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <main className="flex flex-col overflow-hidden">
        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-between gap-4 border-b border-border px-8 py-3.5 bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground" data-testid="header-title">
              {NAV.find((n) => isActive(n.href))?.label ?? "GAIOS"}
            </h1>
            <span className="text-[11.5px] text-muted-foreground tabular-nums" data-testid="text-last-updated">
              Updated 2m ago
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search opportunities, donors, modules…"
                data-testid="input-global-search"
                className="h-9 w-72 pl-8 pr-3 rounded-md bg-secondary border border-border text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
              onClick={toggle}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </Button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scroll-contain" data-testid="main-scroll">
          <div className="px-5 md:px-8 py-5 md:py-7 max-w-[1400px] mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between mb-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground" data-testid="page-title">
          {title}
        </h2>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export { Logo };
