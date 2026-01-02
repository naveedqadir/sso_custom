import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double processing in strict mode
    if (processedRef.current) return;
    processedRef.current = true;

    const processCallback = async () => {
      // Get OAuth 2.0 response parameters
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Handle error response from authorization server
      if (errorParam) {
        const message = errorDescription || `OAuth error: ${errorParam}`;
        setError(message);
        setProcessing(false);
        return;
      }

      // Validate required parameters
      if (!code) {
        setError('Missing authorization code');
        setProcessing(false);
        return;
      }

      // Verify state parameter (CSRF protection)
      const storedState = sessionStorage.getItem('oauth_state');
      if (!state || state !== storedState) {
        setError('Invalid state parameter - possible CSRF attack');
        setProcessing(false);
        return;
      }

      // Get stored PKCE code verifier
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
      if (!codeVerifier) {
        setError('Missing PKCE code verifier');
        setProcessing(false);
        return;
      }

      try {
        // Exchange authorization code for tokens
        const result = await handleOAuthCallback(code, codeVerifier, state);
        
        // Clear OAuth session data
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');
        
        if (result.success) {
          navigate('/dashboard', { replace: true });
        } else {
          setError(result.error || 'OAuth authentication failed');
          setProcessing(false);
        }
      } catch (err) {
        setError(err.message || 'Failed to complete OAuth flow');
        setProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, navigate, handleOAuthCallback]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
        <div className="card w-full max-w-md text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Authentication Failed</h1>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>

          <button
            onClick={() => navigate('/', { replace: true })}
            className="btn-secondary w-full py-3"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-500 to-secondary-700 flex items-center justify-center p-4">
      <div className="card w-full max-w-md text-center">
        <div className="mb-6">
          <svg className="animate-spin h-12 w-12 text-secondary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <h1 className="text-xl font-bold text-gray-900">Completing Sign In</h1>
          <p className="text-gray-600 mt-2">
            {processing ? 'Exchanging authorization code...' : 'Please wait...'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">
            OAuth 2.0 Authorization Code Flow with PKCE
          </p>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
