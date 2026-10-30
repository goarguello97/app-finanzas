import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { ProveedorTema } from "@/components/proveedor-tema";
import { RegistrarServiceWorker } from "@/components/registrar-service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Finanzas", template: "%s | Finanzas" },
  description: "Gestión de finanzas personales.",
  applicationName: "Finanzas",
  appleWebApp: { capable: true, title: "Finanzas", statusBarStyle: "default" },
  icons: {
    icon: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f5f6" },
    { media: "(prefers-color-scheme: dark)", color: "#10171b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={GeistSans.variable} suppressHydrationWarning>
      <body>
        <ProveedorTema>{children}</ProveedorTema>
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
