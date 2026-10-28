import type { Metadata } from "next";
import { EcosystemView } from "@/components/pages/ecosystem";

export const metadata: Metadata = { title: "O Ecossistema" };

// P02 O Ecossistema
export default function EcosystemPage() {
  return <EcosystemView />;
}
