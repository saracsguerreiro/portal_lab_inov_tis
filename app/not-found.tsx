"use client";
// Página 404. Na demonstração estática (GitHub Pages), as fichas criadas no browser
// (ideias, projectos, notícias, desafios novos) não existem como ficheiros: o GitHub Pages
// devolve esta página e ela mostra a ficha certa a partir do endereço.
import * as React from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { t } from "@/lib/i18n";
import { Button, EmptyState } from "@/components/ui";
import { MyIdeaDetailView } from "@/components/pages/account";
import { InternalIdeaDetailView } from "@/components/pages/collaborator";
import { ProjectDetailView } from "@/components/pages/projects";
import { ChallengeDetailView, NewsDetailView } from "@/components/pages/public-misc";

const ROUTES: [RegExp, (id: string) => React.ReactNode][] = [
  [/^\/conta\/ideias\/([^/]+)\/?$/, (id) => <MyIdeaDetailView id={id} />],
  [/^\/ideias\/([^/]+)\/?$/, (id) => <InternalIdeaDetailView id={id} />],
  [/^\/projectos\/([^/]+)\/?$/, (id) => <ProjectDetailView id={id} initial={null} />],
  [/^\/noticias\/([^/]+)\/?$/, (id) => <NewsDetailView id={id} initial={null} />],
  [/^\/desafios\/([^/]+)\/?$/, (id) => <ChallengeDetailView id={id} initial={null} />],
];

export default function NotFound() {
  const [path, setPath] = React.useState<string | null>(null);
  React.useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    setPath(decodeURIComponent(location.pathname.replace(base, "") || "/"));
  }, []);
  if (path === null) return null;
  for (const [re, render] of ROUTES) {
    const m = path.match(re);
    if (m) return <>{render(m[1])}</>;
  }
  return (
    <div className="container-x py-24">
      <EmptyState icon={<Compass className="size-6" />} title={t("states.notFound")} hint={t("states.notFoundHint")} action={<Button asChild><Link href="/">{t("nav.home")}</Link></Button>} />
    </div>
  );
}
