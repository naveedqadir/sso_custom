# OAuth 2.0 SSO Integration Guide

## Complete Implementation Guide for Cross-Team OAuth 2.0 Integration

**App A (Authorization Server):** Java Web Application - Maintained by Team A  
**App B (Client Application):** Next.js Application - Maintained by Team B (You)

---

## Table of Contents

1. [Overview](#overview)
2. [OAuth 2.0 Flow Diagram](#oauth-20-flow-diagram)
3. [Architecture Diagram](#architecture-diagram)
4. [Team Responsibilities](#team-responsibilities)
5. [What Team A (Java App) Needs to Implement](#what-team-a-java-app-needs-to-implement)
6. [What Team B (Next.js App) Needs to Implement](#what-team-b-nextjs-app-needs-to-implement)
7. [Communication Contract](#communication-contract)
8. [API Endpoints Specification](#api-endpoints-specification)
9. [Data Exchange Formats](#data-exchange-formats)
10. [Security Considerations](#security-considerations)
11. [Implementation Checklist](#implementation-checklist)
12. [Testing Guide](#testing-guide)
13. [Troubleshooting](#troubleshooting)

---

## Overview

This document outlines the complete OAuth 2.0 Authorization Code Flow implementation between two applications maintained by different teams. The goal is to enable Single Sign-On (SSO) where users authenticate once on App A and can access App B without re-entering credentials.

### Key Terminology

| Term | Description |
|------|-------------|
| **Authorization Server** | App A (Java) - Handles user authentication and issues tokens |
| **Client Application** | App B (Next.js) - Consumes tokens to authenticate users |
| **Resource Owner** | The end user who owns the data |
| **Access Token** | Short-lived token for API access |
| **Refresh Token** | Long-lived token to obtain new access tokens |
| **Authorization Code** | Temporary code exchanged for tokens |

---

## OAuth 2.0 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           OAuth 2.0 Authorization Code Flow                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐                                      ┌──────────┐                    ┌──────────┐
    │          │                                      │          │                    │          │
    │   User   │                                      │  App B   │                    │  App A   │
    │ (Browser)│                                      │ (Next.js)│                    │  (Java)  │
    │          │                                      │  Client  │                    │Auth Server│
    └────┬─────┘                                      └────┬─────┘                    └────┬─────┘
         │                                                 │                               │
         │  1. User clicks "Login with App A"              │                               │
         │────────────────────────────────────────────────>│                               │
         │                                                 │                               │
         │  2. Redirect to App A Authorization Endpoint    │                               │
         │<────────────────────────────────────────────────│                               │
         │     /oauth/authorize?                           │                               │
         │       client_id=APP_B_CLIENT_ID                 │                               │
         │       &redirect_uri=https://app-b.com/callback  │                               │
         │       &response_type=code                       │                               │
         │       &scope=openid profile email               │                               │
         │       &state=random_state_string                │                               │
         │                                                 │                               │
         │  3. User authenticates on App A                 │                               │
         │────────────────────────────────────────────────────────────────────────────────>│
         │                                                 │                               │
         │  4. App A shows consent screen (if required)    │                               │
         │<────────────────────────────────────────────────────────────────────────────────│
         │                                                 │                               │
         │  5. User grants permission                      │                               │
         │────────────────────────────────────────────────────────────────────────────────>│
         │                                                 │                               │
         │  6. Redirect back to App B with authorization code                              │
         │<────────────────────────────────────────────────────────────────────────────────│
         │     /callback?code=AUTH_CODE&state=random_state_string                          │
         │                                                 │                               │
         │  7. Browser follows redirect to App B           │                               │
         │────────────────────────────────────────────────>│                               │
         │                                                 │                               │
         │                                                 │  8. Exchange code for tokens  │
         │                                                 │  POST /oauth/token            │
         │                                                 │────────────────────────────────>│
         │                                                 │                               │
         │                                                 │  9. Return access_token,      │
         │                                                 │     refresh_token, id_token   │
         │                                                 │<────────────────────────────────│
         │                                                 │                               │
         │                                                 │  10. Fetch user info (optional)│
         │                                                 │  GET /oauth/userinfo           │
         │                                                 │────────────────────────────────>│
         │                                                 │                               │
         │                                                 │  11. Return user profile      │
         │                                                 │<────────────────────────────────│
         │                                                 │                               │
         │  12. Set session/cookie, redirect to dashboard  │                               │
         │<────────────────────────────────────────────────│                               │
         │                                                 │                               │
    ┌────┴─────┐                                      ┌────┴─────┐                    ┌────┴─────┐
    │   User   │                                      │  App B   │                    │  App A   │
    │(Logged In)│                                     │          │                    │          │
    └──────────┘                                      └──────────┘                    └──────────┘
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              System Architecture                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────┐
                                    │    End User     │
                                    │    (Browser)    │
                                    └────────┬────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                          ▼                  │                  ▼
              ┌───────────────────┐          │      ┌───────────────────┐
              │                   │          │      │                   │
              │   App B (Next.js) │          │      │   App A (Java)    │
              │   Client App      │          │      │   Auth Server     │
              │                   │          │      │                   │
              │  ┌─────────────┐  │          │      │  ┌─────────────┐  │
              │  │  Frontend   │  │          │      │  │  Frontend   │  │
              │  │  (React)    │◄─┼──────────┘      │  │  (JSP/      │  │
              │  └──────┬──────┘  │                 │  │  Thymeleaf) │  │
              │         │         │                 │  └──────┬──────┘  │
              │         ▼         │                 │         │         │
              │  ┌─────────────┐  │                 │         ▼         │
              │  │  Backend    │  │   HTTP/HTTPS    │  ┌─────────────┐  │
              │  │  (Next.js   │◄─┼────────────────►│  │  Backend    │  │
              │  │   API)      │  │                 │  │  (Spring    │  │
              │  └──────┬──────┘  │                 │  │   Boot)     │  │
              │         │         │                 │  └──────┬──────┘  │
              └─────────┼─────────┘                 └─────────┼─────────┘
                        │                                     │
                        ▼                                     ▼
              ┌───────────────────┐                 ┌───────────────────┐
              │  App B Database   │                 │  App A Database   │
              │  (User Sessions,  │                 │  (Users, Clients, │
              │   App-specific)   │                 │   Tokens, Codes)  │
              └───────────────────┘                 └───────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              Token Exchange Flow                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────────────────────────────┐
    │                                App B (Next.js)                                     │
    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
    │  │  /api/auth/ │    │  /api/auth/ │    │  /api/auth/ │    │  /api/auth/ │        │
    │  │   login     │───►│  callback   │───►│  refresh    │    │   logout    │        │
    │  └─────────────┘    └──────┬──────┘    └─────────────┘    └─────────────┘        │
    │                            │                                                       │
    └────────────────────────────┼───────────────────────────────────────────────────────┘
                                 │
                                 │  Token Exchange
                                 ▼
    ┌───────────────────────────────────────────────────────────────────────────────────┐
    │                                App A (Java)                                        │
    │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
    │  │  /oauth/    │    │  /oauth/    │    │  /oauth/    │    │  /oauth/    │        │
    │  │  authorize  │    │   token     │    │  userinfo   │    │   revoke    │        │
    │  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘        │
    │                                                                                    │
    └───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Team Responsibilities

### Summary Table

| Component | Team A (Java App) | Team B (Next.js App) |
|-----------|-------------------|----------------------|
| User Database | ✅ Implement | ❌ Not needed |
| User Registration | ✅ Implement | ❌ Not needed |
| User Login UI | ✅ Implement | ❌ Not needed |
| OAuth Client Registry | ✅ Implement | ❌ Not needed |
| Authorization Endpoint | ✅ Implement | ❌ Not needed |
| Token Endpoint | ✅ Implement | ❌ Not needed |
| UserInfo Endpoint | ✅ Implement | ❌ Not needed |
| Token Revocation | ✅ Implement | ❌ Not needed |
| JWT Signing | ✅ Implement | ❌ Not needed |
| OAuth Client (Consumer) | ❌ Not needed | ✅ Implement |
| Callback Handler | ❌ Not needed | ✅ Implement |
| Token Storage | ❌ Not needed | ✅ Implement |
| Token Refresh Logic | ❌ Not needed | ✅ Implement |
| Protected Routes | ❌ Not needed | ✅ Implement |
| Session Management | ❌ Not needed | ✅ Implement |

---

## What Team A (Java App) Needs to Implement

### 1. Database Schema

Team A must create and maintain the following database tables:

```sql
-- Users Table
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OAuth Clients Table (to register App B)
CREATE TABLE oauth_clients (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(100) UNIQUE NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    redirect_uris TEXT NOT NULL,  -- JSON array of allowed redirect URIs
    allowed_scopes VARCHAR(500) DEFAULT 'openid profile email',
    token_expiry_seconds INT DEFAULT 3600,
    refresh_token_expiry_seconds INT DEFAULT 604800,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Authorization Codes Table
CREATE TABLE authorization_codes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    user_id BIGINT NOT NULL,
    redirect_uri VARCHAR(500) NOT NULL,
    scope VARCHAR(500),
    code_challenge VARCHAR(255),  -- For PKCE
    code_challenge_method VARCHAR(10),  -- For PKCE
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    token VARCHAR(255) UNIQUE NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    user_id BIGINT NOT NULL,
    scope VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 2. API Endpoints to Implement

#### 2.1 Authorization Endpoint

```
GET /oauth/authorize
```

**Purpose:** Initiates the OAuth flow, shows login/consent UI

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| client_id | Yes | The client ID of App B |
| redirect_uri | Yes | Where to redirect after authorization |
| response_type | Yes | Must be "code" |
| scope | No | Space-separated list of scopes (e.g., "openid profile email") |
| state | Recommended | Random string to prevent CSRF |
| code_challenge | For PKCE | Base64URL encoded SHA256 hash of code_verifier |
| code_challenge_method | For PKCE | Must be "S256" |

**Response:** Redirects to redirect_uri with:
- `code`: The authorization code
- `state`: The same state value sent in request

**Error Response:** Redirects to redirect_uri with:
- `error`: Error code (e.g., "invalid_request", "unauthorized_client")
- `error_description`: Human-readable error description
- `state`: The same state value sent in request

---

#### 2.2 Token Endpoint

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded
```

**Purpose:** Exchange authorization code for tokens

**Request Body (Authorization Code Grant):**
| Parameter | Required | Description |
|-----------|----------|-------------|
| grant_type | Yes | Must be "authorization_code" |
| code | Yes | The authorization code received |
| redirect_uri | Yes | Must match the original redirect_uri |
| client_id | Yes | The client ID |
| client_secret | Yes | The client secret |
| code_verifier | For PKCE | The original code verifier |

**Request Body (Refresh Token Grant):**
| Parameter | Required | Description |
|-----------|----------|-------------|
| grant_type | Yes | Must be "refresh_token" |
| refresh_token | Yes | The refresh token |
| client_id | Yes | The client ID |
| client_secret | Yes | The client secret |

**Success Response:**
```json
{
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "scope": "openid profile email",
    "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response:**
```json
{
    "error": "invalid_grant",
    "error_description": "The authorization code has expired"
}
```

---

#### 2.3 UserInfo Endpoint

```
GET /oauth/userinfo
Authorization: Bearer <access_token>
```

**Purpose:** Retrieve authenticated user's profile information

**Success Response:**
```json
{
    "sub": "user-uuid-12345",
    "email": "user@example.com",
    "email_verified": true,
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "picture": "https://example.com/avatar.jpg",
    "updated_at": 1609459200
}
```

**Error Response:**
```json
{
    "error": "invalid_token",
    "error_description": "The access token is expired or invalid"
}
```

---

#### 2.4 Token Revocation Endpoint

```
POST /oauth/revoke
Content-Type: application/x-www-form-urlencoded
```

**Purpose:** Revoke a token (for logout)

**Request Body:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| token | Yes | The token to revoke |
| token_type_hint | No | Either "access_token" or "refresh_token" |
| client_id | Yes | The client ID |
| client_secret | Yes | The client secret |

**Response:** HTTP 200 (even if token was already invalid)

---

#### 2.5 JWKS Endpoint (for JWT verification)

```
GET /.well-known/jwks.json
```

**Purpose:** Provide public keys for JWT verification

**Response:**
```json
{
    "keys": [
        {
            "kty": "RSA",
            "kid": "key-id-1",
            "use": "sig",
            "alg": "RS256",
            "n": "base64url-encoded-modulus",
            "e": "AQAB"
        }
    ]
}
```

---

#### 2.6 OpenID Configuration Endpoint

```
GET /.well-known/openid-configuration
```

**Purpose:** Discovery document for OAuth/OIDC configuration

**Response:**
```json
{
    "issuer": "https://app-a.example.com",
    "authorization_endpoint": "https://app-a.example.com/oauth/authorize",
    "token_endpoint": "https://app-a.example.com/oauth/token",
    "userinfo_endpoint": "https://app-a.example.com/oauth/userinfo",
    "revocation_endpoint": "https://app-a.example.com/oauth/revoke",
    "jwks_uri": "https://app-a.example.com/.well-known/jwks.json",
    "response_types_supported": ["code"],
    "grant_types_supported": ["authorization_code", "refresh_token"],
    "subject_types_supported": ["public"],
    "id_token_signing_alg_values_supported": ["RS256"],
    "scopes_supported": ["openid", "profile", "email"],
    "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"],
    "code_challenge_methods_supported": ["S256"]
}
```

---

### 3. Java Spring Boot Implementation Example

#### 3.1 Project Structure (Team A)

```
app-a-java/
├── pom.xml
├── src/
│   └── main/
│       ├── java/
│       │   └── com/
│       │       └── example/
│       │           └── authserver/
│       │               ├── AuthServerApplication.java
│       │               ├── config/
│       │               │   ├── SecurityConfig.java
│       │               │   └── JwtConfig.java
│       │               ├── controller/
│       │               │   ├── AuthController.java
│       │               │   ├── OAuthController.java
│       │               │   └── WellKnownController.java
│       │               ├── dto/
│       │               │   ├── TokenRequest.java
│       │               │   ├── TokenResponse.java
│       │               │   └── UserInfoResponse.java
│       │               ├── entity/
│       │               │   ├── User.java
│       │               │   ├── OAuthClient.java
│       │               │   ├── AuthorizationCode.java
│       │               │   └── RefreshToken.java
│       │               ├── repository/
│       │               │   ├── UserRepository.java
│       │               │   ├── OAuthClientRepository.java
│       │               │   ├── AuthorizationCodeRepository.java
│       │               │   └── RefreshTokenRepository.java
│       │               ├── service/
│       │               │   ├── UserService.java
│       │               │   ├── OAuthService.java
│       │               │   └── JwtService.java
│       │               └── exception/
│       │                   └── OAuthException.java
│       └── resources/
│           ├── application.yml
│           └── templates/
│               ├── login.html
│               └── consent.html
```

#### 3.2 Key Dependencies (pom.xml)

```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-thymeleaf</artifactId>
    </dependency>
    
    <!-- JWT -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    
    <!-- Database -->
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

---

## What Team B (Next.js App) Needs to Implement

### 1. Project Structure (Team B)

```
app-b-nextjs/
├── package.json
├── next.config.js
├── .env.local
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── callback/
│   │   │       └── page.tsx
│   │   └── api/
│   │       └── auth/
│   │           ├── login/
│   │           │   └── route.ts
│   │           ├── callback/
│   │           │   └── route.ts
│   │           ├── refresh/
│   │           │   └── route.ts
│   │           ├── logout/
│   │           │   └── route.ts
│   │           └── me/
│   │               └── route.ts
│   ├── lib/
│   │   ├── oauth.ts
│   │   ├── session.ts
│   │   └── jwt.ts
│   ├── middleware.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   └── components/
│       ├── LoginButton.tsx
│       ├── LogoutButton.tsx
│       └── ProtectedRoute.tsx
```

### 2. Environment Variables

```env
# .env.local

# App A (Authorization Server) URLs
NEXT_PUBLIC_AUTH_SERVER_URL=https://app-a.example.com
AUTH_SERVER_URL=https://app-a.example.com

# OAuth Client Credentials (provided by Team A)
OAUTH_CLIENT_ID=app-b-client-id
OAUTH_CLIENT_SECRET=your-super-secret-client-secret

# App B URLs
NEXT_PUBLIC_APP_URL=https://app-b.example.com
OAUTH_REDIRECT_URI=https://app-b.example.com/auth/callback

# Session Secret
SESSION_SECRET=your-32-character-session-secret

# OAuth Scopes
OAUTH_SCOPES=openid profile email
```

### 3. API Routes to Implement

#### 3.1 Login Initiation Route

**File:** `src/app/api/auth/login/route.ts`

```typescript
// GET /api/auth/login
// Purpose: Generate OAuth authorization URL and redirect user

import { NextRequest, NextResponse } from 'next/server';
import { generateState, generateCodeVerifier, generateCodeChallenge } from '@/lib/oauth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    // Generate PKCE values
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Store state and code_verifier in secure HTTP-only cookies
    const cookieStore = cookies();
    cookieStore.set('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/'
    });
    cookieStore.set('oauth_code_verifier', codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600,
        path: '/'
    });
    
    // Build authorization URL
    const authUrl = new URL(`${process.env.AUTH_SERVER_URL}/oauth/authorize`);
    authUrl.searchParams.set('client_id', process.env.OAUTH_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', process.env.OAUTH_REDIRECT_URI!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', process.env.OAUTH_SCOPES!);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    return NextResponse.redirect(authUrl.toString());
}
```

---

#### 3.2 OAuth Callback Route

**File:** `src/app/api/auth/callback/route.ts`

```typescript
// GET /api/auth/callback
// Purpose: Handle OAuth callback, exchange code for tokens

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSession } from '@/lib/session';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Handle OAuth errors
    if (error) {
        console.error('OAuth error:', error, errorDescription);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=${error}`
        );
    }
    
    // Verify state parameter
    const cookieStore = cookies();
    const storedState = cookieStore.get('oauth_state')?.value;
    const codeVerifier = cookieStore.get('oauth_code_verifier')?.value;
    
    if (!state || state !== storedState) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=invalid_state`
        );
    }
    
    if (!code || !codeVerifier) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=missing_params`
        );
    }
    
    try {
        // Exchange authorization code for tokens
        const tokenResponse = await fetch(`${process.env.AUTH_SERVER_URL}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.OAUTH_REDIRECT_URI!,
                client_id: process.env.OAUTH_CLIENT_ID!,
                client_secret: process.env.OAUTH_CLIENT_SECRET!,
                code_verifier: codeVerifier,
            }).toString(),
        });
        
        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Token exchange failed:', errorData);
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=token_exchange_failed`
            );
        }
        
        const tokens = await tokenResponse.json();
        
        // Optionally fetch user info
        const userInfoResponse = await fetch(`${process.env.AUTH_SERVER_URL}/oauth/userinfo`, {
            headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
            },
        });
        
        const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : null;
        
        // Create session
        const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
        
        await createSession(response, {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in,
            user: userInfo,
        });
        
        // Clear OAuth cookies
        response.cookies.delete('oauth_state');
        response.cookies.delete('oauth_code_verifier');
        
        return response;
        
    } catch (error) {
        console.error('Callback error:', error);
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=server_error`
        );
    }
}
```

---

#### 3.3 Token Refresh Route

**File:** `src/app/api/auth/refresh/route.ts`

```typescript
// POST /api/auth/refresh
// Purpose: Refresh access token using refresh token

import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/session';

export async function POST(request: NextRequest) {
    const session = await getSession(request);
    
    if (!session?.refreshToken) {
        return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }
    
    try {
        const tokenResponse = await fetch(`${process.env.AUTH_SERVER_URL}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: session.refreshToken,
                client_id: process.env.OAUTH_CLIENT_ID!,
                client_secret: process.env.OAUTH_CLIENT_SECRET!,
            }).toString(),
        });
        
        if (!tokenResponse.ok) {
            return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
        }
        
        const tokens = await tokenResponse.json();
        
        const response = NextResponse.json({ success: true });
        await updateSession(response, {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in,
        });
        
        return response;
        
    } catch (error) {
        console.error('Refresh error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
```

---

#### 3.4 Logout Route

**File:** `src/app/api/auth/logout/route.ts`

```typescript
// POST /api/auth/logout
// Purpose: Revoke tokens and clear session

import { NextRequest, NextResponse } from 'next/server';
import { getSession, clearSession } from '@/lib/session';

export async function POST(request: NextRequest) {
    const session = await getSession(request);
    
    // Revoke tokens on Auth Server (best effort)
    if (session?.refreshToken) {
        try {
            await fetch(`${process.env.AUTH_SERVER_URL}/oauth/revoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    token: session.refreshToken,
                    token_type_hint: 'refresh_token',
                    client_id: process.env.OAUTH_CLIENT_ID!,
                    client_secret: process.env.OAUTH_CLIENT_SECRET!,
                }).toString(),
            });
        } catch (error) {
            console.error('Token revocation error:', error);
        }
    }
    
    const response = NextResponse.json({ success: true });
    clearSession(response);
    
    return response;
}
```

---

#### 3.5 Get Current User Route

**File:** `src/app/api/auth/me/route.ts`

```typescript
// GET /api/auth/me
// Purpose: Return current user info from session

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
    const session = await getSession(request);
    
    if (!session) {
        return NextResponse.json({ user: null }, { status: 401 });
    }
    
    return NextResponse.json({
        user: session.user,
        isAuthenticated: true,
    });
}
```

---

### 4. Middleware for Protected Routes

**File:** `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession, isTokenExpired } from '@/lib/session';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/settings'];
// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/auth/login'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = await getSession(request);
    
    // Check if route is protected
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
    
    if (isProtectedRoute) {
        if (!session) {
            // Redirect to login
            return NextResponse.redirect(new URL('/auth/login', request.url));
        }
        
        // Check if token is expired
        if (isTokenExpired(session)) {
            // Try to refresh token
            const refreshResponse = await fetch(`${request.nextUrl.origin}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    Cookie: request.headers.get('cookie') || '',
                },
            });
            
            if (!refreshResponse.ok) {
                // Redirect to login if refresh fails
                return NextResponse.redirect(new URL('/auth/login', request.url));
            }
        }
    }
    
    if (isAuthRoute && session) {
        // Already logged in, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/profile/:path*', '/settings/:path*', '/auth/:path*'],
};
```

---

### 5. OAuth Utility Functions

**File:** `src/lib/oauth.ts`

```typescript
import crypto from 'crypto';

// Generate random state for CSRF protection
export function generateState(): string {
    return crypto.randomBytes(32).toString('base64url');
}

// Generate code verifier for PKCE
export function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
}

// Generate code challenge from verifier (S256)
export async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(hash).toString('base64url');
}

// Parse JWT token (without verification - for client-side use only)
export function parseJwt(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            Buffer.from(base64, 'base64')
                .toString()
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}
```

---

### 6. Session Management

**File:** `src/lib/session.ts`

```typescript
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'app_b_session';
const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

interface SessionData {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    user: {
        sub: string;
        email: string;
        name: string;
        picture?: string;
    } | null;
}

export async function createSession(
    response: NextResponse,
    data: {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: any;
    }
): Promise<void> {
    const sessionData: SessionData = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
        user: data.user,
    };
    
    const sessionToken = await new SignJWT(sessionData as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(secret);
    
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });
}

