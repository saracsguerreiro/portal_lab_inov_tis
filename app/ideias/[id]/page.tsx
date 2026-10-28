import type { Metadata } from "next";
import { staticIds } from "@/lib/data/server";
import { InternalIdeaDetailView } from "@/components/pages/collaborator";

export const metadata: Metadata = { title: "Ideia interna" };
export const generateStaticParams = () => staticIds("ideas");

// P26 Ficha da ideia interna
export default async function InternalIdeaPage({ params }: { params: Promise<{ id: string }> }) {
  return <InternalIdeaDetailView id={(await params).id} />;
}
