import express from 'express';
import { WebSocketServer } from 'ws';
import { WebSocket } from './types';
import { PORT, SOCKET_TIMEOUT } from './consts';
import { handleWebsocketConnection, leaveRoom } from './wss-handler';
import join from './routes/join';

// websocket server
const wss = new WebSocketServer({ noServer: true });

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

// express server to handle webpage / room joining
const app = express();
app.use('/join', join);

// accepts ws connections with path /ws
// https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server
const server = app.listen(PORT);
server.on('upgrade', (request, ws, head) => {
  wss.handleUpgrade(request, ws, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

console.log(`Listening on port ${PORT}...`);
