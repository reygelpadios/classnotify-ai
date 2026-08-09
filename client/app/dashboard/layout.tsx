"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FloatingAiChat } from "@/components/FloatingAiChat";
import Image from "next/image";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiFetch<{ user: User }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
        }
      })
      .finally(() => setChecking(false));
  }, [router]);

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
         <Image
  src="/ClassNotify AI.png"
  alt="ClassNotify Logo"
  width={56}
  height={56}
  className="h-15 w-15 rounded-full object-cover"
        />
          <div>
            <h1 className="text-xl font-semibold">ClassNotify AI</h1>
            {user && <p className="text-xs text-gray-500 dark:text-gray-400">{user.name ?? user.email}</p>}
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-6 md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <FloatingAiChat />
    </div>
  );
}
