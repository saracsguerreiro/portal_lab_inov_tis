import type { Metadata } from "next";
import { ConfirmationView } from "@/components/pages/submit";

export const metadata: Metadata = { title: "Ideia submetida" };

// P14 Confirmação de submissão
export default function ConfirmationPage() {
  return <ConfirmationView />;
}
