import { publicCall } from "@/lib/data/server";
import { HomeView } from "@/components/pages/home";

// P01 Início
export default async function HomePage() {
  const [stats, projects, challenges, news, partners] = await Promise.all([
    publicCall("getPublicStats"),
    publicCall("listProjects"),
    publicCall("listChallenges"),
    publicCall("listContents", { kinds: ["NOTICIA", "EVENTO", "DEMO_DAY", "FORMACAO"] }),
    publicCall("listPartners"),
  ]);
  return (
    <HomeView
      stats={stats}
      featured={projects.filter((p) => p.featured).slice(0, 6)}
      challenges={challenges.filter((c) => c.status === "ABERTO").slice(0, 3)}
      news={news.slice(0, 3)}
      partners={partners}
    />
  );
}
