import type { Metadata } from "next";
import { CommunicationView } from "@/components/pages/mgmt-admin";

export const metadata: Metadata = { title: "Comunicação" };

// P35
export default function Page() {
  return <CommunicationView />;
}
