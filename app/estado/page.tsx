import type { Metadata } from "next";
import { StatusView } from "@/components/pages/submit";

export const metadata: Metadata = { title: "Consultar estado" };

// P15 Consultar estado
export default function StatusPage() {
  return <StatusView />;
}
