import type { Metadata } from "next";
import { SubmitChooser } from "@/components/pages/submit";

export const metadata: Metadata = { title: "Submeter ideia" };

// P12 Submeter ideia
export default function SubmitPage() {
  return <SubmitChooser />;
}
