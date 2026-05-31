import { io } from 'socket.io-client';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const socket = io(BASE_URL, {
  autoConnect:       false,                    // conecta só após autenticação (ver AuthContext)
  reconnection:      true,
  reconnectionDelay: 2000,
  transports:        ['websocket', 'polling'], // CORRIGIDO: WebSocket primeiro, polling só como fallback.
                                               // Antes estava invertido — cada conexão iniciava com
                                               // HTTP polling e depois fazia upgrade, gerando latência
                                               // e uma requisição HTTP extra desnecessária.
  withCredentials:   true,                     // envia cookies junto com o handshake
});

export default socket;
