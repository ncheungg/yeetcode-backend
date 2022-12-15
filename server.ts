import { WebSocket, WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import {
  SocketMessageData,
  SocketMessageDataType,
  SocketMessageDataParams,
  Rooms,
} from "./types";
import { MAX_ROOM_SIZE } from "./consts";

const PORT = 1234;
const wss = new WebSocketServer({ port: PORT });

// { "type": "create", "params": {}}

// { "type": "join",
// 	"params": {
// 		"code": "code"
// 	}
// }

// { "type": "leave", "params": {}}

const rooms: Rooms = {};

const createRoom = (ws: WebSocket): string => {
  let roomId;

  while (!roomId || rooms[roomId] !== undefined) {
    roomId = uuidv4();
  }

  // @ts-ignore
  ws.room = roomId;
  rooms[roomId] = [ws];

  return roomId;
};

const joinRoom = (ws: WebSocket, params: SocketMessageDataParams): boolean => {
  const { roomId } = params;

  if (
    !roomId ||
    rooms[roomId] === undefined ||
    rooms[roomId].length >= MAX_ROOM_SIZE
  )
    return false;

  // @ts-ignore
  ws.room = roomId;
  rooms[roomId].push(ws);
  return true;
};

const leaveRoom = (ws: WebSocket): boolean => {
  // @ts-ignore
  const roomId: string = ws.room;

  if (
    !roomId ||
    rooms[roomId] === undefined ||
    rooms[roomId].indexOf(ws) === -1
  )
    return false;

  rooms[roomId].filter((item) => item !== ws);
  return true;
};

// handles websocket connections/messages
wss.on("connection", (ws: WebSocket) => {
  console.log("connected with a socket!");
  console.log(typeof ws);

  // action handler
  ws.on("message", (data: string) => {
    const { type, params } = JSON.parse(data) as SocketMessageData;

    switch (type) {
      case SocketMessageDataType.Create:
        createRoom(ws);
        break;
      case SocketMessageDataType.Join:
        joinRoom(ws, params);
        break;
      case SocketMessageDataType.Leave:
        leaveRoom(ws);
        break;
    }
  });
});

console.log(`Listening on port ${PORT}...`);
