# Briefcase -- External Services Setup Guide

Follow these steps in order. Copy every value marked with **SAVE THIS** into a notepad -- you'll need them all for the `.env.local` file at the end.

---

## Step 1: Auth0 Account + Tenant

1. Go to https://auth0.com and sign up (or log in)
2. Create a new tenant when prompted
   - Name: `briefcase` (or whatever you want)
   - Region: pick closest to you
3. You're now in the Auth0 dashboard

## Step 2: Auth0 Application

1. In the left sidebar: Applications > Applications > Create Application
2. Settings:
   - Name: `Briefcase`
   - Type: **Regular Web Application**
   - Click Create
3. Go to the Settings tab of your new app
4. **SAVE THESE:**
   - Domain (looks like `xxxxx.us.auth0.com`)
   - Client ID
   - Client Secret
5. Scroll down to "Application URIs" and fill in:
   - **Allowed Callback URLs:** `http://localhost:3000/api/auth/callback`
   - **Allowed Logout URLs:** `http://localhost:3000`
   - **Allowed Web Origins:** `http://localhost:3000`
6. Scroll to bottom, click **Save Changes**

## Step 3: Auth0 API

1. Left sidebar: Applications > APIs > Create API
2. Settings:
   - Name: `Briefcase API`
   - Identifier: `https://briefcase-api` (this is just a string, not a real URL)
   - Signing Algorithm: RS256
3. Click Create
4. **SAVE THIS:**
   - Identifier: `https://briefcase-api` (this becomes AUTH0_AUDIENCE)

## Step 4: Auth0 Token Vault + Google Connection

### 4a: Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click the project dropdown at the top > New Project
   - Name: `Briefcase`
   - Click Create, then select it
3. Go to hamburger menu > APIs & Services > Library
4. Search and enable these two APIs:
   - **Gmail API** -- click Enable
   - **Google Calendar API** -- click Enable
5. Go to hamburger menu > APIs & Services > OAuth consent screen
   - Click "Get Started" or "Configure"
   - User Type: **External**
   - App name: `Briefcase`
   - User support email: your email
   - Developer contact: your email
   - Click Save
6. On the Scopes page, click "Add or Remove Scopes" and add:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - Click Update, then Save and Continue
7. On the Test Users page, add your own Google email, then Save and Continue
8. Back on the OAuth consent screen, **change Publishing Status to "In Production"**
   - Click "Publish App"
   - Confirm the dialog
   - This avoids the 7-day token expiry problem
9. Go to hamburger menu > APIs & Services > Credentials
10. Click "Create Credentials" > OAuth client ID
    - Application type: **Web application**
    - Name: `Briefcase Auth0`
    - Authorized redirect URIs: `https://YOUR-AUTH0-DOMAIN/login/callback`
      (replace YOUR-AUTH0-DOMAIN with your Auth0 domain from Step 2, e.g., `https://briefcase.us.auth0.com/login/callback`)
    - Click Create
11. **SAVE THESE:**
    - Google Client ID
    - Google Client Secret

### 4b: Connect Google in Auth0

1. Back in Auth0 Dashboard
2. Left sidebar: Authentication > Social
3. Find **Google / Gmail** and click it (or create the connection)
4. Enter the Google Client ID and Client Secret from step 4a
5. **Important settings to enable:**
   - Toggle ON: **"Connected Accounts for Token Vault"** (or similar -- look for Token Vault section)
   - Toggle ON: **"Offline Access"**
6. In the Scopes/Permissions section, add these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
7. Go to the "Applications" tab within this connection
   - Toggle ON your "Briefcase" application
8. Save

## Step 5: Slack Connection (optional -- can do later)

### 5a: Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" > From scratch
   - App Name: `Briefcase`
   - Pick your workspace
3. Go to OAuth & Permissions in the left sidebar
4. Under "Redirect URLs", add:
   - `https://YOUR-AUTH0-DOMAIN/login/callback`
5. Under "User Token Scopes", add:
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `users:read`
6. Go to "Basic Information" in the sidebar
7. **SAVE THESE:**
   - Client ID
   - Client Secret

### 5b: Connect Slack in Auth0

1. Auth0 Dashboard > Authentication > Social > Slack
2. Enter Slack Client ID and Client Secret
3. Enable "Connected Accounts for Token Vault"
4. Add the scopes from 5a
5. Enable for the "Briefcase" application
6. Save

## Step 6: Gemini API Key

1. Go to https://aistudio.google.com
2. Click "Get API Key" (top left or in sidebar)
3. Create a new API key (or use existing)
4. **SAVE THIS:**
   - API Key

## Step 7: Create Your .env.local File

In the `briefcase` project folder, create a file called `.env.local` with these values:

```
AUTH0_SECRET=PASTE_A_RANDOM_STRING_HERE
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR-AUTH0-DOMAIN
AUTH0_CLIENT_ID=YOUR_AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET=YOUR_AUTH0_CLIENT_SECRET
AUTH0_AUDIENCE=https://briefcase-api

GOOGLE_GENERATIVE_AI_API_KEY=YOUR_GEMINI_API_KEY
```

To generate the random string for AUTH0_SECRET, open a terminal and run:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 8: Verify Auth0 Works

1. Make sure the dev server is running: `npm run dev`
2. Go to http://localhost:3000/api/auth/login
3. You should be redirected to Auth0's login page
4. Log in with your Google account
5. After login, go to http://localhost:3000/api/auth/me
6. You should see your user info as JSON

If step 5 fails, check:
- Callback URL in Auth0 matches exactly: `http://localhost:3000/api/auth/callback`
- .env.local values are correct (no trailing spaces)
- Dev server was restarted after creating .env.local

---

## What Happens After This

Once you've completed these steps and `.env.local` is set up, tell me and I'll:
1. Test the Auth0 login flow
2. Test the Token Vault token exchange
3. Connect everything to the real Gmail/Calendar/Slack APIs

You do NOT need to set up Vercel or the database right now -- I handle those.
