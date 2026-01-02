import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Wallet,
  Tags,
  PiggyBank,
} from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sugih - Personal Finance Management",
  description:
    "Track your expenses, manage budgets, and monitor your financial health",
};

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: Receipt,
  },
  {
    title: "Budgets",
    href: "/budgets",
    icon: PieChart,
  },
  {
    title: "Reference",
    icon: Tags,
    children: [
      {
        title: "Wallets",
        href: "/wallets",
        icon: Wallet,
      },
      {
        title: "Categories",
        href: "/categories",
        icon: Tags,
      },
      {
        title: "Savings",
        href: "/savings",
        icon: PiggyBank,
      },
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            {/* Logo/Title */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">Sugih</h1>
              <p className="text-sm text-gray-500 mt-1">Personal Finance</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                if (item.children) {
                  return (
                    <div key={item.title} className="space-y-1">
                      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      <div className="ml-7 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors",
                              "text-gray-600 hover:text-gray-900",
                            )}
                          >
                            <child.icon className="h-4 w-4" />
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors",
                      "text-gray-700 hover:text-gray-900",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">v0.1.0 - MVP</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <main className="p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
