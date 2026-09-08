import type { Metadata } from "next";
import "./globals.css";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const metadata: Metadata = {
  title: "Money Calculator",
  description: "Personal financial management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <DashboardShell>
          {children}
        </DashboardShell>
      </body>
    </html>
  );
}