import type { Metadata } from "next";
import { LegalView } from "@/components/pages/public-misc";

export const metadata: Metadata = { title: "Termos" };

// P16
export default function Page() {
  return <LegalView kind="TERMOS" />;
}
