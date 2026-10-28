import type { Metadata } from "next";
import { staticIds } from "@/lib/data/server";
import { MyIdeaDetailView } from "@/components/pages/account";

export const metadata: Metadata = { title: "A minha ideia" };
export const generateStaticParams = () => staticIds("ideas");

// P21 Detalhe da minha ideia (conteúdo carregado no browser, só para o autor)
export default async function MyIdeaPage({ params }: { params: Promise<{ id: string }> }) {
  return <MyIdeaDetailView id={(await params).id} />;
}
