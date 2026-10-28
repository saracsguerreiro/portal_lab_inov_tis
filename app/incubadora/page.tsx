import type { Metadata } from "next";
import { publicCall } from "@/lib/data/server";
import { IncubatorView } from "@/components/pages/lab-incubator";

export const metadata: Metadata = { title: "A Incubadora" };

// P04 A Incubadora
export default async function IncubatorPage() {
  const [projects, highlights] = await Promise.all([publicCall("listProjects"), publicCall("listContents", { kinds: ["DESTAQUE"] })]);
  return <IncubatorView projects={projects} cases={highlights.filter((c) => c.meta?.cohort)} />;
}
