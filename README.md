# Briefcase

An AI assistant for your Google workspace. Ask it to read emails, check your calendar, search Drive, find contacts, and draft replies — all from one chat interface.

**Live:** https://briefcase-rohan.vercel.app

---

## What It Does

- **Gmail** — read unread emails, send messages, reply in-thread
- **Google Calendar** — check availability, read upcoming events
- **Google Drive** — search files, list recent documents
- **Google Contacts** — look up people by name

Write actions (sending email, creating events) go through a Human-in-the-Loop approval card before execution. The AI drafts, you review and approve.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **AI:** OpenAI GPT-4o (tool calling) + GPT-4o-mini (streaming responses)
- **Auth:** Auth0 v4 SDK + Token Vault + MRRT
- **Database:** Neon Postgres (via Vercel Storage)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Deployment:** Vercel

---

## Running Locally

### Prerequisites

- Node.js 18+
- An Auth0 account with Token Vault enabled
- A Google OAuth connection configured in Auth0 (Gmail, Calendar, Drive, Contacts scopes)
- A Neon Postgres database
- An OpenAI API key

### Setup

1. Clone the repo

```bash
git clone https://github.com/RohanSudo/briefcase.git
cd briefcase
```

2. Install dependencies

```bash
npm install
```

3. Copy the example env file and fill in your values

```bash
cp .env.example .env.local
```

4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000.

---

## Environment Variables

| Variable | Description |
|---|---|
| `AUTH0_SECRET` | Long random string for session encryption |
| `AUTH0_DOMAIN` | Your Auth0 tenant domain (e.g. `dev-xxx.us.auth0.com`) |
| `AUTH0_CLIENT_ID` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret |
| `AUTH0_AUDIENCE` | Auth0 API audience (used for MRRT) |
| `APP_BASE_URL` | Base URL of the app (e.g. `http://localhost:3000`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `POSTGRES_URL` | Neon Postgres connection string |

### Auth0 Configuration

- Application type: Regular Web Application
- Grant types: Authorization Code, Refresh Token, Token Exchange (Token Vault)
- Google connection scopes: `gmail.readonly`, `gmail.send`, `calendar.events`, `calendar.events.readonly`, `drive.readonly`, `contacts.readonly`
- Enable My Account API and authorize your application
- Enable MRRT for your API and My Account API
- Callback URLs: `http://localhost:3000/auth/callback` and your production URL

---

## Architecture

Briefcase uses Auth0 Token Vault to store and manage Google OAuth tokens server-side. When the AI needs to call a Google API, it requests a token via `getAccessTokenForConnection` — the app never holds raw credentials.

Write actions trigger a Human-in-the-Loop approval flow: the agent presents a structured approval card with the full action details, and waits for explicit user approval before executing. An activity log records every tool call for full auditability.
