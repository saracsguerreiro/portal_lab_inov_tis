import type { Metadata } from "next";
import { MyIdeasView } from "@/components/pages/account";

export const metadata: Metadata = { title: "As minhas ideias" };

// P20 As minhas ideias
export default function MyIdeasPage() {
  return <MyIdeasView />;
}
