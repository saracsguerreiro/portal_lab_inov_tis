import type { Metadata } from "next";
import { ImprovementIdeaForm } from "@/components/pages/submit";

export const metadata: Metadata = { title: "Ideia de melhoria" };

// P24 Formulário de ideia de melhoria (F2)
export default function ImprovementIdeaPage() {
  return <ImprovementIdeaForm />;
}
