# SaaS Support Agent (Staging)

A support assistant for a fictional SaaS company. It answers common questions from a Knowledge Base and creates support tickets via a simple HTTP endpoint.

---

## Features

- **Knowledge Base Q&A**: Pricing, plans, troubleshooting, policies.
- **Ticket Creation**: `create-support-ticket` action posts to a Beeceptor URL and returns a `ticketId`.
- **Autonomous Logic**: Greets, troubleshoots login issues, then offers to open a ticket if needed.
- **CI/CD**: GitHub Actions workflow to deploy changes to a Staging bot.

---

## Prerequisites

- Botpress account with a workspace and a **Staging** bot.
- Node.js **18** and npm.
- Git & GitHub repository.
- Beeceptor endpoint (e.g. `https://saas-ticket.free.beeceptor.com`).

---

## Setup

### 1) Knowledge Base

1. Open **Studio** → your Staging bot → **Knowledge** (book icon).
2. Create a KB named **Company FAQs**.
3. Upload `kb/saas_faq.txt` (strict `Question:` / `Answer:` format recommended).
4. Publish the bot.

**Quick test**: In the Emulator, ask:

- “What plans are available?”
- “I can’t log in — what should I try first?”

---

### 2) Beeceptor

1. Create endpoint (e.g. `saas-ticket`).
2. Add a rule for `POST /tickets` with a JSON response:
   ```json
   { "ticketId": "TICKET-XYZ12345" }
   ```

Your URL will look like:

https://saas-ticket.free.beeceptor.com/tickets

3. Integration: Support Tickets (Beeceptor)

Definition: my-integration/integration.definition.ts
Implementation: my-integration/src/index.ts

The action createSupportTicket accepts:

{
userName: string;
userEmail: string;
problemDescription: string;
}

and returns:

{ ticketId: string }

The implementation:

POSTs { name, email, problem } to SUPPORT_API_URL (auto-appends /tickets if missing).

Accepts ticketId in several shapes (e.g., {ticketId}, {id}, { data: { ticketId|id } }).

Generates a fallback TICKET-XXXXXXXX if the response has no ID.

Build (from my-integration/):

rm -rf .botpress dist
npx @botpress/cli@latest integration build

Add Integration instance in Studio → Integrations → Support Tickets (Beeceptor):

SUPPORT_API_URL = https://saas-ticket.free.beeceptor.com (base OK; /tickets will be appended)

SUPPORT_API_TOKEN (optional)

AUTH_HEADER_NAME = Authorization (default)

TIMEOUT_MS = 10000 (default)

## 4) Autonomous Node

- In the **Main** workflow, add an **Autonomous Node**.
- Enable **Knowledge Answering** → select your **Company FAQs** KB.
- Enable **Actions** → check **`support-tickets.createSupportTicket`**.
- **Instructions** (paste into the node):

## GOAL

Resolve the user’s request. Prefer facts from the Knowledge Base (KB). If login troubleshooting fails or user asks, create a support ticket.

## TOOLS

1. knowledge_base — pricing, plans, setup, policies, troubleshooting.
2. create-support-ticket(userName, userEmail, problemDescription) — use when a ticket is requested or after troubleshooting fails.

## POLICY

- Greet briefly.
- For login issues: provide steps from KB, then ask “Did that solve it?”
- If not solved or user asks: collect name, email, short problem; call create-support-ticket; confirm ticketId.
- Don’t invent facts. Ask a clarifying question if needed.

## SAFETY

- Don’t collect passwords or full card numbers.
- Only collect name and email as needed.

## CI/CD (GitHub Actions)

- Workflow file: .github/workflows/deploy-staging.yml

- Required repository secrets:

- STAGING_BOT_ID (from Studio URL of the Staging bot)

- WORKSPACE_ID (workspace identifier)

- BOTPRESS_PAT (personal access token with deploy permission)

## Typical steps:

- Push to main or run the workflow manually.

- The job logs in with bp login and runs bp deploy --bot-id "$STAGING_BOT_ID".

- If you store secrets in an Environment (e.g. staging), set environment: staging in the job.

## Testing

- Q&A path: “What does the Pro plan include?”

- Troubleshoot path: “I can’t log in.”

- Expect steps (reset password, magic link within 10 minutes, incognito, status page, SSO domain).

- When answering “No, it didn’t help”, the assistant asks for name/email/brief problem, then returns a ticketId.

- Mixed: “What’s the price and also please open a ticket for a billing problem.”

## Troubleshooting

- Shareable webchat: “Invalid Client ID”

Publish the bot.

Copy the Client ID from Webchat → Advanced Settings and use it in your embed/init.

## GitHub Actions: “Not logged in”

- **Secrets (CI/CD)**

  - Ensure `WORKSPACE_ID` and `BOTPRESS_PAT` repository secrets exist and are not empty.
  - Add a preflight step in the workflow to fail fast if required secrets are missing.

- **Integration build / action key**

  - If you see **Action not found** (`createSupportTicket` key), your generated types are stale.
  - Rebuild integration types after editing the definition:
    ```bash
    rm -rf .botpress dist
    npx @botpress/cli@latest integration build
    ```
  - Restart the TypeScript server in your editor after rebuilding.

- **TypeScript / DOM types**

  - For **TypeScript DOM type error** (`RequestInfo`), avoid DOM-only types.
  - Use `string | URL` instead of `RequestInfo`, or add `"DOM"` to `tsconfig.json` `compilerOptions.lib`.

- **Notes**
  - Keep Knowledge Base answers short and specific.
  - Only open a ticket when troubleshooting steps fail or the user directly asks.
  - See `COST_ANALYSIS.md` for a simple, request-based total.