export async function getSession(request: NextRequest): Promise<SessionData | null> {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionToken) {
        return null;
    }
    
    try {
        const { payload } = await jwtVerify(sessionToken, secret);
        return payload as unknown as SessionData;
    } catch {
        return null;
    }
}

export async function updateSession(
    response: NextResponse,
    updates: Partial<SessionData>
): Promise<void> {
    // Similar to createSession but merges with existing data
    const sessionData = { ...updates } as SessionData;
    
    const sessionToken = await new SignJWT(sessionData as any)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(secret);
    
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    });
}

export function clearSession(response: NextResponse): void {
    response.cookies.delete(SESSION_COOKIE_NAME);
}

export function isTokenExpired(session: SessionData): boolean {
    // Add 60 second buffer
    return Date.now() >= session.expiresAt - 60000;
}
```

---

## Communication Contract

### Information Team A Must Provide to Team B

| Item | Description | Example |
|------|-------------|---------|
| **Client ID** | Unique identifier for App B | `app-b-production` |
| **Client Secret** | Secret key for token exchange | `sk_live_abc123...` |
| **Authorization Server URL** | Base URL of App A | `https://auth.example.com` |
| **Authorization Endpoint** | URL to initiate OAuth flow | `/oauth/authorize` |
| **Token Endpoint** | URL to exchange code for tokens | `/oauth/token` |
| **UserInfo Endpoint** | URL to get user profile | `/oauth/userinfo` |
| **Revocation Endpoint** | URL to revoke tokens | `/oauth/revoke` |
| **JWKS URI** | URL for public keys (if verifying JWTs) | `/.well-known/jwks.json` |
| **Supported Scopes** | Available OAuth scopes | `openid`, `profile`, `email` |
| **Token Expiry Times** | Access and refresh token lifetimes | `3600s`, `604800s` |
| **PKCE Support** | Whether PKCE is required/supported | Required, S256 |

