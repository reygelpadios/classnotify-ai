"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Assignments" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/ai", label: "AI Chat" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full gap-1 border-b border-gray-200 pb-2 dark:border-gray-800 md:w-56 md:flex-col md:border-b-0 md:border-r md:pb-0 md:pr-4">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
