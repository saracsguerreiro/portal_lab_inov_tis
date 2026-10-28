import type { Metadata } from "next";
import { ProfileView } from "@/components/pages/account";

export const metadata: Metadata = { title: "O meu perfil" };

// P23 O meu perfil
export default function ProfilePage() {
  return <ProfileView />;
}
