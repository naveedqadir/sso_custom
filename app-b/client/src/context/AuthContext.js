import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, oauthAPI } from '../services/api';

const AuthContext = createContext(null);

// OAuth 2.0 / OIDC Configuration
const APP_A_URL = process.env.REACT_APP_APP_A_URL || 'http://localhost:3001';
const OAUTH_CLIENT_ID = process.env.REACT_APP_OAUTH_CLIENT_ID || 'app-b-client';
const OAUTH_REDIRECT_URI = process.env.REACT_APP_OAUTH_REDIRECT_URI || 'http://localhost:3002/oauth/callback';
const OAUTH_SCOPE = 'openid profile email';

// PKCE Helper Functions
const generateRandomString = (length) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((v) => charset[v % charset.length])
    .join('');
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return hash;
};

const base64URLEncode = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const generateCodeChallenge = async (verifier) => {
  const hashed = await sha256(verifier);
  return base64URLEncode(hashed);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ssoChecked, setSsoChecked] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Auto-SSO: Check if user is logged in at App A (silent authentication)
  useEffect(() => {
    // Only attempt SSO if:
    // 1. Initial auth check is done (loading is false)
    // 2. User is not logged in locally
    // 3. SSO check hasn't been done yet
    // 4. We're not already in an OAuth callback
    // 5. User hasn't explicitly logged out (respect their choice)
    const userLoggedOut = sessionStorage.getItem('user_logged_out') === 'true';
    if (!loading && !user && !ssoChecked && !userLoggedOut && !window.location.pathname.includes('/oauth/callback')) {
      attemptSilentSSO();
    }
  }, [loading, user, ssoChecked]);

  const attemptSilentSSO = async () => {
    try {
      // Check if we already tried SSO (prevent infinite loops)
      const ssoAttempted = sessionStorage.getItem('sso_attempted');
      if (ssoAttempted) {
        setSsoChecked(true);
        return;
      }

      // Mark that we're attempting SSO
      sessionStorage.setItem('sso_attempted', 'true');

      // Generate PKCE values
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateRandomString(32);

      // Store for callback
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('sso_silent', 'true');

      // Build authorization URL with prompt=none for silent auth
      const authUrl = new URL(`${APP_A_URL}/oauth/authorize`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', OAUTH_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
      authUrl.searchParams.set('scope', OAUTH_SCOPE);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('prompt', 'none'); // Silent authentication

      // Redirect for silent SSO check
      window.location.href = authUrl.toString();
    } catch (err) {
      console.error('Silent SSO failed:', err);
      setSsoChecked(true);
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('appb_token');
      if (token) {
        const response = await authAPI.getMe();
        setUser(response.data.data.user);
      }
    } catch (err) {
      localStorage.removeItem('appb_token');
      localStorage.removeItem('appb_user');
      localStorage.removeItem('appb_refresh_token');
    } finally {
      setLoading(false);
    }
  };

  // OAuth 2.0 Authorization Code Flow with PKCE
  const handleOAuthCallback = useCallback(async (code, codeVerifier, state) => {
    try {
      setError(null);
      setLoading(true);

      // Exchange authorization code for tokens via backend
      const response = await oauthAPI.exchangeCode(code, codeVerifier, state);
      const { user, accessToken, refreshToken, idToken } = response.data.data;

      // Store tokens
      localStorage.setItem('appb_token', accessToken);
      localStorage.setItem('appb_user', JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem('appb_refresh_token', refreshToken);
      }
      if (idToken) {
        localStorage.setItem('appb_id_token', idToken);
      }

      setUser(user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'OAuth authentication failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Initiate OAuth 2.0 Authorization Code Flow with PKCE
  const initiateOAuthLogin = useCallback(async () => {
    try {
      // Clear the logged out flag when user manually initiates login
      sessionStorage.removeItem('user_logged_out');
      
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Generate state for CSRF protection
      const state = generateRandomString(32);
      
      // Store in session storage (cleared on browser close)
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);
      sessionStorage.setItem('oauth_state', state);

      // Build authorization URL
      const authUrl = new URL(`${APP_A_URL}/oauth/authorize`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', OAUTH_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', OAUTH_REDIRECT_URI);
      authUrl.searchParams.set('scope', OAUTH_SCOPE);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      // Redirect to authorization server
      window.location.href = authUrl.toString();
    } catch (err) {
      console.error('Failed to initiate OAuth login:', err);
      setError('Failed to start authentication');
    }
  }, []);

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('appb_token');
      localStorage.removeItem('appb_user');
      localStorage.removeItem('appb_refresh_token');
      localStorage.removeItem('appb_id_token');
      // Mark that user explicitly logged out - don't auto-SSO them back in
      sessionStorage.setItem('user_logged_out', 'true');
      sessionStorage.removeItem('sso_attempted');
      sessionStorage.removeItem('sso_silent');
      setUser(null);
    }
  };

  // Refresh access token using refresh token
  const refreshAccessToken = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('appb_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await oauthAPI.refreshToken(refreshToken);
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      localStorage.setItem('appb_token', accessToken);
      if (newRefreshToken) {
        localStorage.setItem('appb_refresh_token', newRefreshToken);
      }

      return { success: true, accessToken };
    } catch (err) {
      // Refresh failed, user needs to re-authenticate
      localStorage.removeItem('appb_token');
      localStorage.removeItem('appb_user');
      localStorage.removeItem('appb_refresh_token');
      localStorage.removeItem('appb_id_token');
      setUser(null);
      return { success: false };
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    handleOAuthCallback,
    initiateOAuthLogin,
    logout,
    refreshAccessToken,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