### Information Team B Must Provide to Team A

| Item | Description | Example |
|------|-------------|---------|
| **Application Name** | Display name for consent screen | `My App B` |
| **Redirect URIs** | Allowed callback URLs | `https://app-b.com/auth/callback` |
| **Post-Logout Redirect URIs** | Where to redirect after logout | `https://app-b.com` |
| **Application Logo** | Logo URL for consent screen | `https://app-b.com/logo.png` |
| **Application Description** | Description for consent screen | `App B needs access to...` |
| **Required Scopes** | Scopes App B needs | `openid profile email` |
| **Environment** | Development, staging, or production | `production` |

---

## Communication Template

### Email/Document Template for Team B to Send to Team A

```
Subject: OAuth 2.0 Client Registration Request - App B

Hi Team A,

We would like to integrate our application (App B) with your OAuth 2.0 
authorization server for Single Sign-On. Please find below the required 
information for client registration:

APPLICATION DETAILS:
-------------------
Application Name: [Your App Name]
Application Description: [Brief description of your app]
Environment: [Development/Staging/Production]

REDIRECT URIs:
--------------
- https://app-b.example.com/auth/callback  (Production)
- https://staging.app-b.example.com/auth/callback  (Staging)
- http://localhost:3000/auth/callback  (Development)

POST-LOGOUT REDIRECT URIs:
--------------------------
- https://app-b.example.com
- https://staging.app-b.example.com
- http://localhost:3000

REQUIRED SCOPES:
----------------
- openid (for authentication)
- profile (for user's name)
- email (for user's email address)

TECHNICAL CONTACT:
------------------
Name: [Your Name]
Email: [Your Email]
Phone: [Your Phone]

Please provide us with:
1. Client ID
2. Client Secret (via secure channel)
3. Authorization Server endpoints
4. JWKS URI (if available)
5. Token expiration times
6. Any additional configuration details

Thank you!
```

