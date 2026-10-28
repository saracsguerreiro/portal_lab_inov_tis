"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Building2, CheckCircle2, KeyRound, Mail, ScanLine, UserPlus, UserRound } from "lucide-react";
import { F4Schema, EXTERNAL_TYPES, type F4Input } from "@/lib/validation/forms";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { L } from "@/lib/domain/labels";
import { api, ApiError, IS_DEMO, mutate, session } from "@/lib/client/runtime";
import { useSession } from "@/lib/client/hooks";
import { Button, Card, Checkbox, ChoiceGroup, Field, Input } from "@/components/ui";
import { Captcha, PageHeader } from "@/components/domain";

type Mode = "choose" | "external" | "register" | "forgot" | "microsoft";

export function SignInView() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useSession();
  const [mode, setMode] = React.useState<Mode>("choose");
  const next = params?.get("depois") ?? "/conta/ideias";

  React.useEffect(() => {
    const token = params?.get("confirmar");
    if (token) mutate("verifyEmail", { token }).then(() => toast.success("Email confirmado. Já pode submeter ideias.")).catch((e) => toast.error((e as ApiError).message));
  }, [params]);

  if (user && mode === "choose") {
    return (
      <div className="container-x grid place-items-center py-24">
        <Card className="grid max-w-md gap-4 p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-ok" />
          <p className="font-display text-2xl font-bold">Já entrou como {user.name}</p>
          <p className="text-fg-muted">{L.role(user.role)}</p>
          <Button onClick={() => router.push(user.role === "GESTOR_LAB" || user.role === "GESTOR_INCUBADORA" ? "/gestao/triagem" : user.role === "COMISSAO_EXECUTIVA" ? "/painel" : next)}>Continuar</Button>
        </Card>
      </div>
    );
  }

  const done = (to = next) => router.push(to);
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.signIn") }]} eyebrow="P19" title="Entrar" lead="Escolha como quer entrar. Colaboradores e externos entram por caminhos diferentes." />
      <div className="container-x py-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={mode} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {mode === "choose" && <Choose setMode={setMode} />}
            {mode === "microsoft" && <MicrosoftDemo back={() => setMode("choose")} onDone={done} />}
            {mode === "external" && <ExternalLogin back={() => setMode("choose")} setMode={setMode} onDone={() => done()} />}
            {mode === "register" && <Register back={() => setMode("external")} />}
            {mode === "forgot" && <Forgot back={() => setMode("external")} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function Choose({ setMode }: { setMode: (m: Mode) => void }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="grid content-start gap-4 p-7">
        <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Building2 className="size-6" /></span>
        <h2 className="font-display text-2xl font-bold">{t("auth.collabTitle")}</h2>
        <p className="text-fg-muted">{t("auth.collabHint")} Gestores e Comissão Executiva entram pelo mesmo botão.</p>
        <Button
          size="lg"
          loading={loading}
          onClick={async () => {
            if (IS_DEMO) return setMode("microsoft");
            setLoading(true);
            await session.signInMicrosoft();
          }}
          className="mt-2 bg-[#2f2f2f] text-white hover:bg-black"
        >
          {!loading && <MicrosoftLogo />} {loading ? "A ligar à Microsoft…" : t("auth.microsoft")}
        </Button>
      </Card>
      <Card className="grid content-start gap-4 p-7">
        <span className="grid size-12 place-items-center rounded-xl bg-inc-soft text-inc-ink"><UserRound className="size-6" /></span>
        <h2 className="font-display text-2xl font-bold">{t("auth.externalTitle")}</h2>
        <p className="text-fg-muted">{t("auth.externalHint")}</p>
        <div className="mt-2 grid gap-2">
          <Button size="lg" variant="secondary" onClick={() => setMode("external")}><Mail /> Entrar com email</Button>
          <Button variant="ghost" onClick={() => setMode("register")}><UserPlus /> {t("auth.createAccount")}</Button>
        </div>
      </Card>
      <Card className="grid content-start gap-4 border-dashed bg-transparent p-7 shadow-none">
        <span className="grid size-12 place-items-center rounded-xl bg-surface-2 text-fg-muted"><ScanLine className="size-6" /></span>
        <h2 className="font-display text-2xl font-bold">{t("auth.noAccountTitle")}</h2>
        <p className="text-fg-muted">Submeta de forma anónima e acompanhe com um código.</p>
        <div className="mt-2 grid gap-2">
          <Button asChild size="lg" variant="secondary"><Link href="/submeter/externa">{t("auth.submitAnon")}</Link></Button>
          <Button asChild variant="ghost"><Link href="/estado">{t("auth.checkCode")}</Link></Button>
        </div>
      </Card>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="size-4" aria-hidden><rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" /><rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" /></svg>
  );
}

