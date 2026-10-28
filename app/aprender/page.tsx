import type { Metadata } from "next";
import { LearnView } from "@/components/pages/collaborator";

export const metadata: Metadata = { title: "Aprender" };

// P28
export default function Page() {
  return <LearnView />;
}
