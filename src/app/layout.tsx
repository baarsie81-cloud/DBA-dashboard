import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DBA Hypotheekdashboard",
  description: "Intern hypotheekdossieroverzicht voor DBA advies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${sourceSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-dba-charcoal">{children}</body>
    </html>
  );
}
