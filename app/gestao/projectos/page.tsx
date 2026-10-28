import type { Metadata } from "next";
import { Suspense } from "react";
import { ManageProjectsView } from "@/components/pages/mgmt-projects";

export const metadata: Metadata = { title: "Projectos e ventures" };

// P32 Gestão de projectos e ventures
export default function ManageProjectsPage() {
  return (
    <Suspense>
      <ManageProjectsView />
    </Suspense>
  );
}
