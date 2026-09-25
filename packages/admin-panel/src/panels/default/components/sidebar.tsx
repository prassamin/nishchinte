"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Boxes,
  ChartNoAxesColumn,
  FolderOpen,
  ClipboardList,
  CreditCard,
  Home,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TicketPercent,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useWorkspaceStore } from "../store/workspace";
import { cn } from "@heroui/styles";

const navItems = [
  { label: "Overview", href: "", icon: Home },
  {
    label: "Products",
    href: "/products",
    icon: Boxes,
    children: [{ label: "Categories", href: "/products/categories" }],
  },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Coupons", href: "/coupons", icon: TicketPercent },
  { label: "Content", href: "/content", icon: FolderOpen },
  { label: "Customers", href: "#", icon: Users, disabled: true },
  { label: "Marketing", href: "#", icon: Megaphone, disabled: true },
  { label: "Payments", href: "#", icon: CreditCard, disabled: true },
  { label: "Reports", href: "#", icon: ChartNoAxesColumn, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarWidth = useWorkspaceStore((s) => s.sidebarWidth);
  const setSidebarCollapsed = useWorkspaceStore((s) => s.setSidebarCollapsed);
  const isMobileMenuOpen = useWorkspaceStore((s) => s.isMobileSidebarOpen);
  const setMobileSidebarOpen = useWorkspaceStore((s) => s.setMobileSidebarOpen);
  const desktopCollapsed = sidebarWidth < 100;

  const secondaryNavItems = [
    { label: "Store Settings", href: "/settings", icon: Settings },
    { label: "Team", href: "/settings/team", icon: Users },
  ];

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const collapsed = desktopCollapsed;

  const baseHref = `/admin`;

  useEffect(() => {
    const nextExpanded: Record<string, boolean> = {};

    navItems.forEach((item) => {
      if (!item.children?.length) return;

      const itemPath = `${baseHref}${item.href}`;
      const inSection =
        pathname === itemPath || pathname.startsWith(`${itemPath}/`);

      nextExpanded[item.href] = inSection;
    });

    setExpandedGroups((prev) => ({
      ...prev,
      ...nextExpanded,
    }));
  }, [baseHref, pathname]);

  return (
    <>
      {/* dark overlay for mobile menu */}
      {isMobileMenuOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/35 backdrop-blur-[1px] md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-16 z-50 flex h-[calc(100vh-4rem)] flex-col border-r border-ap-divider bg-ap-background transition-all duration-300",
          "w-72 not-md:rounded-r-2xl shadow-2xl md:rounded-tl-2xl md:shadow-none md:w-(--sidebar-width)",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
        )}
        style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      >
        <div className="flex items-center gap-3 border-b border-ap-divider px-3 py-3 md:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ap-accent text-sm font-bold text-white">
            BC
          </div>
          <span className="text-sm font-semibold text-ap-foreground">
            Platform
          </span>
        </div>

        <div
          className={cn(
            "hidden items-center border-b border-ap-divider px-2 py-2 md:flex",
            collapsed ? "justify-center" : "justify-end",
          )}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!collapsed)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-ap-muted transition not-disabled:hover:bg-ap-accent/10 not-disabled:hover:text-ap-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const itemPath = `${baseHref}${item.href}`;
              const active = !item.disabled && pathname === itemPath;

              if (item.disabled) {
                return (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      collapsed ? "justify-center" : ""
                    } text-ap-muted/50`}
                  >
                    <Icon size={18} className="text-ap-muted/30 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                );
              }

              const hasChildren = !!item.children?.length;
              const isExpanded = !!expandedGroups[item.href];
              const activeChildIndex = hasChildren
                ? item.children!.findIndex(
                    (child) => pathname === `${baseHref}${child.href}`,
                  )
                : -1;
              const lineHeightPercent =
                hasChildren && activeChildIndex >= 0
                  ? ((activeChildIndex + 1) / item.children!.length) * 100
                  : 0;

              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center gap-1 relative">
                    <Link
                      href={`${baseHref}${item.href}`}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        collapsed ? "w-full justify-center" : "flex-1"
                      } ${!collapsed && hasChildren ? "pr-10" : ""} ${
                        active
                          ? "bg-ap-accent/10 text-ap-foreground font-medium"
                          : "text-ap-muted hover:bg-ap-accent/10 hover:text-ap-foreground"
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={18} className="shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>

                    {!collapsed && hasChildren ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGroups((prev) => ({
                            ...prev,
                            [item.href]: !prev[item.href],
                          }))
                        }
                        className="absolute right-2 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center"
                        aria-label={
                          isExpanded
                            ? "Collapse nested menu"
                            : "Expand nested menu"
                        }
                        aria-expanded={isExpanded}
                      >
                        <span
                          className={cn(
                            "relative block h-4 w-4 transition-transform duration-300 ease-out",
                            isExpanded ? "rotate-180" : "rotate-0",
                          )}
                          aria-hidden="true"
                        >
                          <span className="absolute left-1/2 top-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ap-muted" />
                          <span
                            className={cn(
                              "absolute left-1/2 top-1/2 h-0.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ap-muted transition-all duration-300 ease-out",
                              isExpanded
                                ? "rotate-90 scale-x-0 opacity-0"
                                : "rotate-90 scale-x-100 opacity-100",
                            )}
                          />
                        </span>
                      </button>
                    ) : null}
                  </div>

                  {!collapsed && hasChildren ? (
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-300",
                        isExpanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="relative ml-4 space-y-0.5 pl-2">
                          <span
                            className="pointer-events-none absolute left-0 top-0 w-px bg-ap-accent/40 transition-[height,opacity] duration-300 ease-out"
                            style={{
                              height: `${lineHeightPercent}%`,
                              opacity: lineHeightPercent > 0 ? 1 : 0,
                            }}
                          />

                          {item.children!.map((child) => {
                            const childPath = `${baseHref}${child.href}`;
                            const childActive = pathname === childPath;

                            return (
                              <Link
                                key={child.label}
                                href={childPath}
                                onClick={() => setMobileSidebarOpen(false)}
                                className={cn(
                                  "relative flex items-center rounded-md px-2 py-1.5 text-sm transition-colors",
                                  childActive
                                    ? "bg-ap-accent/10 text-ap-foreground font-medium"
                                    : "text-ap-muted hover:bg-ap-accent/10 hover:text-ap-foreground",
                                )}
                              >
                                <span>{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="my-3 border-t border-ap-divider" />

            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === `${baseHref}${item.href}`;

              return (
                <Link
                  key={item.label}
                  href={`${baseHref}${item.href}`}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    collapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-ap-accent/10 text-ap-foreground font-medium"
                      : "text-ap-muted hover:bg-ap-accent/10 hover:text-ap-foreground"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
    </>
  );
}
