import type { Metadata } from "next";
import { InternalIdeasView } from "@/components/pages/collaborator";

export const metadata: Metadata = { title: "Ideias internas" };

// P25 Explorar ideias internas
export default function InternalIdeasPage() {
  return <InternalIdeasView />;
}
