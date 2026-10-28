"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { navigateWithTransition } from "@/lib/client/view-transition";

/** Ligação com transição de página (View Transitions API). Mantém o comportamento normal com modificadores. */
export function AppLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        if (href.startsWith("http") || href.startsWith("#")) return;
        e.preventDefault();
        navigateWithTransition((h) => router.push(h), href);
      }}
      {...props}
    />
  );
}
