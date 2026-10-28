import type { NextConfig } from "next";

// Dois modos com o mesmo código (ver DECISOES.md, D-01):
//  - "full": Next.js com servidor, PostgreSQL, Auth.js, fila e integrações.
//  - "demo": exportação estática para o GitHub Pages, dados no browser.
const isDemo = process.env.NEXT_PUBLIC_MODE === "demo";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const config: NextConfig = {
  reactStrictMode: true,
  // Só para builds locais paralelos; sem a variável, a exportação estática vai para out/.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  basePath: basePath || undefined,
  trailingSlash: isDemo,
  images: { unoptimized: true },
  // Ficheiros *.server.ts(x) (rotas de API, Auth.js) só entram no modo completo.
  pageExtensions: isDemo ? ["tsx", "ts"] : ["tsx", "ts", "server.ts", "server.tsx"],
  ...(isDemo ? { output: "export" as const } : {}),
  experimental: { viewTransition: true },
  eslint: { ignoreDuringBuilds: true },
};

export default config;
