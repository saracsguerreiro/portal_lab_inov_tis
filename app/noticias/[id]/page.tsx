import type { Metadata } from "next";
import { publicCall, staticIds } from "@/lib/data/server";
import { NewsDetailView } from "@/components/pages/public-misc";

export const generateStaticParams = () => staticIds("contents");
const load = (id: string) => publicCall("getContent", { id }).catch(() => null);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: (await load((await params).id))?.title ?? "Notícia" };
}

// P11 Notícia ou evento
export default async function NewsItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NewsDetailView id={id} initial={await load(id)} />;
}
