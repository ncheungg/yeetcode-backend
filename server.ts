import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  SocketMessage,
  SocketMessageType,
  SocketMessageParams,
  Rooms,
  WebSocket,
  Room,
  UserGameState,
  UserToRoom,
  Round,
  Problem,
} from './types';
import { MAX_PROBLEM_SIZE, MAX_ROOM_SIZE, PORT, PROBLEM_TIME } from './consts';
import { getRandomProblem } from './utils';

const wss = new WebSocketServer({ port: PORT });
const rooms: Rooms = {};
const userToRoom: UserToRoom = {};

const broadcastMessage = (ws: WebSocket, message: SocketMessage): boolean => {
  const roomId = userToRoom[ws.userId];

  if (!roomId || !rooms[roomId]) return false;

  for (const wsClient of Object.values(rooms[roomId].sockets)) {
    if (wsClient.userId === ws.userId) continue;
    wsClient.send(message);
  }

  return true;
};

const broadcastAction = (
  roomId: string | undefined,
  message: SocketMessage
): boolean => {
  if (!roomId || !rooms[roomId]) return false;

  for (const wsClient of Object.values(rooms[roomId].sockets)) {
    wsClient.send(message);
  }

  return true;
};

// creates a room, broadcasts action message, returns roomId to socket
const createRoom = (ws: WebSocket): void => {
  const { userId } = ws;
  let roomId: string | undefined;

  while (!roomId || rooms[roomId] !== undefined) {
    roomId = uuidv4();
  }

  const room: Room = {
    id: roomId,
    sockets: {
      [userId]: ws,
    },
    completedProblems: new Set(),
    socketGameState: {
      [userId]: UserGameState.Spectating,
    },
    isInGame: false,
  };
  rooms[roomId] = room;
  userToRoom[userId] = roomId;

  const actionMessage: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `${userId} created a room!`,
    },
    ts: new Date(),
  };
  broadcastAction(roomId, actionMessage);

  const createRoomMessage: SocketMessage = {
    type: SocketMessageType.Create,
    params: {
      roomId,
    },
    ts: new Date(),
  };
  ws.send(createRoomMessage);
};

const joinRoom = (ws: WebSocket, params: SocketMessageParams): boolean => {
  const { roomId } = params;
  const { userId } = ws;

  if (
    !roomId ||
    !rooms[roomId] ||
    Object.keys(rooms[roomId].sockets).length >= MAX_ROOM_SIZE
  )
    return false;

  userToRoom[userId] = roomId;
  rooms[roomId].sockets[userId] = ws;

  // Unready if game hasn't started yet, spectating if game has started
  rooms[roomId].socketGameState[userId] = rooms[roomId].isInGame
    ? UserGameState.Spectating
    : UserGameState.Unready;

  const actionMessage: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `${userId} joined the room!`,
    },
    ts: new Date(),
  };
  broadcastAction(roomId, actionMessage);

  return true;
};

const leaveRoom = (ws: WebSocket): boolean => {
  const { userId } = ws;
  const roomId: string | undefined = userToRoom[userId];

  if (
    !roomId ||
    !rooms[roomId] ||
    !rooms[roomId].sockets[userId] ||
    !rooms[roomId].socketGameState[userId]
  )
    return false;

  delete rooms[roomId].sockets[userId];
  delete rooms[roomId].socketGameState[userId];

  if (
    Object.keys(rooms[roomId].sockets).length === 0 ||
    Object.keys(rooms[roomId].socketGameState).length === 0
  ) {
    delete rooms[roomId];
    return true;
  }

  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `${userId} left the room!`,
    },
    ts: new Date(),
  };
  broadcastAction(roomId, message);

  return true;
};

const broadcastDiscussion = (ws: WebSocket): void => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `⚠️ ${userId} viewed the Discussions tab! ⚠️`,
    },
    ts: new Date(),
  };
  broadcastAction(roomId, message);
};

const broadcastFailed = (ws: WebSocket): void => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `🛑 ${userId}'s submission failed! 🛑`,
    },
    ts: new Date(),
  };
  broadcastAction(roomId, message);
};