---

### Response Template from Team A to Team B

```
Subject: RE: OAuth 2.0 Client Registration - App B Credentials

Hi Team B,

Your OAuth 2.0 client has been registered successfully. Please find the 
configuration details below:

CLIENT CREDENTIALS:
-------------------
Client ID: app-b-prod-abc123
Client Secret: [Will be sent via secure channel]

ENDPOINTS:
----------
Authorization Server Base URL: https://auth.example.com
Authorization Endpoint: https://auth.example.com/oauth/authorize
Token Endpoint: https://auth.example.com/oauth/token
UserInfo Endpoint: https://auth.example.com/oauth/userinfo
Revocation Endpoint: https://auth.example.com/oauth/revoke
JWKS URI: https://auth.example.com/.well-known/jwks.json
OpenID Configuration: https://auth.example.com/.well-known/openid-configuration

TOKEN CONFIGURATION:
--------------------
Access Token Lifetime: 3600 seconds (1 hour)
Refresh Token Lifetime: 604800 seconds (7 days)
Token Type: Bearer
ID Token Algorithm: RS256

SUPPORTED FEATURES:
-------------------
- PKCE: Required (S256 method)
- State Parameter: Required
- Refresh Token Rotation: Enabled

APPROVED SCOPES:
----------------
- openid
- profile
- email

IMPORTANT NOTES:
----------------
1. Always use HTTPS in production
2. Store client secret securely (never in client-side code)
3. Implement PKCE for additional security
4. Handle token refresh before expiration

Please reach out if you have any questions.

Best regards,
Team A
```

