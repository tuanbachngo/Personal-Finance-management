import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { UserScopeProvider } from "@/providers/user-scope-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Personal Finance Management",
  description: "Next.js frontend skeleton for Personal Finance Management System"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetBrainsMono.variable}`}>
        <QueryProvider>
          <AuthProvider>
            <UserScopeProvider>{children}</UserScopeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
