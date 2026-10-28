import type { Metadata } from "next";
import { publicCall } from "@/lib/data/server";
import { PartnersView } from "@/components/pages/public-misc";

export const metadata: Metadata = { title: "Parcerias" };

// P09 Parcerias
export default async function PartnersPage() {
  return <PartnersView initial={await publicCall("listPartners")} />;
}
