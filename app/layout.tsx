import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hevy Analytics",
  description: "Acompanhamento inteligente dos seus treinos no Hevy",
  applicationName: "Hevy Analytics",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b0d10" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const preferencesBootstrap = `(function(){try{var t=localStorage.getItem('hevy-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t;var c=localStorage.getItem('hevy-accent');if(/^#[0-9a-f]{6}$/i.test(c||'')){document.documentElement.style.setProperty('--lime',c);document.documentElement.style.setProperty('--lime-dark','color-mix(in srgb, '+c+' 13%, #101419)')}}catch(e){}})()`;
  return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: preferencesBootstrap }} /></head><body>{children}</body></html>;
}