const playerFinished = (ws: WebSocket): void => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  if (!roomId || !rooms[roomId] || !rooms[roomId].socketGameState[userId])
    return;

  rooms[roomId].round?.finishedOrder.push(ws);
  rooms[roomId].socketGameState[userId] = UserGameState.Finished;

  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `✅ ${userId} finished! ✅`,
    },
    ts: new Date(),
  };
  broadcastAction(roomId, message);
};

const broadcastHint = (ws: WebSocket): void => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `⚠️ ${userId} viewed a hint! ⚠️`,
    },
    ts: new Date(),
  };
  broadcastAction(roomId, message);
};

const broadcastSolutions = (ws: WebSocket): void => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `⚠️ ${userId} viewed the Solutions tab! ⚠️`,
    },
    ts: new Date(),
  };
  broadcastAction(roomId, message);
};

const broadcastSubmit = (ws: WebSocket): void => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: `${userId} submitted!`,
    },
    ts: new Date(),
  };
  broadcastAction(roomId, message);
};

const startGame = (roomId: string): void => {
  const problem = getRandomProblemForRoom(roomId);
  if (!problem) return;

  const round: Round = {
    problem: problem,
    expiryDate: new Date(new Date().getTime() + PROBLEM_TIME * 60000),
    finishedOrder: [],
  };

  rooms[roomId].isInGame = true;
  rooms[roomId].round = round;
  rooms[roomId].completedProblems.add(problem);

  // flip all player states to 'playing'
  for (const user in rooms[roomId].socketGameState) {
    rooms[roomId].socketGameState[user] = UserGameState.Playing;
  }

  const message: SocketMessage = {
    type: SocketMessageType.Action,
    params: {
      message: '🏁 Game started! 🏁',
    },
    ts: new Date(),
  };
  broadcastAction(roomId, message);
};

const getRandomProblemForRoom = (roomId: string): Problem | undefined => {
  const room = rooms[roomId];

  if (!room || room.completedProblems.size >= MAX_PROBLEM_SIZE)
    return undefined;

  let problem: Problem | undefined;

  while (!problem || room.completedProblems.has(problem)) {
    problem = getRandomProblem();
  }

  return problem;
};

const playerUnready = (ws: WebSocket): void => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  if (!roomId || !rooms[roomId] || !rooms[roomId].socketGameState[userId])
    return;

  rooms[roomId].socketGameState[userId] = UserGameState.Unready;
};

const playerReady = (ws: WebSocket): void => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  if (!roomId || !rooms[roomId] || !rooms[roomId].socketGameState[userId])
    return;

  rooms[roomId].socketGameState[userId] = UserGameState.Ready;

  // start game if every user is ready
  const userStatesArray = Object.values(rooms[roomId].socketGameState);
  const everyUserIsReady = userStatesArray.every(
    (user) => user === UserGameState.Ready
  );

  if (everyUserIsReady) {
    startGame(roomId);
  }
};

// handles websocket connections/messages
wss.on('connection', (ws: WebSocket) => {
  console.log('connected with a socket!');
  console.log(ws);

  // action handler
  ws.on('message', (data: string) => {
    const { type, params, ts } = JSON.parse(data) as SocketMessage;

    switch (type) {
      case SocketMessageType.Create:
        createRoom(ws);
        break;

      case SocketMessageType.Join:
        joinRoom(ws, params);
        break;

      case SocketMessageType.Discussion:
        broadcastDiscussion(ws);
        break;

      case SocketMessageType.Failed:
        broadcastFailed(ws);
        break;

      case SocketMessageType.Finished:
        playerFinished(ws);
        break;

      case SocketMessageType.Hint:
        broadcastHint(ws);
        break;

      case SocketMessageType.Message:
        const message: SocketMessage = { type, params, ts };
        broadcastMessage(ws, message);
        break;

      case SocketMessageType.Solutions:
        broadcastSolutions(ws);
        break;

      case SocketMessageType.Submit:
        broadcastSubmit(ws);
        break;

      case SocketMessageType.Ready:
        playerReady(ws);
        break;

      case SocketMessageType.Unready:
        playerUnready(ws);
        break;

      default:
        console.error(`Error: could not process action of type ${type}`);
    }
  });

  ws.on('close', () => {
    leaveRoom(ws);
  });
});

console.log(`Listening on port ${PORT}...`);
