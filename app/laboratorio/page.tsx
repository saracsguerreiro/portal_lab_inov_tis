import type { Metadata } from "next";
import { publicCall } from "@/lib/data/server";
import { LabView } from "@/components/pages/lab-incubator";

export const metadata: Metadata = { title: "O Laboratório" };

// P03 O Laboratório
export default async function LabPage() {
  const [projects, team, partners] = await Promise.all([
    publicCall("listProjects"),
    publicCall("listContents", { kinds: ["EQUIPA"] }),
    publicCall("listPartners"),
  ]);
  return <LabView projects={projects} team={team} partners={partners} />;
}
