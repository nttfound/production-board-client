import { io } from 'socket.io-client';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const socket = io(BASE_URL, {
  autoConnect:       true,
  reconnection:      true,
  reconnectionDelay: 2000,
  transports:        ['polling', 'websocket'],
  withCredentials:   false,
});

export default socket;