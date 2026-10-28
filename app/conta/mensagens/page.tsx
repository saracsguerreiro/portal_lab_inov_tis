import type { Metadata } from "next";
import { MessagesView } from "@/components/pages/account";

export const metadata: Metadata = { title: "Mensagens" };

// P22 Mensagens
export default function MessagesPage() {
  return <MessagesView />;
}
