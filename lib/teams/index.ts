// Microsoft Teams: por Microsoft Graph (mensagem de chat ao utilizador) quando há credenciais
// da aplicação; caso contrário, por webhook de entrada num canal (Adaptive Card).
export async function sendTeams({ title, text, to, webhookUrl }: { title: string; text: string; to?: string; webhookUrl?: string }) {
  if (process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET && process.env.GRAPH_TENANT_ID && to) {
    return sendViaGraph({ title, text, to });
  }
  if (!webhookUrl) throw new Error("Teams sem webhook nem Microsoft Graph configurados.");
  const card = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            { type: "TextBlock", text: title, weight: "Bolder", size: "Medium", wrap: true },
            { type: "TextBlock", text, wrap: true },
            ...(to ? [{ type: "TextBlock", text: `Para: ${to}`, isSubtle: true, size: "Small" }] : []),
          ],
        },
      },
    ],
  };
  const res = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(card) });
  if (!res.ok) throw new Error(`Teams respondeu ${res.status}`);
}

async function graphToken() {
  const res = await fetch(`https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    body: new URLSearchParams({ client_id: process.env.GRAPH_CLIENT_ID!, client_secret: process.env.GRAPH_CLIENT_SECRET!, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
  });
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Notificação de actividade no Teams (feed do utilizador), via Graph. */
async function sendViaGraph({ title, text, to }: { title: string; text: string; to: string }) {
  const token = await graphToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(to)}/teamwork/sendActivityNotification`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: { source: "text", value: "Ecossistema de Inovação TIS", webUrl: process.env.APP_URL ?? "https://inovacao.tis.example" },
      activityType: "systemDefault",
      previewText: { content: title },
      templateParameters: [{ name: "systemDefaultText", value: text.slice(0, 150) }],
    }),
  });
  if (!res.ok) throw new Error(`Graph respondeu ${res.status}`);
}