---

## Security Considerations

### For Team A (Authorization Server)

1. **Password Security**
   - Use bcrypt with cost factor ≥ 12
   - Enforce strong password policies
   - Implement rate limiting on login attempts

2. **Token Security**
   - Use RS256 for JWT signing
   - Rotate signing keys periodically
   - Keep authorization codes short-lived (10 minutes max)

3. **Client Security**
   - Validate redirect URIs strictly
   - Use secure random generators for codes/tokens
   - Implement client secret rotation capability

4. **PKCE Implementation**
   - Require PKCE for all public clients
   - Support only S256 challenge method
   - Validate code_verifier against stored code_challenge

### For Team B (Client Application)

1. **Secret Management**
   - Never expose client_secret in frontend code
   - Use environment variables
   - Consider using secret management services

2. **Session Security**
   - Use HTTP-only, Secure cookies
   - Implement CSRF protection
   - Set appropriate SameSite cookie attribute

3. **State Validation**
   - Always generate and validate state parameter
   - Use cryptographically secure random values
   - Store state server-side or in HTTP-only cookies

4. **Token Handling**
   - Never store tokens in localStorage
   - Implement automatic token refresh
   - Clear tokens on logout

---

## Implementation Checklist

### Team A Checklist

- [ ] Set up database schema
- [ ] Implement user registration
- [ ] Implement user login
- [ ] Implement OAuth client registration (admin)
- [ ] Implement `/oauth/authorize` endpoint
- [ ] Implement authorization consent screen
- [ ] Implement `/oauth/token` endpoint
- [ ] Implement `/oauth/userinfo` endpoint
- [ ] Implement `/oauth/revoke` endpoint
- [ ] Implement `/.well-known/jwks.json` endpoint
- [ ] Implement `/.well-known/openid-configuration` endpoint
- [ ] Generate RSA key pair for JWT signing
- [ ] Implement PKCE validation
- [ ] Add rate limiting
- [ ] Add logging and monitoring
- [ ] Write API documentation
- [ ] Create client registration process
- [ ] Test with Postman/Insomnia
- [ ] Security audit

