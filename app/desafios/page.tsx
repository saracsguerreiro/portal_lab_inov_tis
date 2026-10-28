import type { Metadata } from "next";
import { publicCall } from "@/lib/data/server";
import { ChallengesView } from "@/components/pages/public-misc";

export const metadata: Metadata = { title: "Desafios" };

// P07 Desafios abertos
export default async function ChallengesPage() {
  return <ChallengesView initial={await publicCall("listChallenges")} />;
}
