import type { Metadata } from "next";
import { CriteriaView } from "@/components/pages/mgmt-admin";

export const metadata: Metadata = { title: "Critérios da IA" };

// P34
export default function Page() {
  return <CriteriaView />;
}
