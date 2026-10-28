import type { Metadata } from "next";
import { publicCall } from "@/lib/data/server";
import { NewsView } from "@/components/pages/public-misc";

export const metadata: Metadata = { title: "Notícias e eventos" };

// P10 Notícias e eventos
export default async function NewsPage() {
  return <NewsView initial={await publicCall("listContents", { kinds: ["NOTICIA", "EVENTO", "DEMO_DAY", "FORMACAO"] })} />;
}
