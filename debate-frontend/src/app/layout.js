"use client";
import Navbar from "@/components/Navbar";
import { Providers } from '@/components/layout/Providers'

import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning >
      <body className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors duration-500">
        <AuthProvider>
          <Providers>
            <Navbar />
            {children}
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
