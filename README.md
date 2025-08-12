# NPS Vercel Serverless

Este pacote contém o endpoint `/api/nps` para salvar respostas de NPS no Zendesk.

## Como usar (via navegador, sem CLI)
1. **Crie um repositório no GitHub** (ex.: `nps-vercel`).
2. **Faça o upload** destes arquivos pelo GitHub Web:
   - `api/nps.js`
   - `package.json`
   - `vercel.json` (opcional)
3. No **Vercel Dashboard**:
   - Clique em **Add New > Project**.
   - Conecte sua conta GitHub e **importe** o repositório criado.
   - Em **Framework Preset**, escolha **Other** (ou deixe auto).
   - Clique em **Deploy** (pode falhar por ENV ausente — prossiga).
4. Abra **Settings > Environment Variables** do projeto na Vercel e adicione:
   - `ZENDESK_SUBDOMAIN`  → ex.: `d3v-sisconsulting`
   - `ZENDESK_EMAIL`      → ex.: `seu-email@empresa.com.br`
   - `ZENDESK_API_TOKEN`  → token gerado no Zendesk
   - `NPS_FIELD_ID`       → (opcional) ID campo numérico NPS
   - `WHY_FIELD_ID`       → (opcional) ID campo texto por quê
   - `IMPROVE_FIELD_ID`   → (opcional) ID campo texto melhorias
   - `ALLOWED_ORIGIN`     → ex.: `https://SEUSUBDOMINIO.zendesk.com`
5. Clique **Redeploy**.
6. Sua URL ficará: `https://<seu-projeto>.vercel.app/api/nps`. Coloque no HTML do formulário.

## Teste
Faça um `POST` com JSON:
```bash
curl -X POST "https://<seu-projeto>.vercel.app/api/nps"   -H "Origin: https://SEUSUBDOMINIO.zendesk.com"   -H "Content-Type: application/json"   -d '{"ticketId":"123456","score":9,"why":"ótimo","improve":"--"}'
```
