import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Layout from "@/components/layout/Layout";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AISecure AI Scanner",
  description: "AI-powered code security scanner for GitHub repositories",
  keywords: ["AI", "security", "code scanner", "GitHub", "vulnerability detection"],
  authors: [{ name: "AISecure Team" }],
  openGraph: {
    title: "AISecure AI Scanner",
    description: "AI-powered code security scanner for GitHub repositories",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrains.className} antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <Layout>
              {children}
            </Layout>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}