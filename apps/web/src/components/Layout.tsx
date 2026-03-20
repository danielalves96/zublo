import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { LogoIcon, LogoWithName } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { aiService } from "@/services/ai";
import { usersService } from "@/services/users";

const baseNavItems = [
  { key: "dashboard", path: "/dashboard" as const, icon: LayoutDashboard },
  { key: "subscriptions", path: "/subscriptions" as const, icon: CreditCard },
  { key: "calendar", path: "/calendar" as const, icon: Calendar },
  { key: "statistics", path: "/statistics" as const, icon: BarChart2 },
  { key: "settings", path: "/settings" as const, icon: Settings },
];

const chatNavItem = { key: "chat", path: "/chat" as const, icon: MessageSquare };

export function Layout() {
  const { t } = useTranslation();
  const { user, isAdmin, logout } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: aiSettings } = useQuery({
    queryKey: queryKeys.aiSettings(user?.id ?? ""),
    queryFn: () => aiService.getSettings(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const navItems = aiSettings?.enabled
    ? [...baseNavItems.slice(0, 4), chatNavItem, baseNavItems[4]]
    : baseNavItems;

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full flex flex-col transform border-r border-border/40 bg-card/50 backdrop-blur-xl transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 lg:z-10 shrink-0",
          sidebarOpen ? "translate-x-0 shadow-premium w-[300px]" : "-translate-x-full w-[300px]",
          isCollapsed ? "lg:w-20" : "lg:w-[300px]"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo Area */}
          <div className="flex h-20 items-center justify-between px-4 pt-2 relative">
            <div className={cn("flex items-center transition-all overflow-hidden", isCollapsed ? "opacity-0 invisible w-0" : "opacity-100 visible w-full px-2")}>
              <LogoWithName className="h-8 w-auto drop-shadow" />
            </div>
            
            {/* Collapsed Logo */}
            <div className={cn("absolute inset-0 flex items-center justify-center pt-2 transition-all", isCollapsed ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none")}>
               <LogoIcon className="h-8 w-8 drop-shadow" />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-4 top-20 z-50 h-8 w-8 rounded-full border border-border bg-background shadow-md items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent hover:shadow-lg transition-all duration-200 hover:scale-110"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2 overflow-x-hidden">
            <TooltipProvider delayDuration={0}>
              {!isCollapsed && (
                <p className="px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4 whitespace-nowrap">
                  {t("menu")}
                </p>
              )}
              {navItems.map(({ key, path, icon: Icon }) => {
                const isActive = pathname.startsWith(path);
                return (
                  <Tooltip key={key} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        to={path}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                          isCollapsed ? "justify-center px-0" : ""
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                            isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                          )}
                        />
                        {!isCollapsed && <span className="whitespace-nowrap">{t(key)}</span>}
                      </Link>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right" className="ml-4 bg-popover text-popover-foreground shadow-premium backdrop-blur-md rounded-xl border border-white/5">
                        {t(key)}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}

              {isAdmin && (() => {
                const isActive = pathname.startsWith("/admin");
                return (
                  <>
                    <div className="my-6 border-b border-border/40 mx-4" />
                    {!isCollapsed && (
                      <p className="px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-4 whitespace-nowrap">
                        {t("administration")}
                      </p>
                    )}
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Link
                          to="/admin"
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                            isCollapsed ? "justify-center px-0" : ""
                          )}
                        >
                          <Shield 
                            className={cn(
                              "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                              isActive ? "text-primary-foreground" : "text-destructive"
                            )} 
                          />
                          {!isCollapsed && <span className="whitespace-nowrap">{t("admin")}</span>}
                        </Link>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right" className="ml-4 bg-popover text-popover-foreground shadow-premium backdrop-blur-md rounded-xl border border-white/5">
                          {t("admin")}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </>
                );
              })()}
            </TooltipProvider>
          </nav>

          {/* User section */}
          <div className="mt-auto p-4">
            <div className={cn("rounded-2xl border border-border/40 bg-card/60 p-4 shadow-sm backdrop-blur-md flex gap-4 overflow-hidden", isCollapsed ? "flex-col items-center px-2 py-4" : "flex-col")}>
              <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
                {user?.avatar ? (
                  <img
                    src={usersService.avatarUrl(user) ?? ""}
                    alt={user.name || user.email}
                    className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-background shadow-sm"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold ring-2 ring-background shadow-sm">
                    {user?.name?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"}
                  </div>
                )}
                {!isCollapsed && (
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate text-foreground">
                      {user?.name || user?.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                )}
              </div>
              <TooltipProvider delayDuration={0}>
                <Tooltip disableHoverableContent>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size={isCollapsed ? "icon" : "sm"}
                      className={cn("justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-colors shrink-0", !isCollapsed && "w-full")}
                      onClick={logout}
                    >
                      <LogOut className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-2")} />
                      {!isCollapsed && <span className="whitespace-nowrap">{t("logout")}</span>}
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="ml-4 bg-popover text-popover-foreground shadow-premium backdrop-blur-md rounded-xl border border-destructive/20">
                      {t("logout")}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Mobile header */}
        <header className="flex h-20 items-center justify-between border-b border-border/40 bg-card/40 backdrop-blur-xl px-6 lg:hidden sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <div className="flex items-center transition-all overflow-hidden opacity-100 visible w-full">
                <LogoWithName className="h-7 w-auto drop-shadow" />
             </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="hover:bg-accent/50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto w-full max-w-[1600px] mx-auto p-4 md:p-8 lg:p-10 scroll-smooth">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav (when mobile_navigation enabled) */}
      {user?.mobile_navigation && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border/40 bg-card/80 backdrop-blur-xl pb-safe lg:hidden">
          {navItems.slice(0, 5).map(({ key, path, icon: Icon }) => {
            const isActive = pathname.startsWith(path);
            return (
              <Link
                key={key}
                to={path}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-[10px] font-medium transition-all",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "scale-110 transition-transform")} />
                <span className="truncate">{t(key)}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
