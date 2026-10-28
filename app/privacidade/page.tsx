import type { Metadata } from "next";
import { LegalView } from "@/components/pages/public-misc";

export const metadata: Metadata = { title: "Privacidade" };

// P17
export default function Page() {
  return <LegalView kind="PRIVACIDADE" />;
}
