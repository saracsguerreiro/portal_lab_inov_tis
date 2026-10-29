import type { Metadata, Viewport } from "next";
import { DM_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/shell";

// Fontes servidas pelo próprio site (sem pedido bloqueante a terceiros, com métricas de recurso sem CLS).
// Tipografia do Design System TIS: Inter (texto e títulos) e DM Mono (códigos).
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });

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
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#070C17" },
  ],
};

// Aplica o tema guardado antes da primeira pintura (sem «piscar» e sem CLS).
const themeScript = `(function(){try{var t=localStorage.getItem("eco-theme");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.mode=t}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" suppressHydrationWarning className={`${inter.variable} ${dmMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
