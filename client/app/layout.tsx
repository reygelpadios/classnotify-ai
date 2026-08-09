import type { Metadata } from "next";
import "./globals.css";
import { ThemeInit } from "@/components/ThemeInit";

export const metadata: Metadata = {
  title: "ClassNotify AI",
  description: "Never miss a Google Classroom assignment again.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeInit />
      </head>
      <body className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
}
