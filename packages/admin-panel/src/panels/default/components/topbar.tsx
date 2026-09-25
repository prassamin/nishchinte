"use client";

import { Bell } from "lucide-react";
import { Dropdown, Header, Label } from "@heroui/react";
import { useWorkspaceStore } from "../store/workspace";
import type { AdminSessionPayload } from "@nishchinte/auth";
import { actions } from "@nishchinte/server/actions";

interface TopBarProps {
  user: AdminSessionPayload;
}

export function TopBar({ user }: TopBarProps) {
  const isMobileSidebarOpen = useWorkspaceStore((s) => s.isMobileSidebarOpen);
  const toggleMobileSidebar = useWorkspaceStore((s) => s.toggleMobileSidebar);

  const userDisplayName = user?.name || user?.email || "User";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-[#1a1a1a] px-4">
        {/* Left: Platform Logo / Mobile Menu */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="group flex p-2 items-center justify-center rounded-md text-white transition-all duration-200 hover:bg-[#2d2d2d] active:scale-95 md:hidden"
            aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileSidebarOpen}
          >
            <span
              className={
                "relative block h-3.5 w-4 transition-transform duration-300 ease-out " +
                (isMobileSidebarOpen ? "rotate-90" : "rotate-0")
              }
              aria-hidden="true"
            >
              <span
                className={
                  "absolute left-0 top-0 h-0.5 w-4 rounded-full bg-current transition-all duration-300 ease-out " +
                  (isMobileSidebarOpen ? "translate-y-1.5 rotate-45" : "")
                }
              />
              <span
                className={
                  "absolute left-0 top-1/2 h-0.5 w-3 -translate-y-1/2 rounded-full bg-current transition-all duration-250 ease-out " +
                  (isMobileSidebarOpen
                    ? "opacity-0 -translate-x-1 scale-x-0"
                    : "opacity-100 translate-x-0 scale-x-100")
                }
              />
              <span
                className={
                  "absolute bottom-0 left-0 h-0.5 w-4 rounded-full bg-current transition-all duration-300 ease-out " +
                  (isMobileSidebarOpen ? "-translate-y-1.5 -rotate-45" : "")
                }
              />
            </span>
          </button>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ap-accent text-sm font-bold text-white">
              BC
            </div>
          </div>
        </div>

        {/* Right: Store Switcher | Notification | User */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md text-[#8a8a8a] transition hover:bg-[#202020] hover:text-white"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>

          {/* User Profile Dropdown */}
          <Dropdown>
            <Dropdown.Trigger className="flex h-10 w-10 items-center justify-center rounded-full bg-[#202020] text-sm font-medium text-white transition hover:bg-[#2d2d2d] overflow-hidden">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={userDisplayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-bold text-xs uppercase text-white">
                  {userDisplayName.slice(0, 2)}
                </span>
              )}
            </Dropdown.Trigger>
            <Dropdown.Popover
              className="min-w-56 rounded-xl border border-ap-border bg-ap-surface shadow-xl p-1"
              placement="bottom end"
            >
              <Dropdown.Menu className="gap-1 bg-ap-surface text-ap-foreground">
                <Dropdown.Section className="border-b border-ap-border pb-1 mb-1">
                  <Header className="text-xs font-semibold text-ap-muted px-2 py-1">
                    {userDisplayName}
                  </Header>
                  <Dropdown.Item
                    key="profile"
                    textValue="Profile"
                    className="rounded-lg px-2.5 py-2 cursor-pointer data-[hover=true]:bg-ap-surface-secondary data-hovered:bg-ap-surface-secondary transition-colors"
                  >
                    <Label className="text-sm font-medium text-ap-foreground cursor-pointer">
                      Profile
                    </Label>
                  </Dropdown.Item>
                  <Dropdown.Item
                    key="settings"
                    textValue="Settings"
                    className="rounded-lg px-2.5 py-2 cursor-pointer data-[hover=true]:bg-ap-surface-secondary data-hovered:bg-ap-surface-secondary transition-colors"
                  >
                    <Label className="text-sm font-medium text-ap-foreground cursor-pointer">
                      Settings
                    </Label>
                  </Dropdown.Item>
                </Dropdown.Section>
                <Dropdown.Section>
                  <Dropdown.Item
                    key="logout"
                    textValue="Sign Out"
                    variant="danger"
                    onPress={() => actions.admin.signOut()}
                    className="rounded-lg px-2.5 py-2 cursor-pointer text-ap-danger data-[hover=true]:bg-ap-danger/10 data-hovered:bg-ap-danger/10 transition-colors"
                  >
                    <Label className="text-sm font-medium cursor-pointer">
                      Sign Out
                    </Label>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </header>
    </>
  );
}
