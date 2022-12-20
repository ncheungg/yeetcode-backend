import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  SocketMessage,
  SocketMessageType,
  SocketMessageParams,
  Rooms,
  WebSocket,
} from './types';
import { MAX_ROOM_SIZE, PORT } from './consts';

const wss = new WebSocketServer({ port: PORT });
const rooms: Rooms = {};

const broadcastMessage = (
  ws: WebSocket,
  message: SocketMessage
): boolean => {
  const { roomID } = ws;

  if (!roomID || rooms[roomID] === undefined) return false;

  for (const wsClient of rooms[roomID]) {
    if (wsClient === ws) continue;
    wsClient.send(message);
  }

  return true;
};

const broadcastAction = (
  ws: WebSocket,
  message: SocketMessage
): boolean => {
  const { roomID } = ws;

  if (!roomID || rooms[roomID] === undefined) return false;

  for (const wsClient of rooms[roomID]) {
    wsClient.send(message);
  }

  return true;
};

const createRoom = (ws: WebSocket): string => {
  let roomID;

  while (!roomID || rooms[roomID] !== undefined) {
    roomID = uuidv4();
  }

  ws.roomID = roomID;
  rooms[roomID] = [ws];

  const { userID } = ws;
  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `${userID} created a room!`,
    },
  };

  broadcastAction(ws, message);

  return roomID;
};

const joinRoom = (ws: WebSocket, params: SocketMessageParams): boolean => {
  const { roomID } = params;

  if (
    !roomID ||
    rooms[roomID] === undefined ||
    rooms[roomID].length >= MAX_ROOM_SIZE
  )
    return false;

  ws.roomID = roomID;
  rooms[roomID].push(ws);

  const { userID } = ws;
  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `${userID} joined the room!`,
    },
  };

  broadcastAction(ws, message);

  return true;
};

const leaveRoom = (ws: WebSocket): boolean => {
  const roomID: string | undefined = ws.roomID;

  if (
    !roomID ||
    rooms[roomID] === undefined ||
    rooms[roomID].indexOf(ws) === -1
  )
    return false;

  rooms[roomID].filter((item) => item !== ws);
  if (rooms[roomID].length === 0) {
    delete rooms[roomID];
    return true;
  }

  const { userID } = ws;
  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `${userID} left the room!`,
    },
  };

  broadcastAction(ws, message);

  return true;
};

// handles websocket connections/messages
wss.on('connection', (ws: WebSocket) => {
  console.log('connected with a socket!');
  console.log(ws);

  // action handler
  ws.on('message', (data: string) => {
    const { type, params } = JSON.parse(data) as SocketMessage;

    switch (type) {
      case SocketMessageType.Create:
        createRoom(ws);
        break;
      case SocketMessageType.Join:
        joinRoom(ws, params);
        break;
      case SocketMessageType.Leave:
        leaveRoom(ws);
        break;
      case SocketMessageType.Message:
        broadcastMessage(ws, { type, params });
        break;
      case SocketMessageType.Action:
        broadcastAction(ws, { type, params });
        break;
    }
  });
});

console.log(`Listening on port ${PORT}...`);
