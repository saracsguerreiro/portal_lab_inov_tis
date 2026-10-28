import type { Metadata } from "next";
import { Suspense } from "react";
import { ExternalIdeaForm } from "@/components/pages/submit";

export const metadata: Metadata = { title: "Ideia de negócio" };

// P13 Formulário de ideia externa (F1)
export default function ExternalIdeaPage() {
  return (
    <Suspense>
      <ExternalIdeaForm />
    </Suspense>
  );
}