### Team B Checklist

- [ ] Set up Next.js project
- [ ] Configure environment variables
- [ ] Implement `/api/auth/login` route
- [ ] Implement `/api/auth/callback` route
- [ ] Implement `/api/auth/refresh` route
- [ ] Implement `/api/auth/logout` route
- [ ] Implement `/api/auth/me` route
- [ ] Implement session management
- [ ] Implement PKCE generation
- [ ] Implement state generation and validation
- [ ] Create auth middleware
- [ ] Create AuthContext provider
- [ ] Create protected route component
- [ ] Create login/logout buttons
- [ ] Handle error cases
- [ ] Test OAuth flow end-to-end
- [ ] Security audit

---

## Testing Guide

### Manual Testing Flow

1. **Start Login Flow**
   - Navigate to App B
   - Click "Login with App A"
   - Verify redirect to App A login page

2. **Authenticate on App A**
   - Enter credentials
   - Submit login form
   - Verify consent screen appears (if first time)

3. **Grant Consent**
   - Review requested permissions
   - Click "Authorize"
   - Verify redirect back to App B

4. **Verify Callback**
   - Check URL contains authorization code
   - Verify state parameter matches
   - Check session cookie is set

5. **Access Protected Resource**
   - Navigate to dashboard
   - Verify user info is displayed
   - Check access token is used for API calls

