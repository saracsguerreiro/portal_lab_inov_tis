import type { Metadata } from "next";
import { publicCall, staticIds } from "@/lib/data/server";
import { ChallengeDetailView } from "@/components/pages/public-misc";

export const generateStaticParams = () => staticIds("challenges");
const load = (id: string) => publicCall("getChallenge", { id }).catch(() => null);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: (await load((await params).id))?.title ?? "Desafio" };
}

// P08 Ficha do desafio
export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChallengeDetailView id={id} initial={await load(id)} />;
}
