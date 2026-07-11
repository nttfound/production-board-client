import axios from 'axios';
import { API_BASE_URL } from './config';

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
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use(config => {
  if (authToken) config.headers['x-auth-token'] = authToken;
  return config;
});

export default api;
