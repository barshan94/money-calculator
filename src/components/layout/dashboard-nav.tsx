"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/accounts", label: "Accounts", icon: "◫" },
  { href: "/transactions", label: "Transactions", icon: "↔" },
  { href: "/loans", label: "Loans", icon: "↗" },
  { href: "/categories", label: "Categories", icon: "▦" },
  { href: "/budgets", label: "Budgets", icon: "◉" },
  { href: "/investments", label: "Investments", icon: "↗" },
  { href: "/long-term-assets", label: "Long-Term Assets", icon: "⌂" },
  { href: "/deposits", label: "Deposits", icon: "▣" },
  { href: "/recurring", label: "Recurring", icon: "↻" },
  { href: "/goals", label: "Goals", icon: "◎" },
  { href: "/reports", label: "Reports", icon: "▥" },
  { href: "/tuition", label: "Tuition", icon: "🎓" },
];



export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation">
      {navigation.map((item) => {
        const isActive =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            style={{
              background: isActive
                ? "#1e293b"
                : undefined,
              color: isActive ? "#fff" : undefined,
              fontWeight: isActive ? 600 : undefined,
            }}
          >
            <span aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}