/** Demonstração: simula o single sign-on do Microsoft Entra ID com contas fictícias do domínio TIS. */
function MicrosoftDemo({ back, onDone }: { back: () => void; onDone: (to: string) => void }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const accounts = [
    { id: "u_colab", name: "Ana Domingos", role: "COLABORADOR", to: "/conta/ideias" },
    { id: "u_glab", name: "Bruno Mateus", role: "GESTOR_LAB", to: "/gestao/triagem" },
    { id: "u_ginc", name: "Carla Neto", role: "GESTOR_INCUBADORA", to: "/gestao/triagem" },
    { id: "u_ce", name: "Domingos Sebastião", role: "COMISSAO_EXECUTIVA", to: "/painel" },
  ];
  return (
    <Card className="mx-auto grid max-w-md gap-5 p-8">
      <button onClick={back} className="flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> {t("actions.back")}</button>
      <div className="flex items-center gap-2"><MicrosoftLogo /><span className="font-medium">Microsoft</span></div>
      <h2 className="font-display text-2xl font-bold">Escolha uma conta</h2>
      <p className="text-sm text-fg-muted">Demonstração do Entra ID, limitado ao domínio tis.example.</p>
      <ul className="grid gap-2">
        {accounts.map((a) => (
          <li key={a.id}>
            <button
              disabled={!!busy}
              onClick={async () => {
                setBusy(a.id);
                await new Promise((r) => setTimeout(r, 700));
                await session.signInMicrosoft(a.id);
                onDone(a.to);
              }}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-line p-3 text-left transition-colors hover:border-brand hover:bg-brand-soft disabled:opacity-60"
            >
              <span className="grid size-10 place-items-center rounded-full bg-surface-2 font-mono text-xs font-bold">{a.name.split(" ").map((x) => x[0]).join("")}</span>
              <span className="grid flex-1">
                <span className="font-medium">{a.name}</span>
                <span className="text-xs text-fg-subtle">{L.role(a.role)}</span>
              </span>
              {busy === a.id && <span className="size-5 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-label="A entrar" />}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ExternalLogin({ back, setMode, onDone }: { back: () => void; setMode: (m: Mode) => void; onDone: () => void }) {
  const [email, setEmail] = React.useState(IS_DEMO ? "eva@kitanda.example" : "");
  const [password, setPassword] = React.useState(IS_DEMO ? "Demo-2026-tis" : "");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <Card className="mx-auto grid max-w-md gap-5 p-8">
      <button onClick={back} className="flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> {t("actions.back")}</button>
      <h2 className="font-display text-2xl font-bold">{t("auth.externalTitle")}</h2>
      {IS_DEMO && <p className="rounded-[var(--radius-md)] bg-info-soft p-3 text-sm text-info">Conta de demonstração já preenchida (startup Kitanda Digital).</p>}
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await session.signInEmail(email, password);
            onDone();
          } catch (err) {
            setError((err as ApiError).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field id="l-email" label={t("auth.email")} required><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field id="l-pass" label={t("auth.password")} required error={error ?? undefined}><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Button type="submit" size="lg" loading={busy}>{t("auth.signIn")}</Button>
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <button onClick={() => setMode("register")} className="font-medium text-brand-ink hover:underline">{t("auth.createAccount")}</button>
        <button onClick={() => setMode("forgot")} className="text-fg-muted hover:underline">{t("auth.forgot")}</button>
      </div>
    </Card>
  );
}

function Register({ back }: { back: () => void }) {
  const [captcha, setCaptcha] = React.useState("");
  const [result, setResult] = React.useState<{ verifyToken: string } | null>(null);
  const form = useForm<F4Input>({ resolver: zodResolver(F4Schema), mode: "onTouched", defaultValues: { name: "", email: "", password: "", confirmPassword: "", acceptTerms: false as never, acceptPrivacy: false as never } });
  const { errors, isSubmitting } = form.formState;
  if (result) {
    return (
      <Card className="mx-auto grid max-w-md gap-4 p-8 text-center">
        <Mail className="mx-auto size-10 text-brand-ink" />
        <h2 className="font-display text-2xl font-bold">Confirme o seu email</h2>
        <p className="text-fg-muted">Enviámos uma ligação de confirmação. Sem confirmação, a conta não pode submeter ideias.</p>
        {IS_DEMO && (
          <Button onClick={async () => {
            await mutate("verifyEmail", { token: result.verifyToken });
            await session.viewAs(result.verifyToken.split(".")[0]);
            toast.success("Email confirmado (demonstração).");
          }}>Abrir a ligação de confirmação (demo)</Button>
        )}
      </Card>
    );
  }
  return (
    <Card className="mx-auto grid max-w-xl gap-5 p-8">
      <button onClick={back} className="flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> {t("actions.back")}</button>
      <h2 className="font-display text-2xl font-bold">{t("auth.createAccount")}</h2>
      <form
        noValidate
        className="grid gap-4"
        onSubmit={form.handleSubmit(async (v) => {
          try {
            const r = await api("registerExternal", { ...v, captchaToken: captcha });
            setResult(r);
          } catch (e) {
            toast.error((e as ApiError).message);
          }
        })}
      >
        <Field id="r-name" label="Nome" required error={errors.name?.message}><Input autoComplete="name" {...form.register("name")} /></Field>
        <Field id="r-email" label={t("auth.email")} required error={errors.email?.message}><Input type="email" autoComplete="email" {...form.register("email")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="r-pass" label={t("auth.password")} hint="Pelo menos 10 caracteres." required error={errors.password?.message}><Input type="password" autoComplete="new-password" {...form.register("password")} /></Field>
          <Field id="r-pass2" label={t("auth.confirmPassword")} required error={errors.confirmPassword?.message}><Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} /></Field>
        </div>
        <div className="grid gap-2">
          <p id="r-type-l" className="text-sm font-medium">Tipo de perfil <span className="text-danger">*</span></p>
          <ChoiceGroup labelledBy="r-type-l" name="profileType" value={form.watch("profileType")} onChange={(v) => form.setValue("profileType", v as F4Input["profileType"], { shouldValidate: true })} options={EXTERNAL_TYPES.map((x) => ({ value: x, label: L.extType(x) }))} invalid={!!errors.profileType} />
          {errors.profileType && <p role="alert" className="text-sm text-danger">{errors.profileType.message}</p>}
        </div>
        <Checkbox id="r-terms" checked={!!form.watch("acceptTerms")} onCheckedChange={(v) => form.setValue("acceptTerms", v as true, { shouldValidate: true })} invalid={!!errors.acceptTerms} label={<>Aceito os <Link href="/termos" target="_blank" className="underline">termos</Link></>} />
        <Checkbox id="r-priv" checked={!!form.watch("acceptPrivacy")} onCheckedChange={(v) => form.setValue("acceptPrivacy", v as true, { shouldValidate: true })} invalid={!!errors.acceptPrivacy} label={<>Aceito a <Link href="/privacidade" target="_blank" className="underline">política de privacidade</Link></>} />
        {(errors.acceptTerms || errors.acceptPrivacy) && <p role="alert" className="text-sm text-danger">{errors.acceptTerms?.message ?? errors.acceptPrivacy?.message}</p>}
        <Captcha onToken={setCaptcha} />
        <Button type="submit" size="lg" loading={isSubmitting} disabled={!captcha}>{t("auth.createAccount")}</Button>
      </form>
    </Card>
  );
}

function Forgot({ back }: { back: () => void }) {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  return (
    <Card className="mx-auto grid max-w-md gap-5 p-8">
      <button onClick={back} className="flex w-fit items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> {t("actions.back")}</button>
      <KeyRound className="size-8 text-brand-ink" />
      <h2 className="font-display text-2xl font-bold">{t("auth.forgot")}</h2>
      {sent ? <p className={cn("rounded-[var(--radius-md)] bg-ok-soft p-3 text-sm text-ok")}>Se existir uma conta com este email, enviámos uma ligação para definir uma nova palavra-passe.</p> : (
        <form className="grid gap-4" onSubmit={async (e) => { e.preventDefault(); await api("requestPasswordReset", { email }).catch(() => {}); setSent(true); }}>
          <Field id="f-email" label={t("auth.email")} required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button type="submit">{t("actions.send")}</Button>
        </form>
      )}
    </Card>
  );
}