6. **Test Token Refresh**
   - Wait for token to expire (or manually expire)
   - Make API request
   - Verify new token is obtained

7. **Test Logout**
   - Click logout
   - Verify session is cleared
   - Verify redirect to login page
   - Verify tokens are revoked on App A

### Error Scenarios to Test

| Scenario | Expected Behavior |
|----------|-------------------|
| Invalid client_id | Error displayed on App A |
| Invalid redirect_uri | Error displayed on App A |
| Invalid state | Error displayed on App B |
| Expired authorization code | Token exchange fails, redirect to login |
| Invalid authorization code | Token exchange fails, redirect to login |
| Expired access token | Auto-refresh or redirect to login |
| Expired refresh token | Redirect to login |
| Network error during token exchange | Error displayed, retry option |
| User denies consent | Error displayed on App B |

---

## Troubleshooting

### Common Issues and Solutions

#### "Invalid redirect_uri" Error

**Cause:** The redirect_uri in the request doesn't match registered URIs

**Solution:**
- Verify exact match including protocol (http vs https)
- Check for trailing slashes
- Ensure URI is registered with Team A

#### "Invalid client credentials" Error

**Cause:** Wrong client_id or client_secret

**Solution:**
- Verify credentials are copied correctly
- Check environment variables are loaded
- Ensure using correct environment (dev vs prod)

