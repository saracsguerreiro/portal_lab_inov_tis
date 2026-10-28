"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Building2, Check, Copy, Download, EyeOff, FileSearch, Lightbulb, Lock, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import {
  AFFECTED, AUDIENCES, CATEGORIES, EXTERNAL_TYPES, F1Step1, F1Step2, F1Step3, F1Step4, F2Step1, F2Step2, F2Step3, F2Step4, FREQUENCIES, IMPACTS, LEVELS, LOOKING_FOR, STAGES,
  type F1Input, type F2Input,
} from "@/lib/validation/forms";
import { t, fmtDate } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { L } from "@/lib/domain/labels";
import { useQuery, useSession, useDraft, readDraft, clearDraft } from "@/lib/client/hooks";
import { ApiError, mutate } from "@/lib/client/runtime";
import { canSubmitImprovementIdea, roleOf } from "@/lib/permissions";
import type { Attachment } from "@/lib/domain/types";
import { Button, Card, Checkbox, ChoiceGroup, EmptyState, Field, Input, Select, Switch, Textarea } from "@/components/ui";
import { Captcha, FileDrop, IdeaTimeline, PageHeader, RequirePage, StatusTag } from "@/components/domain";
import { Wizard, ReviewList, celebrate, CharCount, type WizardStep } from "@/components/forms/wizard";
import { AppLink } from "@/components/layout/app-link";
import { PopIn, Reveal } from "@/components/motion";

