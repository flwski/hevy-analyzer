import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, BottomNav } from "@/components/nav";
import { UnitProvider } from "@/components/unit-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hevy Insights",
  description: "Acompanhamento dos seus treinos do Hevy",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0b0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full bg-background text-foreground">
        <UnitProvider>
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8">
              {children}
            </main>
          </div>
          <BottomNav />
        </UnitProvider>
      </body>
    </html>
  );
}