#### "State mismatch" Error

**Cause:** State parameter doesn't match stored value

**Solution:**
- Check cookie settings (SameSite, Secure)
- Verify state is stored before redirect
- Check for multiple redirect loops

#### CORS Errors

**Cause:** Token endpoint not allowing cross-origin requests

**Solution:**
- Token exchange should be server-side only
- Never call token endpoint from browser
- Use API routes in Next.js

#### "Token expired" Errors

**Cause:** Access token has expired

**Solution:**
- Implement automatic token refresh
- Check clock synchronization between servers
- Add buffer time before actual expiration

---

## Glossary

| Term | Definition |
|------|------------|
| **OAuth 2.0** | Industry-standard protocol for authorization |
| **OpenID Connect (OIDC)** | Identity layer on top of OAuth 2.0 |
| **Authorization Code** | Temporary code exchanged for tokens |
| **Access Token** | Token used to access protected resources |
| **Refresh Token** | Token used to obtain new access tokens |
| **ID Token** | JWT containing user identity claims |
| **PKCE** | Proof Key for Code Exchange - security extension |
| **State** | Random value to prevent CSRF attacks |
| **Scope** | Permissions requested by the client |
| **Claim** | Piece of information about the user |
| **JWKS** | JSON Web Key Set - public keys for verification |
| **Bearer Token** | Token type that grants access to the bearer |

---

## References

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OAuth 2.0 PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [OAuth 2.0 Token Revocation RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009)
- [Spring Authorization Server](https://spring.io/projects/spring-authorization-server)
- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js](https://next-auth.js.org/) (Alternative solution)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-03 | Initial documentation |

---

**Document Maintained By:** Team B  
**Last Updated:** January 3, 2026
