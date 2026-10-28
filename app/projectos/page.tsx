import type { Metadata } from "next";
import { Suspense } from "react";
import { publicCall } from "@/lib/data/server";
import { ProjectsView } from "@/components/pages/projects";
import { CardGridSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Projectos" };

// P05 Projectos (montra)
export default async function ProjectsPage() {
  const projects = await publicCall("listProjects");
  return (
    <Suspense fallback={<div className="container-x py-16"><CardGridSkeleton /></div>}>
      <ProjectsView initial={projects} />
    </Suspense>
  );
}
