
import type { Metadata } from "next";
import { Poppins, Allura } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"]
});

const allura = Allura({ 
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-allura"
});

export const metadata: Metadata = {
  title: "DEA Travel Expenses Management",
  description: "Travel expenses management system for Digital Euro Association",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={allura.variable}>
      <body className={poppins.className}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <Header />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
