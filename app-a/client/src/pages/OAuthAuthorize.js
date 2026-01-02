import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * OAuth Authorization Page
 * Handles OAuth 2.0 authorization with PKCE and silent SSO (prompt=none)
 * First-party trusted clients auto-authorize without consent screen
 */
const OAuthAuthorize = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [error, setError] = useState('');

  // OAuth parameters from URL
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope') || 'openid profile email';
  const state = searchParams.get('state');
  const responseType = searchParams.get('response_type');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const nonce = searchParams.get('nonce');
  const prompt = searchParams.get('prompt');

  // Auto-authorize by redirecting to backend OAuth endpoint
  const autoAuthorize = () => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      ...(state && { state }),
      ...(codeChallenge && { code_challenge: codeChallenge }),
      ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
      ...(nonce && { nonce })
    });
    window.location.href = `http://localhost:5001/oauth/authorize?${params.toString()}`;
  };

  // Return error to OAuth client
  const returnError = (errorCode, description) => {
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set('error', errorCode);
    errorUrl.searchParams.set('error_description', description);
    if (state) errorUrl.searchParams.set('state', state);
    window.location.href = errorUrl.toString();
  };

  useEffect(() => {
    if (loading) return;

    // Handle prompt=none (silent SSO)
    if (prompt === 'none') {
      if (!isAuthenticated) {
        returnError('login_required', 'User is not authenticated');
      } else {
        autoAuthorize();
      }
      return;
    }

    // Redirect unauthenticated users to login
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.href);
      navigate(`/login?returnUrl=${returnUrl}`);
      return;
    }

    // Validate required parameters
    if (!clientId || !redirectUri || responseType !== 'code') {
      setError('Invalid OAuth request. Missing required parameters.');
      return;
    }

    // First-party trusted clients auto-authorize (no consent needed)
    if (clientId === 'app-b-client') {
      autoAuthorize();
      return;
    }

    // Third-party clients would show consent screen here
    setError('Unknown client. Third-party consent not implemented.');
  }, [loading, isAuthenticated, navigate, clientId, redirectUri, responseType, prompt, state]);

  // Loading spinner
  const LoadingSpinner = ({ text }) => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner text="Loading..." />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
        <div className="card w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authorization Error</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Default: auto-authorizing in progress
  return <LoadingSpinner text="Authorizing..." />;
};

export default OAuthAuthorize;
