import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const APP_B_URL = process.env.REACT_APP_APP_B_URL || 'http://localhost:3002';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleGoToAppB = () => {
    // Redirect to App B - user will use OAuth 2.0 to authenticate
    window.location.href = APP_B_URL;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="ml-3 text-xl font-semibold text-gray-900">App A - Auth Server</span>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">You are logged in to the OAuth 2.0 Authorization Server (App A)</p>
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
              <div className="flex justify-between py-2">
                <span className="text-gray-600">User ID</span>
                <span className="font-mono text-sm text-gray-900">{user?.id}</span>
              </div>
            </div>
          </div>

          {/* OAuth 2.0 Card */}
          <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">OAuth 2.0 / OpenID Connect</h2>
            <p className="text-gray-600 mb-6">
              Visit App B to authenticate using OAuth 2.0 Authorization Code Flow with PKCE.
              App B will redirect you back here to authorize access.
            </p>
            <button
              onClick={handleGoToAppB}
              className="btn-primary w-full py-3 flex items-center justify-center"
            >
              Go to App B
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        </div>

        {/* OAuth 2.0 Flow Info */}
        <div className="mt-8 card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">How OAuth 2.0 Works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-primary-600 font-bold">1</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Initiate Login</h3>
              <p className="text-sm text-gray-600">App B generates PKCE and redirects here</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-primary-600 font-bold">2</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Authorize</h3>
              <p className="text-sm text-gray-600">User grants consent on this server</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-primary-600 font-bold">3</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Exchange Code</h3>
              <p className="text-sm text-gray-600">App B exchanges code for tokens</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-primary-600 font-bold">4</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Authenticated</h3>
              <p className="text-sm text-gray-600">User is logged into App B</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
