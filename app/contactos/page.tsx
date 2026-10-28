import type { Metadata } from "next";
import { ContactView } from "@/components/pages/public-misc";

export const metadata: Metadata = { title: "Contactos" };

// P18 Contactos
export default function ContactPage() {
  return <ContactView />;
}
