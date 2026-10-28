import type { Metadata } from "next";
import { UsersView } from "@/components/pages/mgmt-admin";

export const metadata: Metadata = { title: "Utilizadores e configurações" };

// P36
export default function Page() {
  return <UsersView />;
}