const LABEL = {
  audience: { EMPRESAS: "Empresas", SECTOR_PUBLICO: "Sector público", CIDADAOS: "Cidadãos", OUTRO: "Outro" },
  stage: { IDEIA: "Só ideia", PROTOTIPO: "Protótipo", TESTE: "Produto em teste", CLIENTES: "Já com clientes" },
  lookingFor: { PARCERIA: "Parceria", CLIENTES: "Clientes", TECNOLOGIA: "Tecnologia", INVESTIMENTO: "Investimento", MENTORIA: "Mentoria", OUTRO: "Outro" },
  category: { PROCESSOS: "Processos", FERRAMENTAS: "Ferramentas e sistemas", SERVICO_CLIENTE: "Serviço ao cliente", FORMA_TRABALHAR: "Forma de trabalhar", PESSOAS_CULTURA: "Pessoas e cultura", OUTRO: "Outro" },
  frequency: { DIARIAMENTE: "Diariamente", SEMANALMENTE: "Semanalmente", MENSALMENTE: "Mensalmente", RARAMENTE: "Raramente" },
  affected: { MINHA_EQUIPA: "A minha equipa", OUTRAS_AREAS: "Outras áreas", CLIENTES: "Clientes", TODA_TIS: "Toda a TIS" },
  impact: { TEMPO: "Poupa tempo", CUSTOS: "Reduz custos", QUALIDADE: "Melhora a qualidade", EXPERIENCIA_CLIENTE: "Melhora a experiência do cliente", RISCO: "Reduz risco" },
  level: { BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta" },
} as const;
const opts = <K extends string>(values: readonly K[], labels: Record<K, string>) => values.map((v) => ({ value: v, label: labels[v] }));
const RESULT_KEY = "eco-submit-result";

/** Validação de um passo com o esquema Zod desse passo; os erros aparecem junto dos campos. */
function validateStep<T extends FieldValues>(form: UseFormReturn<T>, schema: z.ZodTypeAny, extra?: (v: T) => { path: string; message: string }[]) {
  const values = form.getValues();
  const res = schema.safeParse(values);
  const issues = [...(res.success ? [] : res.error.issues.map((i) => ({ path: String(i.path[0]), message: i.message }))), ...(extra?.(values) ?? [])];
  const inner = (schema as unknown as { _def: { schema?: { shape?: object } } })._def.schema ?? schema;
  const fields = Object.keys((inner as unknown as { shape?: object }).shape ?? {});
  fields.forEach((f) => form.clearErrors(f as Path<T>));
  issues.forEach((i) => form.setError(i.path as Path<T>, { message: i.message }));
  if (issues.length) {
    setTimeout(() => (document.querySelector("[aria-invalid=true]") as HTMLElement | null)?.focus(), 50);
    return false;
  }
  return true;
}

// =============================================================== P12 Submeter ideia (escolha)

export function SubmitChooser() {
  const { actor, ready } = useSession();
  const { data: s } = useQuery("getPublicSettings");
  const role = roleOf(actor);
  const managers = role === "GESTOR_LAB" || role === "GESTOR_INCUBADORA" || role === "COMISSAO_EXECUTIVA";
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.submit") }]} eyebrow="P12" title={t("submit.title")} lead={t("submit.lead")} />
      <div className="container-x grid gap-8 py-12">
        {ready && managers && <p className="rounded-[var(--radius-md)] bg-warn-soft p-4 text-sm text-warn">Os gestores e a Comissão Executiva não submetem ideias nesta plataforma (matriz de permissões). Use «Ver como» para experimentar outro perfil.</p>}
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { href: "/submeter/externa", icon: Rocket, title: t("submit.business"), hint: t("submit.businessHint"), tone: "inc", locked: false },
            { href: "/submeter/melhoria", icon: Lightbulb, title: t("submit.improve"), hint: t("submit.improveHint"), tone: "lab", locked: role !== "COLABORADOR" },
          ].map((c, i) => (
            <Reveal key={c.href} delay={i * 0.08}>
              <AppLink href={c.locked && role === "VISITANTE" ? "/entrar?depois=/submeter/melhoria" : c.href} className={cn("group relative flex h-full min-h-72 flex-col justify-between overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface p-8 shadow-1 transition-[transform,box-shadow] duration-[var(--dur-base)] hover:-translate-y-1", c.tone === "lab" ? "hover:shadow-[var(--glow-lab)]" : "hover:shadow-[var(--glow-inc)]")}>
                <div className={cn("pointer-events-none absolute -right-16 -top-16 size-56 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125", c.tone === "lab" ? "bg-lab/20" : "bg-inc/20")} aria-hidden />
                <span className={cn("relative grid size-14 place-items-center rounded-2xl", c.tone === "lab" ? "bg-lab-soft text-lab-ink" : "bg-inc-soft text-inc-ink")}><c.icon className="size-7" aria-hidden /></span>
                <div className="relative grid gap-3">
                  <h2 className="text-balance font-display text-2xl font-bold">{c.title}</h2>
                  <p className="text-fg-muted">{c.hint}</p>
                  <span className={cn("flex items-center gap-1.5 font-medium", c.tone === "lab" ? "text-lab-ink" : "text-inc-ink")}>
                    {c.locked ? <><Lock className="size-4" /> {role === "VISITANTE" ? "Entrar com Microsoft" : "Só para colaboradores"}</> : <>Começar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></>}
                  </span>
                </div>
              </AppLink>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-fg-muted">
          {t("submit.deadline", { days: s?.responseDeadlineDays ?? 10 })} · <Link href="/termos" className="font-medium text-brand-ink underline-offset-4 hover:underline">{t("submit.termsLink")}</Link>
        </p>
      </div>
    </>
  );
}

// =============================================================== P13 Formulário de ideia externa (F1)

type F1Form = Omit<F1Input, "acceptTerms" | "acceptPrivacy" | "confirmNoThirdParty"> & { acceptTerms: boolean; acceptPrivacy: boolean; confirmNoThirdParty: boolean };
const F1_DRAFT = "eco-draft-f1";

export function ExternalIdeaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, actor, ready } = useSession();
  const role = roleOf(actor);
  const { data: challenges = [] } = useQuery("listChallenges");
  const { data: s } = useQuery("getPublicSettings");
  const [step, setStep] = React.useState(0);
  const [captcha, setCaptcha] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const anonymousOnly = role === "VISITANTE";
  const form = useForm<F1Form>({
    defaultValues: {
      submitAs: "ANONIMO", profileType: (params?.get("tipo") as F1Form["profileType"]) ?? undefined, organization: "", notifyEmail: "",
      title: "", summary: "", challengeId: params?.get("desafio") ?? null, problem: "", solution: "", audience: [], sector: "", differentiation: "",
      stage: undefined, customers: undefined, businessModel: "", team: "", lookingFor: [], attachments: [], links: "",
      acceptTerms: false, acceptPrivacy: false, confirmNoThirdParty: false,
    },
  });
  // Rascunho automático; com conta, preenche o passo 1 com os dados do perfil.
  React.useEffect(() => {
    if (!ready) return;
    const draft = readDraft<F1Form>(F1_DRAFT);
    if (draft) form.reset({ ...form.getValues(), ...draft, acceptTerms: false, acceptPrivacy: false, confirmNoThirdParty: false });
    if (user) {
      form.setValue("submitAs", draft?.submitAs ?? "CONTA");
      if (user.external?.type) form.setValue("profileType", user.external.type);
      else if (user.role === "COLABORADOR" && !form.getValues("profileType")) form.setValue("profileType", "INDIVIDUAL");
      if (user.external?.organization && !form.getValues("organization")) form.setValue("organization", user.external.organization);
    }
    const tipo = params?.get("tipo");
    if (tipo) form.setValue("profileType", tipo as F1Form["profileType"]);
    const des = params?.get("desafio");
    if (des) form.setValue("challengeId", des);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id]);
  const values = form.watch();
  const savedAt = useDraft(F1_DRAFT, { ...values, captchaToken: undefined }, ready);
  const e = form.formState.errors;
  const anon = values.submitAs === "ANONIMO" || anonymousOnly;

  if (ready && !["VISITANTE", "EXTERNO", "COLABORADOR"].includes(role)) return <RequirePage page="P13">{null}</RequirePage>;
  if (ready && user?.role === "EXTERNO" && !user.emailVerifiedAt) return <div className="container-x py-20"><EmptyState title={t("auth.unverified")} hint="Abra a ligação que enviámos para o seu email." /></div>;

  const steps: WizardStep[] = [
    { key: "sobre", title: "Sobre si", hint: anonymousOnly ? "Sem conta, a ideia é anónima. Recebe um código para acompanhar." : user ? "Vem preenchido a partir do seu perfil." : undefined },
    { key: "ideia", title: "A ideia", hint: "Explique o problema e a solução com as suas palavras." },
    { key: "maturidade", title: "Maturidade e equipa" },
    { key: "anexos", title: "Anexos e termos" },
    { key: "rever", title: t("forms.review"), hint: t("forms.reviewHint") },
  ];

  const next = async () => {
    const v = form.getValues();
    const checks = [
      () => validateStep(form, F1Step1._def.schema, (x) => (!anon && x.profileType !== "INDIVIDUAL" && !x.organization ? [{ path: "organization", message: "Indique o nome da organização ou startup." }] : [])),
      () => validateStep(form, F1Step2),
      () => validateStep(form, F1Step3, (x) => [
        ...(x.stage === "CLIENTES" && (x.customers === undefined || String(x.customers) === "") ? [{ path: "customers", message: "Indique quantos clientes ou utilizadores tem." }] : []),
        ...(x.profileType === "STARTUP" && !x.team?.trim() ? [{ path: "team", message: "Para startups, descreva a equipa." }] : []),
      ]),
      () => validateStep(form, F1Step4),
    ];
    if (step < 4) {
      if (!checks[step]()) return;
      return setStep(step + 1);
    }
    if (anon && !user && !captcha) return toast.error(t("forms.captchaHint"));
    setBusy(true);
    try {
      const payload = { ...v, submitAs: anon ? "ANONIMO" : "CONTA", customers: v.customers === undefined || String(v.customers) === "" ? undefined : Number(v.customers), captchaToken: captcha } as F1Input;
      const res = await mutate("submitExternalIdea", payload);
      clearDraft(F1_DRAFT);
      sessionStorage.setItem(RESULT_KEY, JSON.stringify({ ...res, title: v.title, at: new Date().toISOString(), deadline: s?.responseDeadlineDays ?? 10 }));
      router.push("/submeter/confirmacao");
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const reg = form.register;
  return (
    <>
      <PageHeader tone="inc" crumbs={[{ href: "/submeter", label: t("nav.submit") }, { label: "Ideia de negócio" }]} eyebrow="P13 · F1" title="Ideia de negócio, produto ou solução" lead={role === "COLABORADOR" ? "Como colaborador, a ideia fica marcada «Origem: colaborador TIS» e entra primeiro na triagem do Lab." : "Funciona sem conta (anónimo) ou com a sua conta externa."} />
      <div className="container-x max-w-3xl py-10">
        <Wizard steps={steps} current={step} onBack={() => setStep(Math.max(0, step - 1))} onNext={next} savedAt={savedAt} busy={busy} nextDisabled={step === 4 && anon && !user && !captcha}>
          {step === 0 && (
            <div className="grid gap-6">
              {!anonymousOnly ? (
                <div className="grid gap-2">
                  <p id="f1-as" className="text-sm font-medium">Submeter como <span className="text-danger">*</span></p>
                  <ChoiceGroup labelledBy="f1-as" name="submitAs" value={values.submitAs} onChange={(v) => form.setValue("submitAs", v as F1Form["submitAs"])} options={[{ value: "CONTA", label: "Com a minha conta", hint: "Acompanha em «As minhas ideias»." }, { value: "ANONIMO", label: "Anónimo", hint: role === "COLABORADOR" ? "O seu nome não aparece a ninguém." : "Sem nome nem organização." }]} />
                </div>
              ) : (
                <div className="flex gap-3 rounded-[var(--radius-md)] bg-surface-2 p-4 text-sm">
                  <EyeOff className="size-5 shrink-0 text-fg-muted" />
                  <p>Vai submeter de forma <strong>anónima</strong>. Prefere acompanhar com conta? <Link href="/entrar" className="font-medium text-brand-ink underline">Criar conta</Link>.</p>
                </div>
              )}
              <div className="grid gap-2">
                <p id="f1-type" className="text-sm font-medium">Tipo de perfil <span className="text-danger">*</span></p>
                <ChoiceGroup labelledBy="f1-type" name="profileType" value={values.profileType} onChange={(v) => form.setValue("profileType", v as F1Form["profileType"], { shouldValidate: false })} options={opts(EXTERNAL_TYPES, { STARTUP: L.extType("STARTUP"), UNIVERSIDADE: L.extType("UNIVERSIDADE"), INDIVIDUAL: L.extType("INDIVIDUAL"), OUTRA: L.extType("OUTRA") })} invalid={!!e.profileType} />
                {e.profileType && <p role="alert" className="text-sm text-danger">{e.profileType.message}</p>}
              </div>
              {!anon && values.profileType !== "INDIVIDUAL" && (
                <Field id="f1-org" label="Nome da organização ou startup" required error={e.organization?.message}><Input {...reg("organization")} /></Field>
              )}
              {anon && !user && (
                <Field id="f1-email" label="Email para notificações" hint="Opcional. Não cria conta e não é mostrado à equipa." error={e.notifyEmail?.message}><Input type="email" autoComplete="email" {...reg("notifyEmail")} /></Field>
              )}
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-5">
              <Field id="f1-title" label={<span className="flex w-full justify-between">Título <CharCount value={values.title} max={80} /></span>} required error={e.title?.message}><Input maxLength={90} {...reg("title")} /></Field>
              <Field id="f1-sum" label={<span className="flex w-full justify-between">Resumo numa frase <CharCount value={values.summary} max={200} /></span>} hint="Usado nos cartões." required error={e.summary?.message}><Input maxLength={220} {...reg("summary")} /></Field>
              <Field id="f1-ch" label="Desafio associado" error={e.challengeId?.message}>
                <Select value={values.challengeId ?? ""} onChange={(ev) => form.setValue("challengeId", ev.target.value || null)}>
                  <option value="">Nenhum</option>
                  {challenges.filter((c) => c.status === "ABERTO").map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </Select>
              </Field>
              <Field id="f1-prob" label="Problema que resolve" hint="Para quem é o problema e porque importa." required error={e.problem?.message}><Textarea rows={5} {...reg("problem")} /></Field>
              <Field id="f1-sol" label="Solução proposta" required error={e.solution?.message}><Textarea rows={5} {...reg("solution")} /></Field>
              <div className="grid gap-2">
                <p id="f1-aud" className="text-sm font-medium">A quem serve <span className="text-danger">*</span></p>
                <ChoiceGroup multiple labelledBy="f1-aud" name="audience" value={values.audience} onChange={(v) => form.setValue("audience", v as F1Form["audience"])} options={opts(AUDIENCES, LABEL.audience)} invalid={!!e.audience} />
                {e.audience && <p role="alert" className="text-sm text-danger">{e.audience.message}</p>}
              </div>
              <Field id="f1-sec" label="Sector" required error={e.sector?.message}>
                <Select value={values.sector} onChange={(ev) => form.setValue("sector", ev.target.value)}>
                  <option value="">Escolha…</option>
                  {(s?.sectors ?? []).map((x) => <option key={x} value={x}>{x}</option>)}
                </Select>
              </Field>
              <Field id="f1-dif" label="O que torna a ideia diferente" required error={e.differentiation?.message}><Textarea rows={4} {...reg("differentiation")} /></Field>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-5">
              <div className="grid gap-2">
                <p id="f1-stage" className="text-sm font-medium">Fase actual <span className="text-danger">*</span></p>
                <ChoiceGroup labelledBy="f1-stage" name="stage" columns={4} value={values.stage} onChange={(v) => form.setValue("stage", v as F1Form["stage"])} options={opts(STAGES, LABEL.stage)} invalid={!!e.stage} />
                {e.stage && <p role="alert" className="text-sm text-danger">{e.stage.message}</p>}
              </div>
              {values.stage === "CLIENTES" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <Field id="f1-cust" label="Clientes ou utilizadores actuais" required error={e.customers?.message}><Input type="number" min={0} inputMode="numeric" {...reg("customers")} /></Field>
                </motion.div>
              )}
              <Field id="f1-bm" label="Modelo de negócio" hint="Como gera receita." error={e.businessModel?.message}><Textarea rows={3} {...reg("businessModel")} /></Field>
              <Field id="f1-team" label="Equipa" hint="Pessoas e competências." required={values.profileType === "STARTUP"} error={e.team?.message}><Textarea rows={3} {...reg("team")} /></Field>
              <div className="grid gap-2">
                <p id="f1-look" className="text-sm font-medium">O que procura na TIS <span className="text-danger">*</span></p>
                <ChoiceGroup multiple columns={3} labelledBy="f1-look" name="lookingFor" value={values.lookingFor} onChange={(v) => form.setValue("lookingFor", v as F1Form["lookingFor"])} options={opts(LOOKING_FOR, LABEL.lookingFor)} invalid={!!e.lookingFor} />
                {e.lookingFor && <p role="alert" className="text-sm text-danger">{e.lookingFor.message}</p>}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-5">
              <div className="grid gap-2"><p className="text-sm font-medium">Anexos <span className="font-normal text-fg-subtle">(opcional · pitch deck, imagens)</span></p><FileDrop value={values.attachments as Attachment[]} onChange={(v) => form.setValue("attachments", v as never)} /></div>
              <Field id="f1-links" label="Ligações" hint="Site ou vídeo (https://…)." error={e.links?.message}><Input type="url" placeholder="https://" {...reg("links")} /></Field>
              <p className="rounded-[var(--radius-md)] bg-warn-soft p-3 text-sm text-warn">{t("forms.noClientData")}</p>
              <div className="grid gap-3">
                <Checkbox id="f1-t" checked={values.acceptTerms} onCheckedChange={(v) => form.setValue("acceptTerms", v)} invalid={!!e.acceptTerms} label={<>Aceito os <Link href="/termos" target="_blank" className="underline">termos de submissão e propriedade intelectual</Link> (versão {s?.termsVersion ?? "2026.1"})</>} />
                <Checkbox id="f1-p" checked={values.acceptPrivacy} onCheckedChange={(v) => form.setValue("acceptPrivacy", v)} invalid={!!e.acceptPrivacy} label={<>Aceito a <Link href="/privacidade" target="_blank" className="underline">política de privacidade</Link></>} />
                <Checkbox id="f1-c" checked={values.confirmNoThirdParty} onCheckedChange={(v) => form.setValue("confirmNoThirdParty", v)} invalid={!!e.confirmNoThirdParty} label="Confirmo que não incluo dados pessoais de terceiros nem informação confidencial de clientes" />
                {(e.acceptTerms || e.acceptPrivacy || e.confirmNoThirdParty) && <p role="alert" className="text-sm text-danger">{e.acceptTerms?.message ?? e.acceptPrivacy?.message ?? e.confirmNoThirdParty?.message}</p>}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="grid gap-5">
              <ReviewList onEdit={setStep} items={[
                { step: 0, label: "Submeter como", value: anon ? "Anónimo" : "Com a minha conta" },
                { step: 0, label: "Tipo de perfil", value: values.profileType ? L.extType(values.profileType) : "" },
                { step: 1, label: "Título", value: values.title },
                { step: 1, label: "Resumo", value: values.summary },
                { step: 1, label: "Problema", value: values.problem },
                { step: 1, label: "Solução", value: values.solution },
                { step: 1, label: "Sector", value: values.sector },
                { step: 2, label: "Fase", value: values.stage ? LABEL.stage[values.stage] : "" },
                { step: 2, label: "Procura", value: values.lookingFor.map((x) => LABEL.lookingFor[x as keyof typeof LABEL.lookingFor]).join(", ") },
                { step: 3, label: "Anexos", value: (values.attachments as Attachment[]).map((a) => a.name).join(", ") },
              ]} />
              {anon && !user && <Captcha onToken={setCaptcha} />}
            </div>
          )}
        </Wizard>
      </div>
    </>
  );
}

// =============================================================== P14 Confirmação

interface SubmitResult { ideaId: string | null; number: string; trackingCode?: string; title: string; at: string; deadline: number }

export function ConfirmationView() {
  const [r, setR] = React.useState<SubmitResult | null>(null);
  const [ready, setReady] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RESULT_KEY);
      if (raw) setR(JSON.parse(raw));
    } catch { /* ignora */ }
    setReady(true);
  }, []);
  React.useEffect(() => {
    if (r) celebrate();
  }, [r]);
  if (!ready) return null;
  if (!r) return <div className="container-x py-20"><EmptyState title="Não há nenhuma submissão recente" hint="Se submeteu sem conta, consulte o estado com o seu código." action={<Button asChild><Link href="/estado">{t("nav.checkStatus")}</Link></Button>} /></div>;
  const copy = async () => {
    await navigator.clipboard.writeText(r.trackingCode!);
    setCopied(true);
    toast.success(t("actions.copied"));
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="container-x grid max-w-3xl gap-8 py-14">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="mx-auto grid size-20 place-items-center rounded-full bg-ok text-white shadow-3">
        <Check className="size-10" strokeWidth={3} />
      </motion.div>
      <div className="grid gap-2 text-center">
        <p className="font-mono text-sm text-fg-subtle">P14 · {r.number}</p>
        <h1 className="font-display text-[length:var(--text-4xl)] font-bold">{t("submit.successTitle")}</h1>
        <p className="text-lg text-fg-muted">«{r.title}»</p>
      </div>
      {r.trackingCode ? (
        <Card className="grid gap-4 border-2 border-brand p-6 text-center md:p-8">
          <p className="text-sm font-medium">{t("submit.codeTitle")}</p>
          <motion.p initial={{ letterSpacing: "0.6em", opacity: 0 }} animate={{ letterSpacing: "0.12em", opacity: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} className="font-mono text-3xl font-bold md:text-4xl" aria-live="polite">{r.trackingCode}</motion.p>
          <p className="flex items-center justify-center gap-2 text-sm text-warn"><ShieldCheck className="size-4" /> {t("submit.codeWarning")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={copy} variant={copied ? "secondary" : "primary"} className="min-w-36">
              <span className="relative grid size-4 place-items-center">
                <PopIn show={!copied} className="absolute"><Copy className="size-4" /></PopIn>
                <PopIn show={copied} className="absolute text-ok"><Check className="size-4" strokeWidth={3} /></PopIn>
              </span>
              {copied ? t("actions.copied") : t("actions.copy")}
            </Button>
            <Button variant="secondary" onClick={async () => (await import("@/lib/client/pdf")).downloadReceipt(r)}><Download /> {t("submit.downloadReceipt")}</Button>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <p>Pode acompanhar a ideia, as mensagens e o feedback na sua conta.</p>
          {r.ideaId && <Button asChild><AppLink href={`/conta/ideias/${r.ideaId}`}>Ver a minha ideia <ArrowRight /></AppLink></Button>}
        </Card>
      )}
      <Card className="grid gap-5 p-6 md:p-8">
        <h2 className="font-display text-xl font-bold">{t("submit.whatNext")}</h2>
        <ol className="grid gap-4 md:grid-cols-5">
          {["RECEBIDA", "EM_ANALISE", "INFO_PEDIDA", "EM_AVALIACAO", "DECISAO"].map((st, i) => (
            <li key={st} className="grid gap-1">
              <span className="font-mono text-xs text-fg-subtle">0{i + 1}</span>
              <span className="font-medium">{L.status(st as never)}</span>
              <span className="text-xs text-fg-muted">{t(`statusCreator.${st}`)}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-fg-muted">Primeiro retorno em até <strong>{r.deadline} dias úteis</strong>. A análise automática não decide: uma pessoa da equipa lê sempre a sua ideia.</p>
      </Card>
    </div>
  );
}

// =============================================================== P15 Consultar estado

export function StatusView() {
  const [code, setCode] = React.useState("");
  const [captcha, setCaptcha] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [state, setState] = React.useState<{ loading: boolean; error?: string; data?: Awaited<ReturnType<typeof import("@/lib/client/runtime").api<"getStatusByCode">>> }>({ loading: false });
  const load = async (c = code) => {
    setState({ loading: true });
    try {
      const { api } = await import("@/lib/client/runtime");
      setState({ loading: false, data: await api("getStatusByCode", { code: c, captchaToken: captcha }) });
    } catch (e) {
      setState({ loading: false, error: (e as ApiError).message });
    }
  };
  const d = state.data;
  return (
    <>
      <PageHeader crumbs={[{ label: t("nav.checkStatus") }]} eyebrow="P15" title="Consultar estado" lead="Introduza o código de acompanhamento que recebeu ao submeter sem conta." />
      <div className="container-x grid max-w-3xl gap-8 py-10">
        <Card className="p-6 md:p-8">
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <Field id="s-code" label="Código de acompanhamento" hint="Formato ECO-XXXX-XXXX." required error={state.error}>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ECO-7F3K-92QD" className="font-mono text-lg tracking-widest" autoComplete="off" spellCheck={false} />
            </Field>
            <Captcha onToken={setCaptcha} />
            <Button type="submit" loading={state.loading} disabled={!captcha || code.length < 8} className="w-fit"><FileSearch /> Consultar</Button>
          </form>
        </Card>
        {d && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6">
            <IdeaStatusPanel d={d} />
            {d.openInfoRequest && (
              <Card className="grid gap-3 border-warn/40 bg-warn-soft p-6">
                <p className="font-display text-lg font-bold">A equipa pediu informação</p>
                <p>{d.openInfoRequest.text}</p>
                <Field id="s-ans" label="A sua resposta" required><Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} /></Field>
                <Button className="w-fit" disabled={!answer.trim()} onClick={async () => {
                  try { await mutate("answerByCode", { code, text: answer }); setAnswer(""); toast.success("Resposta enviada."); load(); } catch (e) { toast.error((e as ApiError).message); }
                }}>{t("actions.send")}</Button>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </>
  );
}

/** Painel de estado partilhado por P15 e P21: sem dados pessoais nem IA. */
export function IdeaStatusPanel({ d }: { d: { idea: { number: string; title: string; status: never | string; decision?: string | null; decisionReason?: string; nextStep?: string; area: "LAB" | "INCUBADORA" }; timeline: { status: string; at: string; current: boolean; done: boolean }[]; messages: { id: string; kind: string; text: string; at: string; fromTeam: boolean }[] } }) {
  const i = d.idea;
  return (
    <div className="grid gap-6">
      <Card className="grid gap-4 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm text-fg-subtle">{i.number}</span><StatusTag status={i.status as never} decision={i.decision as never} /></div>
        <h2 className="font-display text-2xl font-bold">{i.title}</h2>
        <IdeaTimeline steps={d.timeline} status={i.status} decision={i.decision as never} />
      </Card>
      {i.status === "DECISAO" && i.decision && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className={cn("grid gap-2 border-2 p-6", i.decision === "SELECCIONADA" ? "border-ok" : i.decision === "NAO_SELECCIONADA" ? "border-danger/50" : "border-warn/50")}>
            <p className="font-mono text-xs uppercase tracking-widest text-fg-subtle">Resultado</p>
            <p className="font-display text-2xl font-bold">{L.decision(i.decision as never)}</p>
            {i.decisionReason && <p><span className="font-medium">Motivo:</span> {i.decisionReason}</p>}
            {i.nextStep && <p><span className="font-medium">Próximo passo:</span> {i.nextStep}</p>}
          </Card>
        </motion.div>
      )}
      {d.messages.filter((m) => m.fromTeam).length > 0 && (
        <Card className="grid gap-3 p-6">
          <h3 className="font-display text-lg font-bold">Feedback da equipa</h3>
          {d.messages.filter((m) => m.fromTeam).map((m) => (
            <div key={m.id} className="grid gap-1 rounded-[var(--radius-md)] bg-surface-2 p-4">
              <p className="text-xs text-fg-subtle">{fmtDate(m.at)} · {m.kind === "PEDIDO_INFO" ? "Pedido de informação" : "Equipa"}</p>
              <p className="whitespace-pre-line">{m.text}</p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// =============================================================== P24 Formulário de ideia de melhoria (F2)

type F2Form = Omit<F2Input, "confirmNoClientData"> & { confirmNoClientData: boolean };
const F2_DRAFT = "eco-draft-f2";

export function ImprovementIdeaForm() {
  const router = useRouter();
  const { actor, ready } = useSession();
  const { data: s } = useQuery("getPublicSettings");
  const [step, setStep] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const form = useForm<F2Form>({
    defaultValues: { kind: "MELHORIA", anonymous: false, title: "", category: undefined, affectedArea: "", problem: "", frequency: undefined, affected: [], proposal: "", impact: [], impactEstimate: "", urgency: undefined, gravity: undefined, wantsToParticipate: false, attachments: [], confirmNoClientData: false },
  });
  React.useEffect(() => {
    const d = readDraft<F2Form>(F2_DRAFT);
    if (d) form.reset({ ...d, confirmNoClientData: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const values = form.watch();
  const savedAt = useDraft(F2_DRAFT, values, ready);
  const e = form.formState.errors;
  const reg = form.register;
  if (ready && !canSubmitImprovementIdea(actor)) return <RequirePage page="P24" title="o formulário de melhoria">{null}</RequirePage>;
  const steps: WizardStep[] = [
    { key: "tipo", title: "Que tipo de ideia tem?" },
    { key: "problema", title: "O problema", hint: "O que acontece hoje?" },
    { key: "proposta", title: "A proposta" },
    { key: "anexos", title: "Anexos e confirmação" },
    { key: "rever", title: t("forms.review"), hint: t("forms.reviewHint") },
  ];
  const next = async () => {
    if (step === 0 && values.kind === "NEGOCIO") {
      router.push("/submeter/externa");
      return;
    }
    const schemas = [F2Step1, F2Step2, F2Step3, F2Step4];
    if (step < 4) {
      if (!validateStep(form, schemas[step])) return;
      return setStep(step + 1);
    }
    setBusy(true);
    try {
      const res = await mutate("submitImprovementIdea", form.getValues() as F2Input);
      clearDraft(F2_DRAFT);
      sessionStorage.setItem(RESULT_KEY, JSON.stringify({ ...res, title: values.title, at: new Date().toISOString(), deadline: s?.responseDeadlineDays ?? 10 }));
      router.push("/submeter/confirmacao");
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader tone="lab" crumbs={[{ href: "/submeter", label: t("nav.submit") }, { label: "Ideia de melhoria" }]} eyebrow="P24 · F2" title="Ideia para melhorar a TIS" lead="Entra na triagem do Laboratório. Pode submeter de forma anónima." />
      <div className="container-x max-w-3xl py-10">
        <Wizard steps={steps} current={step} onBack={() => setStep(Math.max(0, step - 1))} onNext={next} savedAt={savedAt} busy={busy} nextLabel={t("actions.submit")}>
          {step === 0 && (
            <div className="grid gap-6">
              <ChoiceGroup name="kind" columns={2} value={values.kind} onChange={(v) => form.setValue("kind", v as F2Form["kind"])} options={[
                { value: "MELHORIA", label: "Melhoria para a TIS", hint: "Processos, ferramentas, forma de trabalhar…", icon: <Lightbulb className="size-4 text-lab-ink" /> },
                { value: "NEGOCIO", label: "Nova ideia de negócio", hint: "Leva-o ao formulário de ideia de negócio, com os seus dados.", icon: <Building2 className="size-4 text-inc-ink" /> },
              ]} />
              {values.kind === "MELHORIA" && (
                <Card className="p-5">
                  <Switch id="f2-anon" checked={values.anonymous} onCheckedChange={(v) => form.setValue("anonymous", v)} label="Submeter como anónimo" description="O seu nome não aparece a ninguém, nem aos gestores nem à Comissão Executiva. Continua a ver a ideia em «As minhas ideias» e pode revelar a autoria mais tarde." />
                </Card>
              )}
            </div>
          )}
          {step === 1 && (
            <div className="grid gap-5">
              <Field id="f2-title" label={<span className="flex w-full justify-between">Título <CharCount value={values.title} max={80} /></span>} required error={e.title?.message}><Input maxLength={90} {...reg("title")} /></Field>
              <div className="grid gap-2">
                <p id="f2-cat" className="text-sm font-medium">Categoria <span className="text-danger">*</span></p>
                <ChoiceGroup labelledBy="f2-cat" name="category" columns={3} value={values.category} onChange={(v) => form.setValue("category", v as F2Form["category"])} options={opts(CATEGORIES, LABEL.category)} invalid={!!e.category} />
                {e.category && <p role="alert" className="text-sm text-danger">{e.category.message}</p>}
              </div>
              <Field id="f2-area" label="Área da TIS afectada" required error={e.affectedArea?.message}>
                <Select value={values.affectedArea} onChange={(ev) => form.setValue("affectedArea", ev.target.value)}>
                  <option value="">Escolha…</option>
                  {(s?.tisAreas ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
                </Select>
              </Field>
              <Field id="f2-prob" label="Problema actual" hint="O que acontece hoje." required error={e.problem?.message}><Textarea rows={5} {...reg("problem")} /></Field>
              <div className="grid gap-2">
                <p id="f2-freq" className="text-sm font-medium">Com que frequência acontece <span className="text-danger">*</span></p>
                <ChoiceGroup labelledBy="f2-freq" name="frequency" columns={4} value={values.frequency} onChange={(v) => form.setValue("frequency", v as F2Form["frequency"])} options={opts(FREQUENCIES, LABEL.frequency)} invalid={!!e.frequency} />
                {e.frequency && <p role="alert" className="text-sm text-danger">{e.frequency.message}</p>}
              </div>
              <div className="grid gap-2">
                <p id="f2-aff" className="text-sm font-medium">Quem é afectado <span className="text-danger">*</span></p>
                <ChoiceGroup multiple labelledBy="f2-aff" name="affected" columns={4} value={values.affected} onChange={(v) => form.setValue("affected", v as F2Form["affected"])} options={opts(AFFECTED, LABEL.affected)} invalid={!!e.affected} />
                {e.affected && <p role="alert" className="text-sm text-danger">{e.affected.message}</p>}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-5">
              <Field id="f2-prop" label="Proposta de solução" required error={e.proposal?.message}><Textarea rows={5} {...reg("proposal")} /></Field>
              <div className="grid gap-2">
                <p id="f2-imp" className="text-sm font-medium">Impacto esperado <span className="text-danger">*</span></p>
                <ChoiceGroup multiple labelledBy="f2-imp" name="impact" columns={3} value={values.impact} onChange={(v) => form.setValue("impact", v as F2Form["impact"])} options={opts(IMPACTS, LABEL.impact)} invalid={!!e.impact} />
                {e.impact && <p role="alert" className="text-sm text-danger">{e.impact.message}</p>}
              </div>
              <Field id="f2-est" label="Estimativa do impacto" hint="Exemplo: «2 horas por semana por pessoa»."><Input {...reg("impactEstimate")} /></Field>
              <div className="grid gap-5 sm:grid-cols-2">
                {(["urgency", "gravity"] as const).map((k) => (
                  <div key={k} className="grid gap-2">
                    <p id={`f2-${k}`} className="text-sm font-medium">{k === "urgency" ? "Urgência" : "Gravidade se nada mudar"} <span className="text-danger">*</span></p>
                    <ChoiceGroup labelledBy={`f2-${k}`} name={k} columns={3} value={values[k]} onChange={(v) => form.setValue(k, v as F2Form["urgency"])} options={opts(LEVELS, LABEL.level)} invalid={!!e[k]} />
                    {e[k] && <p role="alert" className="text-sm text-danger">{e[k]?.message}</p>}
                  </div>
                ))}
              </div>
              <Checkbox id="f2-part" checked={values.wantsToParticipate} onCheckedChange={(v) => form.setValue("wantsToParticipate", v)} label="Quero participar na implementação" />
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-5">
              <FileDrop value={values.attachments as Attachment[]} onChange={(v) => form.setValue("attachments", v as never)} />
              <Checkbox id="f2-conf" checked={values.confirmNoClientData} onCheckedChange={(v) => form.setValue("confirmNoClientData", v)} invalid={!!e.confirmNoClientData} label="Confirmo que não incluo dados de clientes nem informação confidencial" />
              {e.confirmNoClientData && <p role="alert" className="text-sm text-danger">{e.confirmNoClientData.message}</p>}
            </div>
          )}
          {step === 4 && (
            <ReviewList onEdit={setStep} items={[
              { step: 0, label: "Anónimo", value: values.anonymous ? "Sim" : "Não" },
              { step: 1, label: "Título", value: values.title },
              { step: 1, label: "Categoria", value: values.category ? LABEL.category[values.category] : "" },
              { step: 1, label: "Área afectada", value: values.affectedArea },
              { step: 1, label: "Problema", value: values.problem },
              { step: 2, label: "Proposta", value: values.proposal },
              { step: 2, label: "Impacto", value: values.impact.map((x) => LABEL.impact[x as keyof typeof LABEL.impact]).join(", ") },
              { step: 2, label: "Urgência / Gravidade", value: `${values.urgency ? LABEL.level[values.urgency] : "—"} / ${values.gravity ? LABEL.level[values.gravity] : "—"}` },
            ]} />
          )}
        </Wizard>
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-fg-subtle"><Sparkles className="size-4" /> {t("submit.deadline", { days: s?.responseDeadlineDays ?? 10 })}</p>
      </div>
    </>
  );
}
