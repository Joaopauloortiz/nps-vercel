// api/nps.js
module.exports = async (req, res) => {
  const {
    ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN,
    NPS_FIELD_ID, WHY_FIELD_ID, IMPROVE_FIELD_ID, ALLOWED_ORIGIN
  } = process.env;

  // --- CORS base (sempre mandar no preflight) ---
  const origin = req.headers.origin || "";
  const allowList = (ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
  const isAllowed = allowList.length > 0 && allowList.includes(origin);

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");

  if (req.method === "OPTIONS") {
    // Garanta que o navegador receba ACAO no preflight
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    return res.status(204).end();
  }

  if (!isAllowed) {
    // Inclui ACAO também no erro pra evitar “Failed to fetch” genérico
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    return res.status(403).json({ error: "origin_forbidden" });
  }

  // Para requisição real, também inclua ACAO
  res.setHeader("Access-Control-Allow-Origin", origin);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  if (!ZENDESK_SUBDOMAIN || !ZENDESK_EMAIL || !ZENDESK_API_TOKEN) {
    return res.status(500).json({ error: "server_misconfigured" });
  }

  // Body
  let raw = "";
  for await (const ch of req) raw += ch;
  let data = {};
  try { data = JSON.parse(raw || "{}"); } catch { return res.status(400).json({ error: "invalid_json" }); }

  const { ticketId, score, why, improve } = data || {};
  if (!ticketId || typeof score !== "number") {
    return res.status(400).json({ error: "ticketId_and_score_required" });
  }

  // Payload Zendesk
  const custom_fields = [];
  if (NPS_FIELD_ID)     custom_fields.push({ id: Number(NPS_FIELD_ID), value: Number(score) });
  if (WHY_FIELD_ID)     custom_fields.push({ id: Number(WHY_FIELD_ID), value: String(why || "") });
  if (IMPROVE_FIELD_ID) custom_fields.push({ id: Number(IMPROVE_FIELD_ID), value: String(improve || "") });

  const body = {
    ticket: {
      comment: {
        body: `NPS: ${score}/10\n${why ? `Motivo: ${why}\n` : ""}${improve ? `Melhorias: ${improve}\n` : ""}Origem: NPS`,
        public: false
      },
      ...(custom_fields.length ? { custom_fields } : {}),
      tags: ["nps_web", "nps_form"]
    }
  };

  const url   = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets/${encodeURIComponent(ticketId)}.json`;
  const basic = Buffer.from(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`).toString("base64");

  try {
    const resp = await fetch(url, {
      method: "PUT",
      headers: { "Authorization": `Basic ${basic}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return res.status(resp.status).json({ error: "zendesk_error", detail });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
};
