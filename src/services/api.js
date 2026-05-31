import axios from 'axios';

let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
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
