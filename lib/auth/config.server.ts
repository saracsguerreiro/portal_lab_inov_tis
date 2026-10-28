// Auth.js (modo completo): Microsoft Entra ID para colaboradores (limitado ao domínio TIS)
// e email + palavra-passe para externos. Só é incluído no build completo (*.server.ts).
import NextAuth, { type NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { serverCtx } from "@/lib/data/server";
import { upsertMicrosoftUser, verifyCredentials } from "@/lib/services/account";
import type { User } from "@/lib/domain/types";

const TIS_DOMAIN = process.env.TIS_EMAIL_DOMAIN ?? "tis.co.ao";

class LockedError extends CredentialsSignin {
  code = "LOCKED";
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/entrar" },
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      // Inquilino da TIS: só contas da organização.
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
      authorization: { params: { scope: "openid profile email User.Read" } },
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        try {
          const ctx = await serverCtx();
          const u = await verifyCredentials(ctx, { email: String(raw.email ?? ""), password: String(raw.password ?? "") });
          return { id: u.id, email: u.email, name: u.name };
        } catch (e) {
          if ((e as { code?: string }).code === "LOCKED") throw new LockedError();
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "microsoft-entra-id") return true;
      const email = String(profile?.email ?? (profile as { preferred_username?: string })?.preferred_username ?? "").toLowerCase();
      if (!email.endsWith(`@${TIS_DOMAIN}`)) return false; // limitado ao domínio TIS
      const ctx = await serverCtx();
      await upsertMicrosoftUser(ctx, { email, name: String(profile?.name ?? email), department: (profile as { department?: string })?.department }, TIS_DOMAIN);
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "microsoft-entra-id") {
        const email = String(profile?.email ?? (profile as { preferred_username?: string })?.preferred_username ?? "").toLowerCase();
        const ctx = await serverCtx();
        const u = (await ctx.repo.all("users")).find((x) => x.email === email);
        token.uid = u?.id;
      } else if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      (session as unknown as { uid?: string }).uid = token.uid as string | undefined;
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/** Utilizador da sessão actual, lido sempre da base de dados (perfil e estado actualizados). */
export async function currentUser(): Promise<User | null> {
  const s = (await auth()) as unknown as { uid?: string } | null;
  if (!s?.uid) return null;
  const ctx = await serverCtx();
  const u = await ctx.repo.get("users", s.uid);
  return u && u.status === "ACTIVO" ? u : null;
}
