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

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

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
