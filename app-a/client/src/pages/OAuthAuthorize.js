import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * OAuth Authorization Page
 * This page handles the OAuth 2.0 authorization flow
 * For first-party trusted clients, auto-approves without showing consent screen
 * Supports prompt=none for silent SSO authentication
 */
const OAuthAuthorize = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const [clientInfo, setClientInfo] = useState(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState('');

  // Get OAuth parameters from URL
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope') || 'openid profile email';
  const state = searchParams.get('state');
  const responseType = searchParams.get('response_type');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const nonce = searchParams.get('nonce');
  const prompt = searchParams.get('prompt'); // OIDC prompt parameter

  useEffect(() => {
    // Handle prompt=none (silent authentication)
    if (prompt === 'none') {
      if (!loading && !isAuthenticated) {
        // User not logged in, return error to client
        const errorUrl = new URL(redirectUri);
        errorUrl.searchParams.set('error', 'login_required');
        errorUrl.searchParams.set('error_description', 'User is not authenticated');
        if (state) {
          errorUrl.searchParams.set('state', state);
        }
        window.location.href = errorUrl.toString();
        return;
      }
      
      if (!loading && isAuthenticated) {
        // User is logged in, auto-authorize silently
        autoAuthorize();
        return;
      }
      return;
    }

    // If not authenticated, redirect to login with return URL
    if (!loading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.href);
      navigate(`/login?returnUrl=${returnUrl}`);
      return;
    }

    // For first-party trusted clients, auto-authorize (skip consent screen)
    if (!loading && isAuthenticated && clientId === 'app-b-client') {
      autoAuthorize();
      return;
    }

    // Validate required parameters
    if (!clientId || !redirectUri || responseType !== 'code') {
      setError('Invalid OAuth request. Missing required parameters.');
      return;
    }

    // In a real app, fetch client info from backend
    setClientInfo({
      name: 'App B',
      clientId: clientId
    });
  }, [loading, isAuthenticated, navigate, clientId, redirectUri, responseType, prompt, state]);

  const autoAuthorize = () => {
    // Build the authorization URL with all parameters
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

    // Redirect to backend OAuth authorize endpoint (skips consent)
    window.location.href = `http://localhost:5001/oauth/authorize?${params.toString()}`;
  };

  const handleAuthorize = async () => {
    setAuthorizing(true);
    setError('');
    autoAuthorize();
  };

  const handleDeny = () => {
    // Redirect back to client with error
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set('error', 'access_denied');
    errorUrl.searchParams.set('error_description', 'User denied the request');
    if (state) {
      errorUrl.searchParams.set('state', state);
    }
    window.location.href = errorUrl.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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

  const scopes = scope.split(' ');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Authorization Request</h1>
        </div>

        {/* App Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-gray-600 text-center">
            <span className="font-semibold text-gray-900">{clientInfo?.name || 'Application'}</span>
            {' '}wants to access your account
          </p>
        </div>

        {/* User Info */}
        <div className="flex items-center p-4 bg-primary-50 rounded-lg mb-6">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
        </div>

        {/* Scopes */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">This will allow {clientInfo?.name} to:</h3>
          <ul className="space-y-2">
            {scopes.includes('openid') && (
              <li className="flex items-center text-sm text-gray-600">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Verify your identity
              </li>
            )}
            {scopes.includes('profile') && (
              <li className="flex items-center text-sm text-gray-600">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Access your profile information (name)
              </li>
            )}
            {scopes.includes('email') && (
              <li className="flex items-center text-sm text-gray-600">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Access your email address
              </li>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleDeny}
            className="flex-1 btn-secondary bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Deny
          </button>
          <button
            onClick={handleAuthorize}
            disabled={authorizing}
            className="flex-1 btn-primary"
          >
            {authorizing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Authorizing...
              </span>
            ) : (
              'Authorize'
            )}
          </button>
        </div>

        {/* Security Notice */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          By authorizing, you allow this app to access your data as specified above.
          You can revoke access at any time.
        </p>
      </div>
    </div>
  );
};

export default OAuthAuthorize;
