import type { Metadata } from "next";
import { ContentsView } from "@/components/pages/mgmt-admin";

export const metadata: Metadata = { title: "Conteúdos" };

// P33
export default function Page() {
  return <ContentsView />;
}
