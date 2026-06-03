import { io } from 'socket.io-client';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Função para pegar o token do sessionStorage
const getToken = () => {
  return sessionStorage.getItem('auth_token');
};

const socket = io(BASE_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 500,
  transports: ['websocket', 'polling'],
  withCredentials: true,
  auth: (cb) => {
    const token = getToken();
    if (token) {
      cb({ token });
    } else {
      cb({});
    }
  }
});

export default socket;