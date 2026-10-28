import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInView } from "@/components/pages/signin";

export const metadata: Metadata = { title: "Entrar" };

// P19 Entrar / Criar conta
export default function SignInPage() {
  return (
    <Suspense>
      <SignInView />
    </Suspense>
  );
}
