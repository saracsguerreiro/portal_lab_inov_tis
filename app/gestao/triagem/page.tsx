import type { Metadata } from "next";
import { Suspense } from "react";
import { TriageView } from "@/components/pages/triage";

export const metadata: Metadata = { title: "Triagem" };

// P31 Fila de triagem
export default function TriagePage() {
  return (
    <Suspense>
      <TriageView />
    </Suspense>
  );
}
