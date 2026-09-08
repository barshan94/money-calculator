"use client";

import { usePathname } from "next/navigation";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { UserMenu } from "@/components/layout/user-menu";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAuthPage =
    pathname === "/auth/login" ||
    pathname === "/auth/signup";

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div>Money</div>
          <div>Calculator</div>
        </div>

        <DashboardNav />
      </aside>

      <div className="main-content">
        <header className="topbar">
          <UserMenu />
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}