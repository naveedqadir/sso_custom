import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const APP_A_URL = process.env.REACT_APP_APP_A_URL || 'http://localhost:3001';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleGoToAppA = () => {
    window.location.href = `${APP_A_URL}/dashboard`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-secondary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="ml-3 text-xl font-semibold text-gray-900">App B - Client App</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Success Banner */}
        <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-secondary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-secondary-800 font-semibold">OAuth 2.0 Authentication Successful!</h3>
              <p className="text-secondary-700 text-sm">You have been authenticated via OAuth 2.0 / OpenID Connect from App A.</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to App B</h1>
          <p className="text-gray-600 mt-2">You have been authenticated through OAuth 2.0 from App A</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* User Info Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Name</span>
                <span className="font-medium text-gray-900">{user?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Email</span>
                <span className="font-medium text-gray-900">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">User ID</span>
                <span className="font-mono text-sm text-gray-900">{user?.id}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Auth Source</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                  OAuth 2.0 / OIDC
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Card */}
          <div className="card bg-gradient-to-br from-secondary-50 to-secondary-100 border border-secondary-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h2>
            <p className="text-gray-600 mb-6">
              Go back to App A (Authorization Server) to manage your account or access other applications.
            </p>
            <button
              onClick={handleGoToAppA}
              className="btn-secondary w-full py-3 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Go to App A
            </button>
          </div>
        </div>

        {/* App B Features */}
        <div className="mt-8 card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">App B Features</h2>
          <p className="text-gray-600 mb-6">
            This is a sample application demonstrating OAuth 2.0 / OIDC integration. In a real application, 
            this would contain the features and functionality specific to App B.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Analytics</h3>
              <p className="text-sm text-gray-600">View detailed analytics and reports</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Calendar</h3>
              <p className="text-sm text-gray-600">Manage your schedule and events</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Team</h3>
              <p className="text-sm text-gray-600">Collaborate with your team members</p>
            </div>
          </div>
        </div>

        {/* OAuth 2.0 Details */}
        <div className="mt-8 card bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">OAuth 2.0 Authentication Details</h2>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <code className="text-sm text-gray-700 block whitespace-pre-wrap">
{`{
  "authenticated": true,
  "protocol": "OAuth 2.0 / OpenID Connect",
  "flow": "Authorization Code Flow with PKCE",
  "authServer": "App A (http://localhost:5001)",
  "user": {
    "id": "${user?.id}",
    "name": "${user?.name}",
    "email": "${user?.email}"
  },
  "tokenType": "JWT (Access + ID Token)",
  "security": ["PKCE (S256)", "State Parameter", "HTTPS Required"]
}`}
            </code>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
