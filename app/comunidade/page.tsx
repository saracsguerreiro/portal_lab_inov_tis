import type { Metadata } from "next";
import { CommunityView } from "@/components/pages/collaborator";

export const metadata: Metadata = { title: "Comunidade" };

// P29
export default function Page() {
  return <CommunityView />;
}
