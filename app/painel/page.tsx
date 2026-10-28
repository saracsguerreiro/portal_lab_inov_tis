import type { Metadata } from "next";
import { DashboardView } from "@/components/pages/dashboard";

export const metadata: Metadata = { title: "Painel de performance" };

// P30 Painel de performance
export default function DashboardPage() {
  return <DashboardView />;
}
