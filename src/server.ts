import { WebSocketServer } from 'ws';
import { WebSocket } from './types';
import { PORT, SOCKET_TIMEOUT } from './consts';
import { handleWebsocketConnection, leaveRoom } from './wss-handler';

// websocket server
const wss = new WebSocketServer({
  port: PORT,
  maxPayload: 5 * 1024, // 5kB
});

// handles websocket connections/messages
wss.on('connection', handleWebsocketConnection);

// ping-pong interval checker
// https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections
const interval = setInterval(() => {
  for (const ws of wss.clients as Set<WebSocket>) {
    if (ws.isAlive === false) {
      leaveRoom(ws);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  }
}, SOCKET_TIMEOUT);

wss.on('close', () => {
  clearInterval(interval);
});

console.log(`Listening on port ${PORT}...`);
