import axios from 'axios';

const OAUTH_URL = process.env.REACT_APP_OAUTH_URL || 'http://localhost:5002/oauth';

// Create axios instance for OAuth endpoints
const oauthAxios = axios.create({
  baseURL: OAUTH_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
oauthAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('appb_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
oauthAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('appb_token');
      localStorage.removeItem('appb_user');
      localStorage.removeItem('appb_refresh_token');
      localStorage.removeItem('appb_id_token');
      // Don't redirect automatically, let the UI handle it
    }
    return Promise.reject(error);
  }
);

// OAuth 2.0 API calls
export const oauthAPI = {
  // Exchange authorization code for tokens
  exchangeCode: (code, codeVerifier, state) => 
    oauthAxios.post('/callback', { code, codeVerifier, state }),
  
  // Refresh access token
  refreshToken: (refreshToken) => 
    oauthAxios.post('/refresh', { refreshToken }),

  // Get current user
  getMe: () => oauthAxios.get('/me'),

  // Logout
  logout: () => oauthAxios.post('/logout')
};

export default oauthAxios;
