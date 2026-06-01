import axios from 'axios';

// Restaura token da sessão anterior (mesma aba/reload)
let authToken = sessionStorage.getItem('auth_token') || null;

export function setAuthToken(token) {
  authToken = token || null;
  if (token) {
    sessionStorage.setItem('auth_token', token);
  } else {
    sessionStorage.removeItem('auth_token');
  }
}

export function getAuthToken() {
  return authToken;
}

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use(config => {
  if (authToken) config.headers['x-auth-token'] = authToken;
  return config;
});

export default api;
