import { io } from 'socket.io-client';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const socket = io(BASE_URL, {
  autoConnect:       false,        // conecta só após ter o token (ver AuthContext)
  reconnection:      true,
  reconnectionDelay: 2000,
  transports:        ['polling', 'websocket'],  // polling primeiro: mais compatível no Electron
  withCredentials:   false,
});

export default socket;
