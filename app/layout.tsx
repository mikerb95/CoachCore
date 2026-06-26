import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});
const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "CoachCore",
  description:
    "App PWA para entrenadores personales. Tus datos, tu propiedad. Sin suscripciones, 100% offline.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CoachCore" },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0E0F",
  width: "device-width",
  initialScale: 1,
  // Sin maximumScale/userScalable: permitir el zoom es requisito de accesibilidad (WCAG 1.4.4).
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Iconos Phosphor auto-hospedados (sin CDN externo): integridad de cadena de suministro + 100% offline. */}
        <link rel="stylesheet" href="/phosphor/regular/style.css" />
        <link rel="stylesheet" href="/phosphor/fill/style.css" />
        <link rel="stylesheet" href="/phosphor/bold/style.css" />
      </head>
      <body className={`${spaceGrotesk.variable} ${ibmPlex.variable} ${jetbrains.variable}`}>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
