import axios from 'axios';

// Token guardado em memória — nunca em localStorage (protege contra XSS).
// Some quando a página fecha, mas é recarregado via cookie no fetchMe.
let memoryToken = null;
export const setMemoryToken  = (t) => { memoryToken = t; };
export const clearMemoryToken = () => { memoryToken = null; };

const api = axios.create({
  baseURL:         process.env.REACT_APP_API_URL || 'http://localhost:3000',
  timeout:         15000,
  withCredentials: true, // envia cookie httpOnly quando disponível (browser web)
});

// Injeta o token via header em toda request.
// Necessário no Electron, que não envia cookies automaticamente como um browser normal.
// O servidor já suporta: req.cookies?.auth_token || req.headers['x-auth-token']
api.interceptors.request.use((config) => {
  if (memoryToken) {
    config.headers['x-auth-token'] = memoryToken;
  }
  return config;
});

export default api;
