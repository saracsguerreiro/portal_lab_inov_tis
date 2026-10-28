import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/shell";

// Fontes servidas pelo próprio site (sem pedido bloqueante a terceiros, com métricas de recurso sem CLS).
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const syne = Syne({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-syne", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Ecossistema de Inovação TIS", template: "%s · Ecossistema de Inovação TIS" },
  description: "Da ideia ao negócio, com o Innovation Lab e a Incubadora da TIS. Submeta ideias, conheça projectos e participe em desafios.",
  applicationName: "Ecossistema de Inovação TIS",
  robots: process.env.NEXT_PUBLIC_MODE === "demo" ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070b14" },
  ],
};

// Aplica o tema guardado antes da primeira pintura (sem «piscar» e sem CLS).
const themeScript = `(function(){try{var t=localStorage.getItem("eco-theme");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${syne.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
