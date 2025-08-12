// api/nps.js
// Vercel Serverless Function (Node.js)

module.exports = async (req, res) => {
  const {
    ZENDESK_SUBDOMAIN,    // ex.: d3v-sisconsulting
    ZENDESK_EMAIL,        // ex.: jp@sisconsulting.com.br
    ZENDESK_API_TOKEN,    // token da API
    NPS_FIELD_ID,         // opcional - ID do campo numérico NPS
    WHY_FIELD_ID,         // opcional - ID do campo texto "por quê?"
    IMPROVE_FIELD_ID,     // opcional - ID do campo texto "o que melhorar?"
    ALLOWED_ORIGIN        // ex.: https://d3v-sisconsulting.zendesk.com (pode ser lista separada por vírgula)
  } = process.env;

  // ======== CORS ========
  const origin = req.headers.origin || "";
  const allowList = (ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
  const isAllowedOrigin = allowList.length > 0 && allowList.includes(origin);

  function setCors() {
    if (isAllowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "600");
  }

  setCors();

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  if (!isAllowedOrigin) {
    res.status(403).json({ error: "origin_forbidden" });
    return;
  }

  // ======== Validação de envs ========
  if (!ZENDESK_SUBDOMAIN || !ZENDESK_EMAIL || !ZENDESK_API_TOKEN) {
    res.status(500).json({ error: "server_misconfigured" });
    return;
  }

  // ======== Parse do body ========
  let bodyStr = "";
  try {
    for await (const chunk of req) bodyStr += chunk;
  } catch {}
  let data = {};
  try {
    data = JSON.parse(bodyStr || "{}");
  } catch {
    res.status(400).json({ error: "invalid_json" });
    return;
  }

  const { ticketId, score, why, improve } = data || {};
  if (!ticketId || typeof score !== "number") {
    res.status(400).json({ error: "ticketId_and_score_required" });
    return;
  }

  // ======== Monta payload do Zendesk ========
  const custom_fields = [];
  if (NPS_FIELD_ID)     custom_fields.push({ id: Number(NPS_FIELD_ID), value: Number(score) });
  if (WHY_FIELD_ID)     custom_fields.push({ id: Number(WHY_FIELD_ID), value: String(why || "") });
  if (IMPROVE_FIELD_ID) custom_fields.push({ id: Number(IMPROVE_FIELD_ID), value: String(improve || "") });

  const zendeskBody = {
    ticket: {
      comment: {
        body:
          `NPS: ${score}/10\\n` +
          (why ? `Motivo: ${why}\\n` : "") +
          (improve ? `Melhorias: ${improve}\\n` : "") +
          `Origem: NPS (form)`,
        public: false
      },
      ...(custom_fields.length ? { custom_fields } : {}),
      tags: ["nps_web", "nps_form"]
    }
  };

  const url = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets/${encodeURIComponent(ticketId)}.json`;
  const basic = Buffer.from(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`).toString("base64");

  try {
    const resp = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(zendeskBody)
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      res.status(resp.status).json({ error: "zendesk_error", detail });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Zendesk call failed:", err);
    res.status(500).json({ error: "internal_error" });
  }
};
