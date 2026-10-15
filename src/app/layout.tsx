import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import LogoutButton from "@/components/LogoutButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Visual Regression Checker",
  description: "Automated visual regression testing platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="container">
          <header style={{ padding: '2rem 0', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ color: 'var(--color-primary)', fontSize: '1.5rem' }}>Visual Regression Checker</h1>
            <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <Link href="/" style={{ fontWeight: 500 }}>Dashboard</Link>
              <Link href="/sites" style={{ fontWeight: 500 }}>Sites</Link>
              <Link href="/settings" style={{ fontWeight: 500 }}>Settings</Link>
              <LogoutButton />
            </nav>
          </header>
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
