# 🔐 OAuth 2.0 / OpenID Connect - MERN Stack

<div align="center">

![OAuth 2.0](https://img.shields.io/badge/OAuth-2.0-blue?style=for-the-badge&logo=oauth)
![OpenID Connect](https://img.shields.io/badge/OpenID-Connect-orange?style=for-the-badge)
![PKCE](https://img.shields.io/badge/PKCE-S256-green?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb)

**A complete OAuth 2.0 Authorization Server implementation using the MERN stack**

*Authorization Code Flow with PKCE • OpenID Connect • JWT Authentication • Tailwind CSS*

</div>

---

## 📋 Table of Contents

- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Security Features](#-security-features)
- [API Endpoints](#-api-endpoints)
- [Technology Stack](#-technology-stack)
- [Configuration](#-configuration)
- [Flow Summary](#-flow-summary)
- [True SSO](#-true-sso-single-sign-on)
- [Production Deployment](#-production-deployment)

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            OAuth 2.0 / OIDC Architecture                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│    ┌───────────────────┐                          ┌───────────────────┐        │
│    │                   │                          │                   │        │
│    │      APP A        │◄────── OAuth 2.0 ───────►│      APP B        │        │
│    │  Authorization    │         Tokens           │  Client           │        │
│    │     Server        │                          │  Application      │        │
│    │                   │                          │                   │        │
│    │  ┌─────────────┐  │                          │  ┌─────────────┐  │        │
│    │  │   Server    │  │                          │  │   Server    │  │        │
│    │  │  Port 5001  │  │                          │  │  Port 5002  │  │        │
│    │  └─────────────┘  │                          │  └─────────────┘  │        │
│    │  ┌─────────────┐  │                          │  ┌─────────────┐  │        │
│    │  │   Client    │  │                          │  │   Client    │  │        │
│    │  │  Port 3001  │  │                          │  │  Port 3002  │  │        │
│    │  └─────────────┘  │                          │  └─────────────┘  │        │
│    │                   │                          │                   │        │
│    └───────────────────┘                          └───────────────────┘        │
│             │                                              │                    │
│             │                    ┌─────────┐               │                    │
│             └────────────────────│ MongoDB │───────────────┘                    │
│                                  └─────────┘                                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### OAuth 2.0 Authorization Code Flow with PKCE

```
    ┌────────────┐                                                           ┌────────────┐
    │            │                                                           │            │
    │   USER     │                                                           │   APP B    │
    │  BROWSER   │                                                           │   CLIENT   │
    │            │                                                           │            │
    └─────┬──────┘                                                           └─────┬──────┘
          │                                                                        │
          │ 1. Click "Login with OAuth 2.0"                                        │
          │ ────────────────────────────────────────────────────────────────────── │
          │                                                                        │
          │                         ┌──────────────────────────────────────────────┤
          │                         │  2. Generate PKCE:                           │
          │                         │     • code_verifier (random 64 chars)        │
          │                         │     • code_challenge = SHA256(code_verifier) │
          │                         │     • state (CSRF token)                     │
          │                         └──────────────────────────────────────────────┤
          │                                                                        │
          │ 3. Redirect to App A: /oauth/authorize?                                │
          │    client_id=app-b-client&response_type=code&                          │
          │    redirect_uri=...&scope=openid profile email&                        │
          │    state=xyz&code_challenge=abc&code_challenge_method=S256             │
          │ ◄──────────────────────────────────────────────────────────────────────│
          │                                                                        │
          │                           ┌────────────┐                               │
          │                           │            │                               │
          │                           │   APP A    │                               │
          │                           │   AUTH     │                               │
          │                           │   SERVER   │                               │
          │                           │            │                               │
          │                           └─────┬──────┘                               │
          │                                 │                                      │
          │ 4. Authorization Request        │                                      │
          │ ───────────────────────────────►│                                      │
          │                                 │                                      │
          │ 5. If not logged in:            │                                      │
          │    Show Login Page              │                                      │
          │ ◄───────────────────────────────│                                      │
          │                                 │                                      │
          │ 6. User enters credentials      │                                      │
          │ ───────────────────────────────►│                                      │
          │                                 │                                      │
          │ 7. First-party client (app-b):  │                                      │
          │    Auto-approve (no consent)    │                                      │
          │    ─────────────────────────────│                                      │
          │    Third-party client:          │                                      │
          │    Show consent screen          │                                      │
          │                                 │                                      │
          │                                 │ 8. Generate Authorization Code       │
          │                                 │    (short-lived, one-time use)       │
          │                                 │                                      │
          │ 9. Redirect: redirect_uri?code=AUTH_CODE&state=xyz                     │
          │ ◄───────────────────────────────│                                      │
          │                                 │                                      │
          │ 10. Callback with code          │                                      │
          │ ────────────────────────────────────────────────────────────────────── │
          │                                                                        │
          │                         ┌──────────────────────────────────────────────┤
          │                         │  11. Verify state parameter matches          │
          │                         └──────────────────────────────────────────────┤
          │                                                                        │
          │                                 │ 12. POST /oauth/token                 │
          │                                 │     grant_type=authorization_code    │
          │                                 │     code=AUTH_CODE                   │
          │                                 │     code_verifier=...                │
          │                                 │     client_id=app-b-client           │
          │                                 │ ◄─────────────────────────────────── │
          │                                 │                                      │
          │                                 │ 13. Validate:                        │
          │                                 │     • Authorization code             │
          │                                 │     • PKCE code_challenge            │
          │                                 │     • Client credentials             │
          │                                 │                                      │
          │                                 │ 14. Return Tokens:                   │
          │                                 │     {                                │
          │                                 │       access_token: "...",           │
          │                                 │       refresh_token: "...",          │
          │                                 │       id_token: "..." (OIDC)         │
          │                                 │     }                                │
          │                                 │ ────────────────────────────────────►│
          │                                 │                                      │
          │ 15. User Authenticated! Show Dashboard                                 │
          │ ◄──────────────────────────────────────────────────────────────────────│
          │                                                                        │
          ▼                                                                        ▼
```

### Silent SSO Flow (prompt=none)

```
    ┌────────────┐                                                           ┌────────────┐
    │            │                                                           │            │
    │   USER     │                                                           │   APP B    │
    │  BROWSER   │                                                           │   CLIENT   │
    │            │                                                           │            │
    └─────┬──────┘                                                           └─────┬──────┘
          │                                                                        │
          │ 1. User visits App B (already logged in at App A)                      │
          │ ────────────────────────────────────────────────────────────────────── │
          │                                                                        │
          │                         ┌──────────────────────────────────────────────┤
          │                         │  2. Auto-SSO Check:                          │
          │                         │     • Not logged in locally?                 │
          │                         │     • No user_logged_out flag?               │
          │                         │     • SSO not already attempted?             │
          │                         └──────────────────────────────────────────────┤
          │                                                                        │
          │ 3. Silent redirect with prompt=none (hidden iframe/redirect)           │
          │    /oauth/authorize?...&prompt=none                                    │
          │ ◄──────────────────────────────────────────────────────────────────────│
          │                                                                        │
          │                           ┌────────────┐                               │
          │                           │   APP A    │                               │
          │                           │   AUTH     │                               │
          │                           │   SERVER   │                               │
          │                           └─────┬──────┘                               │
          │                                 │                                      │
          │ 4. Check if user has session    │                                      │
          │ ───────────────────────────────►│                                      │
          │                                 │                                      │
          │ ┌───────────────────────────────┴───────────────────────────────┐      │
          │ │  IF session exists:                                           │      │
          │ │    → Auto-authorize silently (no UI)                          │      │
          │ │    → Return authorization code                                │      │
          │ │    → User auto-logged into App B ✅                           │      │
          │ ├───────────────────────────────────────────────────────────────┤      │
          │ │  IF no session:                                               │      │
          │ │    → Return error=login_required                              │      │
          │ │    → User sees normal App B landing page                      │      │
          │ └───────────────────────────────────────────────────────────────┘      │
          │                                                                        │
          ▼                                                                        ▼
```

---

## 📁 Project Structure

```
📦 sso_custom/
├── 📄 package.json                 # Root scripts for managing all apps
├── 📄 README.md
├── 📄 .gitignore
│
├── 📂 app-a/                       # 🔐 Authorization Server (OAuth 2.0 Provider)
│   │
│   ├── 📂 server/                  # Express.js Backend (Port 5001)
│   │   ├── 📂 src/
│   │   │   ├── 📂 config/          # Database & app configuration
│   │   │   ├── 📂 controllers/     # authController, oauth2Controller
│   │   │   ├── 📂 middleware/      # JWT authentication middleware
│   │   │   ├── 📂 models/          # User, OAuthClient, AuthorizationCode, RefreshToken
│   │   │   ├── 📂 routes/          # /api/auth, /oauth/*
│   │   │   ├── 📂 scripts/         # registerClient.js
│   │   │   ├── 📂 utils/           # tokenUtils, oauth2Utils
│   │   │   └── 📄 index.js         # Server entry point
│   │   ├── 📄 .env.example
│   │   └── 📄 package.json
│   │
│   └── 📂 client/                  # React Frontend (Port 3001)
│       ├── 📂 src/
│       │   ├── 📂 components/      # PrivateRoute, Navbar
│       │   ├── 📂 context/         # AuthContext
│       │   ├── 📂 pages/           # Login, Register, Dashboard, OAuthAuthorize
│       │   ├── 📂 services/        # API service
│       │   └── 📄 App.js
│       ├── 📄 .env.example
│       └── 📄 package.json
│
└── 📂 app-b/                       # 🌐 Client Application (OAuth 2.0 Client)
    │
    ├── 📂 server/                  # Express.js Backend (Port 5002)
    │   ├── 📂 src/
    │   │   ├── 📂 config/          # App configuration
    │   │   ├── 📂 controllers/     # oauth2Controller
    │   │   ├── 📂 routes/          # /oauth/*
    │   │   ├── 📂 utils/           # tokenUtils, oauth2Client
    │   │   └── 📄 index.js         # Server entry point
    │   ├── 📄 .env.example
    │   └── 📄 package.json
    │
    └── 📂 client/                  # React Frontend (Port 3002)
        ├── 📂 src/
        │   ├── 📂 components/      # PrivateRoute
        │   ├── 📂 context/         # AuthContext (with PKCE)
        │   ├── 📂 pages/           # Landing, Dashboard, OAuthCallback
        │   ├── 📂 services/        # API service
        │   └── 📄 App.js
        ├── 📄 .env.example
        └── 📄 package.json
```

---

## 📦 Available Scripts

The root `package.json` provides convenience scripts:

| Script | Description |
|:-------|:------------|
| `npm run install:all` | 📥 Install dependencies for all 4 apps |
| `npm run start:app-a-server` | 🚀 Start App A backend (Port 5001) |
| `npm run start:app-a-client` | 🚀 Start App A frontend (Port 3001) |
| `npm run start:app-b-server` | 🚀 Start App B backend (Port 5002) |
| `npm run start:app-b-client` | 🚀 Start App B frontend (Port 3002) |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|:------------|:--------|
| Node.js | v18 or higher |
| MongoDB | Local or Atlas |
| npm | Latest |

### Installation

<details>
<summary><b>Step 1: Install Dependencies</b></summary>

**Option A: Using root package.json (Recommended)**
```bash
cd sso_custom
npm run install:all
```

**Option B: Manual installation**
```bash
# App A Server
cd app-a/server && npm install

# App A Client  
cd ../client && npm install

# App B Server
cd ../../app-b/server && npm install

# App B Client
cd ../client && npm install
```
</details>

<details>
<summary><b>Step 2: Configure Environment Variables</b></summary>

```bash
# Copy example files
cp app-a/server/.env.example app-a/server/.env
cp app-a/client/.env.example app-a/client/.env
cp app-b/server/.env.example app-b/server/.env
cp app-b/client/.env.example app-b/client/.env
```

Default values work for local development.
</details>

<details>
<summary><b>Step 3: Register OAuth Client</b></summary>

**⚠️ IMPORTANT:** You must register the OAuth client in the database before testing:

```bash
cd app-a/server
node src/scripts/registerClient.js
```

**Output:**
```
=== OAuth 2.0 Client Registered ===

Client Name: App B
Client ID: app-b-client
Client Secret: <generated-secret>

Redirect URIs:
  - http://localhost:3002/oauth/callback

Allowed Scopes: openid, profile, email

=== IMPORTANT ===
Add these to App B server .env file:
OAUTH_CLIENT_ID=app-b-client
OAUTH_CLIENT_SECRET=<generated-secret>
```

**Then update App B server `.env`:**
```bash
# Add the credentials from the script output
OAUTH_CLIENT_ID=app-b-client
OAUTH_CLIENT_SECRET=<paste-secret-from-output>
```

> 💡 **Tip:** Use `--force` flag to re-register: `node src/scripts/registerClient.js --force`
</details>

### Running the Applications

Open **4 terminals** and run:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Terminal 1                      Terminal 2                                │
│   ───────────────────────         ───────────────────────                   │
│   cd app-a/server                 cd app-a/client                           │
│   npm run dev                     npm start                                 │
│   🟢 Port 5001                    🟢 Port 3001                              │
│                                                                             │
│   Terminal 3                      Terminal 4                                │
│   ───────────────────────         ───────────────────────                   │
│   cd app-b/server                 cd app-b/client                           │
│   npm run dev                     npm start                                 │
│   🟢 Port 5002                    🟢 Port 3002                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Testing the OAuth 2.0 Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Quick Test Guide                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1️⃣  Open http://localhost:3002 (App B)                                   │
│                                                                             │
│   2️⃣  Click "Login with OAuth 2.0"                                         │
│                                                                             │
│   3️⃣  Redirected to App A → Login or Register                              │
│                                                                             │
│   4️⃣  Auto-authorized (first-party client, no consent screen)              │
│                                                                             │
│   5️⃣  Redirected back to App B → Authenticated! ✅                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Testing True SSO (Silent Authentication)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SSO Test Guide                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Test 1: SSO Auto-Login                                                    │
│   ──────────────────────                                                    │
│   1️⃣  Open http://localhost:3001 (App A) and login                         │
│   2️⃣  Open http://localhost:3002 (App B) in same browser                   │
│   3️⃣  App B automatically logs you in! ✅ (silent SSO)                     │
│                                                                             │
│   Test 2: Logout Persistence                                                │
│   ──────────────────────────                                                │
│   1️⃣  While logged into both apps, click "Logout" on App B                 │
│   2️⃣  Refresh App B → You stay logged out ✅                               │
│   3️⃣  Click "Login with OAuth 2.0" → Manual login works ✅                 │
│                                                                             │
│   Test 3: No Session                                                        │
│   ──────────────────                                                        │
│   1️⃣  Clear all browser data / open incognito                              │
│   2️⃣  Open http://localhost:3002 (App B)                                   │
│   3️⃣  See landing page (silent SSO check fails gracefully) ✅              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Features

### OAuth 2.0 / OIDC Security

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Security Features                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   🛡️  PKCE (RFC 7636)           Prevents authorization code interception   │
│   🔒  State Parameter           CSRF protection via random token            │
│   🎫  Authorization Code Flow   Secure flow for web applications            │
│   🪪  ID Tokens (OIDC)          JWT with user identity claims               │
│   🔑  Access Tokens             Short-lived API access tokens               │
│   🔄  Refresh Tokens            Long-lived token renewal                    │
│   📝  Client Registration       Only registered clients allowed             │
│   🔗  Redirect URI Validation   Prevents open redirect attacks              │
│   ❌  Token Revocation          Ability to invalidate tokens                │
│   🔇  Silent Auth (prompt=none) True SSO without UI interaction             │
│   👤  First-Party Auto-Approve  Trusted clients skip consent screen         │
│   🚪  Logout Persistence        Respects user's explicit logout choice      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Standards Compliance

| Standard | Status | Description |
|:---------|:------:|:------------|
| **RFC 6749** | ✅ | OAuth 2.0 Authorization Framework |
| **RFC 7636** | ✅ | PKCE Extension (S256 method) |
| **OpenID Connect Core 1.0** | ✅ | ID Tokens, UserInfo endpoint |
| **OpenID Connect Discovery** | ✅ | `.well-known/openid-configuration` |
| **OIDC prompt Parameter** | ✅ | `prompt=none` for silent SSO (Section 3.1.2.1) |
| **OIDC Error Responses** | ✅ | `login_required` error (Section 3.1.2.6) |

### Best Practices

| Practice | Implementation |
|:---------|:---------------|
| Password Hashing | bcrypt (12 salt rounds) |
| CORS | Specific origins only |
| Input Validation | Server-side sanitization |
| Error Handling | No internal details exposed |
| Architecture | MVC pattern |
| Cookies | HTTP-only, Secure flag |

---

## 📡 API Endpoints

### App A - Authorization Server (Port 5001)

<details>
<summary><b>🔐 Authentication Endpoints</b></summary>

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login user | ❌ |
| `POST` | `/api/auth/logout` | Logout user | ✅ |
| `GET` | `/api/auth/me` | Get current user | ✅ |
| `GET` | `/api/auth/verify` | Verify JWT token | ✅ |

</details>

<details>
<summary><b>🔑 OAuth 2.0 / OIDC Endpoints</b></summary>

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| `GET` | `/.well-known/openid-configuration` | OIDC Discovery | ❌ |
| `GET` | `/.well-known/jwks.json` | JSON Web Key Set | ❌ |
| `GET` | `/oauth/authorize` | Authorization endpoint | 🔓 |
| `POST` | `/oauth/token` | Token endpoint | 🔐 |
| `GET` | `/oauth/userinfo` | Get user info | 🎫 |
| `POST` | `/oauth/revoke` | Revoke token | 🔐 |

> 🔓 = Login required | 🔐 = Client auth | 🎫 = Access token

</details>

### App B - Client Application (Port 5002)

<details>
<summary><b>� OAuth 2.0 Client Endpoints</b></summary>

| Method | Endpoint | Description | Auth |
|:------:|:---------|:------------|:----:|
| `POST` | `/oauth/callback` | Exchange code for tokens (PKCE) | ❌ |
| `POST` | `/oauth/refresh` | Refresh access token | ❌ |
| `POST` | `/oauth/logout` | Logout with token revocation | ❌ |
| `GET` | `/oauth/me` | Get current user | 🎫 |

> 🎫 = Access token required

</details>

---

## 🎨 Technology Stack

<div align="center">

| Layer | Technology |
|:-----:|:-----------|
| **Frontend** | ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![Router](https://img.shields.io/badge/Router-v6-CA4245?logo=react-router) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss) |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js) ![Express](https://img.shields.io/badge/Express.js-4.x-000000?logo=express) |
| **Database** | ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb) ![Mongoose](https://img.shields.io/badge/Mongoose-880000?logo=mongoose) |
| **Auth** | ![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens) ![OAuth](https://img.shields.io/badge/OAuth_2.0-blue) ![OIDC](https://img.shields.io/badge/OpenID_Connect-orange) |

</div>

---

## 🔧 Configuration

### Environment Variables

<details>
<summary><b>App A Server</b> (<code>app-a/server/.env</code>)</summary>

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/oauth_auth
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:3001
APP_B_URL=http://localhost:3002
```
</details>

<details>
<summary><b>App A Client</b> (<code>app-a/client/.env</code>)</summary>

```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_APP_B_URL=http://localhost:3002
PORT=3001
```
</details>

<details>
<summary><b>App B Server</b> (<code>app-b/server/.env</code>)</summary>

```env
PORT=5002
NODE_ENV=development
JWT_SECRET=app-b-secret-key-change-in-production
JWT_EXPIRES_IN=1d
APP_A_SERVER_URL=http://localhost:5001
CLIENT_URL=http://localhost:3002
APP_A_URL=http://localhost:3001
OAUTH_CLIENT_ID=app-b-client
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URI=http://localhost:3002/oauth/callback
```
</details>

<details>
<summary><b>App B Client</b> (<code>app-b/client/.env</code>)</summary>

```env
REACT_APP_OAUTH_URL=http://localhost:5002/oauth
REACT_APP_APP_A_URL=http://localhost:3001
REACT_APP_OAUTH_CLIENT_ID=app-b-client
REACT_APP_OAUTH_REDIRECT_URI=http://localhost:3002/oauth/callback
PORT=3002
```
</details>

---

## 🔑 OAuth 2.0 Client Registration

Register App B as an OAuth client before testing:

```bash
cd app-a/server
node src/scripts/registerClient.js
```

**Output:**
```
═══════════════════════════════════════════
   OAuth 2.0 Client Registered Successfully
═══════════════════════════════════════════
   Client ID:     app-b-client
   Redirect URI:  http://localhost:3002/oauth/callback
   Scopes:        openid profile email
═══════════════════════════════════════════
```

---

## 📝 Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   OAuth 2.0 Authorization Code Flow + PKCE                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Step 1   User clicks "Login with OAuth 2.0" on App B                      │
│      ↓                                                                      │
│   Step 2   App B generates PKCE parameters:                                 │
│            • code_verifier (64-char random string)                          │
│            • code_challenge (SHA-256 hash, base64url)                       │
│            • state (CSRF protection token)                                  │
│      ↓                                                                      │
│   Step 3   Redirect to App A with authorization request                     │
│      ↓                                                                      │
│   Step 4   User authenticates on App A (if not already logged in)           │
│      ↓                                                                      │
│   Step 5   First-party client: Auto-approve (no consent screen)             │
│            Third-party client: Show consent screen                          │
│      ↓                                                                      │
│   Step 6   Authorization code generated                                     │
│      ↓                                                                      │
│   Step 7   Redirect back to App B with code + state                         │
│      ↓                                                                      │
│   Step 8   App B verifies state matches                                     │
│      ↓                                                                      │
│   Step 9   App B exchanges code + code_verifier for tokens                  │
│      ↓                                                                      │
│   Step 10  App A validates PKCE and issues tokens                           │
│      ↓                                                                      │
│   Step 11  User authenticated in App B ✅                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 True SSO (Single Sign-On)

This implementation supports **True SSO** using OpenID Connect's `prompt=none` parameter, enabling seamless authentication across applications.

### How SSO Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Silent SSO Authentication Flow                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User visits App B (not logged in locally)                                 │
│      ↓                                                                      │
│   App B checks: Is user already logged in at App A?                         │
│      ↓                                                                      │
│   App B sends silent auth request with prompt=none                          │
│      ↓                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  If user IS logged in at App A:                                     │   │
│   │    → Authorization code returned silently                           │   │
│   │    → User automatically logged into App B ✅                        │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │  If user is NOT logged in at App A:                                 │   │
│   │    → Returns error: login_required                                  │   │
│   │    → User sees normal App B landing page                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### SSO Features

| Feature | Description | OIDC Standard |
|:--------|:------------|:-------------:|
| **Silent Authentication** | `prompt=none` checks for existing session without UI | ✅ Section 3.1.2.1 |
| **First-Party Auto-Approve** | Trusted clients skip consent screen | ✅ Section 3.1.2.4 |
| **login_required Error** | Returned when user not authenticated | ✅ Section 3.1.2.6 |
| **Logout Persistence** | `user_logged_out` flag prevents unwanted auto-SSO | Industry Standard |

### SSO User Experience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SSO Scenario Examples                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Scenario 1: User logs into App A first                                    │
│   ─────────────────────────────────────                                     │
│   1. User logs in at http://localhost:3001 (App A)                          │
│   2. User visits http://localhost:3002 (App B)                              │
│   3. App B detects session at App A → Auto-login! ✅                        │
│   4. No login form, no consent screen                                       │
│                                                                             │
│   Scenario 2: User logs out of App B                                        │
│   ─────────────────────────────────────                                     │
│   1. User clicks "Logout" on App B                                          │
│   2. user_logged_out flag set in sessionStorage                             │
│   3. User stays logged out of App B (respects their choice)                 │
│   4. User can still manually click "Login with OAuth 2.0" to re-login       │
│                                                                             │
│   Scenario 3: Fresh visit (no session anywhere)                             │
│   ─────────────────────────────────────────────                             │
│   1. User visits http://localhost:3002 (App B)                              │
│   2. Silent SSO check fails (no session at App A)                           │
│   3. User sees normal landing page with "Login" button                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation Details

**App B Client - Auto-SSO Check** (`AuthContext.js`):
```javascript
// On page load, attempt silent SSO
useEffect(() => {
  const userLoggedOut = sessionStorage.getItem('user_logged_out') === 'true';
  
  if (!user && !loading && !ssoAttempted && !userLoggedOut) {
    attemptSilentSSO();  // Try prompt=none
  }
}, [user, loading]);
```

**App A Authorization Server** (`OAuthAuthorize.js`):
```javascript
// Handle prompt=none (silent authentication)
if (prompt === 'none') {
  if (!isAuthenticated) {
    // Return OIDC-compliant error
    redirect(`${redirectUri}?error=login_required&state=${state}`);
  } else {
    // Auto-authorize silently
    autoAuthorize();
  }
}
```

### Standards Compliance

This SSO implementation follows:

| Standard | Reference | Our Implementation |
|:---------|:----------|:-------------------|
| **OIDC Core 1.0** | Section 3.1.2.1 | `prompt=none` for silent auth |
| **OIDC Core 1.0** | Section 3.1.2.3 | "MUST NOT interact" when prompt=none |
| **OIDC Core 1.0** | Section 3.1.2.6 | `login_required` error response |
| **OIDC Core 1.0** | Section 3.1.2.4 | Pre-configured consent for first-party |

---

## 🚢 Production Deployment

### Deployment Checklist

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Production Checklist                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ☐  Use HTTPS for all services (required for OAuth 2.0)                    │
│   ☐  Set NODE_ENV=production                                                │
│   ☐  Generate secure, random JWT secrets                                    │
│   ☐  Configure proper CORS origins                                          │
│   ☐  Set up MongoDB authentication                                          │
│   ☐  Use process manager (PM2)                                              │
│   ☐  Build React apps: npm run build                                        │
│   ☐  Register OAuth clients with production URIs                            │
│   ☐  Enable secure cookies (sameSite: 'strict', secure: true)               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### OAuth 2.0 Security Checklist

| Item | Status |
|:-----|:------:|
| HTTPS enabled on all endpoints | ☐ |
| Strong client secrets generated | ☐ |
| Redirect URIs validated strictly | ☐ |
| Token expiration configured | ☐ |
| Rate limiting on token endpoint | ☐ |
| Refresh token rotation enabled | ☐ |
| Audit logging for auth events | ☐ |

---

## 📄 License

<div align="center">

**MIT License** - feel free to use this for your projects!

---

Made with ❤️ using the MERN Stack

</div>
