import type { Metadata } from "next";
import { publicCall, staticIds } from "@/lib/data/server";
import { ProjectDetailView } from "@/components/pages/projects";

export const generateStaticParams = () => staticIds("projects");

async function load(id: string) {
  // Versão pública (visitante). Projectos internos e restritos carregam no browser, com login.
  return publicCall("getProject", { id }).catch(() => null);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await load((await params).id);
  return { title: p?.card.name ?? "Projecto", description: p?.card.shortDescription };
}

// P06 Ficha do projecto
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailView id={id} initial={await load(id)} />;
}
