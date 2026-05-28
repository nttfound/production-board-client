import axios from 'axios';

const api = axios.create({
  baseURL:         process.env.REACT_APP_API_URL || 'http://localhost:3000',
  timeout:         15000,
  withCredentials: true, // envia o cookie httpOnly automaticamente em toda request
});

// Interceptor de token removido — não há mais localStorage.
// O cookie auth_token vai automaticamente pelo browser.

export default api;
