import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest { return { name: "Hevy Analytics", short_name: "Hevy", description: "Análises e notificações inteligentes dos seus treinos", start_url: "/", display: "standalone", background_color: "#0b0d10", theme_color: "#baf43d", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] }; }
