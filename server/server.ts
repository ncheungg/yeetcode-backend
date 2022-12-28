import express from 'express';
import next from 'next';
import { WebSocketServer } from 'ws';
import { WebSocket } from './types';
import { PORT, SOCKET_TIMEOUT } from './consts';
import { handleWebsocketConnection, leaveRoom } from './wss-handler';
import { parse } from 'url';
import join from './routes/join';

// websocket server
const wss = new WebSocketServer({
  noServer: true,
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

// next server
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// create express server
const createExpressServer = (): void => {
  const expressApp = express();

  expressApp.get('*', (req, res) => handle(req, res));

  const server = expressApp.listen(PORT, () => {
    console.log(`Listening on port ${PORT}...`);
  });

  // upgrades the server for websockets if not next
  server.on('upgrade', (req, ws, head): void => {
    if (!req?.url) return;

    const { pathname } = parse(req.url, true);
    if (pathname === '/_next/webpack-hmr') return;

    wss.handleUpgrade(req, ws, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
};

// open express with next.js context
app
  .prepare()
  .then(createExpressServer)
  .catch((ex) => {
    console.error(ex.stack);
    process.exit(1);
  });

// // express server to handle webpage / room joining
// const app = express();
// app.use('/join', join);

// // accepts ws connections with path /ws
// // https://www.npmjs.com/package/ws#multiple-servers-sharing-a-single-https-server
// const server = app.listen(PORT);
// server.on('upgrade', (request, ws, head) => {
//   wss.handleUpgrade(request, ws, head, (ws) => {
//     wss.emit('connection', ws, request);
//   });
// });

// console.log(`Listening on port ${PORT}...`);
