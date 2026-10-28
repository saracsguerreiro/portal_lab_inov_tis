import type { Metadata } from "next";
import { SupportView } from "@/components/pages/collaborator";

export const metadata: Metadata = { title: "Pedidos de apoio" };

// P27
export default function Page() {
  return <SupportView />;
}
