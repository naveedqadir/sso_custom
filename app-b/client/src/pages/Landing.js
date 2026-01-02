import React from 'react';
import { useAuth } from '../context/AuthContext';

const APP_A_URL = process.env.REACT_APP_APP_A_URL || 'http://localhost:3001';

const Landing = () => {
  const { initiateOAuthLogin } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-500 to-secondary-700 flex items-center justify-center p-4">
      <div className="card w-full max-w-md text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-100 rounded-full mb-4">
            <span className="text-secondary-600 font-bold text-2xl">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to App B</h1>
          <p className="text-gray-600 mt-2">OAuth 2.0 / OpenID Connect Client</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600">
            To access App B, you need to authenticate via App A (Authorization Server)
            using <strong>OAuth 2.0 Authorization Code Flow with PKCE</strong>.
          </p>
        </div>

        {/* OAuth 2.0 Login Button */}
        <button
          onClick={initiateOAuthLogin}
          className="btn-secondary w-full py-3 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Login with OAuth 2.0
        </button>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">Security Features:</p>
            <p>✓ PKCE (Proof Key for Code Exchange)</p>
            <p>✓ State Parameter (CSRF Protection)</p>
            <p>✓ OpenID Connect ID Tokens</p>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Authorization Server:</p>
          <p className="font-mono text-xs mt-1">{APP_A_URL}</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
