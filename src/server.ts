import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  MessageType,
  MessageParams,
  Rooms,
  WebSocket,
  Room,
  UserGameState,
  UserToRoom,
  Round,
  Problem,
} from './types';
import {
  MAX_PROBLEM_SIZE,
  MAX_ROOM_SIZE,
  PORT,
  PROBLEM_TIME,
  SOCKET_TIMEOUT,
} from './consts';
import { getRandomProblem } from './utils';

const wss = new WebSocketServer({ port: PORT });
const rooms: Rooms = {};
const userToRoom: UserToRoom = {};

// broadcasts a user message to all sockets except for itself
const broadcastMessage = (ws: WebSocket, message: Message): boolean => {
  const roomId = userToRoom[ws.userId];

  if (!roomId || !rooms[roomId]) return false;

  for (const wsClient of Object.values(rooms[roomId].sockets)) {
    if (wsClient.userId === ws.userId) continue;
    wsClient.send(JSON.stringify(message));
  }

  return true;
};

// broadcasts to everyone in the room
const broadcastToRoom = (
  roomId: string | undefined,
  message: Message
): boolean => {
  if (!roomId || !rooms[roomId]) return false;

  for (const wsClient of Object.values(rooms[roomId].sockets)) {
    wsClient.send(JSON.stringify(message));
  }

  return true;
};

// creates a room, broadcasts action message, sends roomId back to socket
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

  const actionMessage: Message = {
    type: MessageType.Action,
    params: {
      message: `${userId} created a room!`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, actionMessage);

  const createRoomMessage: Message = {
    type: MessageType.Create,
    params: {
      roomId,
    },
    ts: new Date(),
  };
  ws.send(JSON.stringify(createRoomMessage));
};

const joinRoom = (ws: WebSocket, params?: MessageParams): boolean => {
  if (!params) return false;

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

  const actionMessage: Message = {
    type: MessageType.Action,
    params: {
      message: `${userId} joined the room!`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, actionMessage);

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

  const message: Message = {
    type: MessageType.Action,
    params: {
      message: `${userId} left the room!`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  return true;
};

const broadcastDiscussion = (ws: WebSocket): boolean => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  // only broadcast this action if user in game and user is still playing
  if (
    !roomId ||
    !rooms[roomId] ||
    !rooms[roomId].isInGame ||
    !rooms[roomId].round ||
    rooms[roomId].socketGameState[userId] !== UserGameState.Playing
  )
    return false;

  const message: Message = {
    type: MessageType.Action,
    params: {
      message: `⚠️ ${userId} viewed the Discussions tab! ⚠️`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  return true;
};

const broadcastFailed = (ws: WebSocket): boolean => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  // only broadcast this action if user in game and user is still playing
  if (
    !roomId ||
    !rooms[roomId] ||
    !rooms[roomId].isInGame ||
    !rooms[roomId].round ||
    rooms[roomId].socketGameState[userId] !== UserGameState.Playing
  )
    return false;

  const message: Message = {
    type: MessageType.Action,
    params: {
      message: `🛑 ${userId}'s submission failed! 🛑`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  return true;
};

const playerFinished = (ws: WebSocket): boolean => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  // only broadcast this action if user in game and user is still playing
  if (
    !roomId ||
    !rooms[roomId] ||
    !rooms[roomId].isInGame ||
    !rooms[roomId].round ||
    rooms[roomId].socketGameState[userId] !== UserGameState.Playing
  )
    return false;

  rooms[roomId].round?.finishedOrder.push(ws);
  rooms[roomId].socketGameState[userId] = UserGameState.Finished;

  const message: Message = {
    type: MessageType.Action,
    params: {
      message: `✅ ${userId} finished! ✅`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  // check if there are still people playing
  for (const state of Object.values(rooms[roomId].socketGameState)) {
    if (state === UserGameState.Playing) return true;
  }

  // if no one else is playing, we end the game
  endGame(roomId);

  return true;
};

const broadcastHint = (ws: WebSocket): boolean => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  // only broadcast this action if user in game and user is still playing
  if (
    !roomId ||
    !rooms[roomId] ||
    !rooms[roomId].isInGame ||
    !rooms[roomId].round ||
    rooms[roomId].socketGameState[userId] !== UserGameState.Playing
  )
    return false;

  const message: Message = {
    type: MessageType.Action,
    params: {
      message: `⚠️ ${userId} viewed a hint! ⚠️`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  return true;
};

const broadcastSolutions = (ws: WebSocket): boolean => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  // only broadcast this action if user in game and user is still playing
  if (
    !roomId ||
    !rooms[roomId] ||
    !rooms[roomId].isInGame ||
    !rooms[roomId].round ||
    rooms[roomId].socketGameState[userId] !== UserGameState.Playing
  )
    return false;

  const message: Message = {
    type: MessageType.Action,
    params: {
      message: `⚠️ ${userId} viewed the Solutions tab! ⚠️`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  return true;
};

const playerSubmit = (ws: WebSocket): boolean => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  // only broadcast this action if user in game and user is still playing
  if (
    !roomId ||
    !rooms[roomId] ||
    !rooms[roomId].isInGame ||
    !rooms[roomId].round ||
    rooms[roomId].socketGameState[userId] !== UserGameState.Playing
  )
    return false;

  const message: Message = {
    type: MessageType.Action,
    params: {
      message: `${userId} submitted!`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  return true;
};

const startGame = (roomId: string): boolean => {
  if (!roomId || !rooms[roomId]) return false;

  const problem = getRandomProblemForRoom(roomId);
  if (!problem) return false;

  const expiryDate = new Date(new Date().getTime() + PROBLEM_TIME * 60000);

  // creates a timer that automatically ends the game once timer exceeded
  // adds 5 extra seconds to round expiry date
  const delayInMs = expiryDate.getTime() - Date.now() + 5000;
  const timeoutId = setTimeout(() => {
    endGame(roomId);
  }, delayInMs);

  const round: Round = {
    problem: problem,
    expiryDate,
    finishedOrder: [],
    forfeited: [],
    timeoutId,
  };

  rooms[roomId].isInGame = true;
  rooms[roomId].round = round;
  rooms[roomId].completedProblems.add(problem);

  // flip all player states to 'playing'
  for (const user in rooms[roomId].socketGameState) {
    rooms[roomId].socketGameState[user] = UserGameState.Playing;
  }

  // sends the problem and its details to all users
  const problemMessage: Message = {
    type: MessageType.StartGame,
    params: {
      problem: problem,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, problemMessage);

  const actionMessage: Message = {
    type: MessageType.Action,
    params: {
      message: 'Game started!',
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, actionMessage);

  return true;
};

const endGame = (roomId: string): boolean => {
  if (!roomId || !rooms[roomId]) return false;

  // clear the round timer
  const timeoutId = rooms[roomId].round?.timeoutId;
  clearTimeout(timeoutId);

  delete rooms[roomId].round;
  rooms[roomId].isInGame = false;

  // flip all player states to 'unready'
  for (const user in rooms[roomId].socketGameState) {
    rooms[roomId].socketGameState[user] = UserGameState.Unready;
  }

  // sends a message to all sockets to end the game
  const endMessage: Message = {
    type: MessageType.EndGame,
    ts: new Date(),
  };
  broadcastToRoom(roomId, endMessage);

  const actionMessage: Message = {
    type: MessageType.Action,
    params: {
      message: 'Game finished!',
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, actionMessage);

  return true;
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

const playerForfeit = (ws: WebSocket): boolean => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  // only broadcast this action if user in game and user is still playing
  if (
    !roomId ||
    !rooms[roomId] ||
    !rooms[roomId].isInGame ||
    !rooms[roomId].round ||
    rooms[roomId].socketGameState[userId] !== UserGameState.Playing
  )
    return false;

  rooms[roomId].socketGameState[userId] = UserGameState.Forfeited;
  rooms[roomId].round?.forfeited.push(ws);

  const message: Message = {
    type: MessageType.Action,
    params: {
      message: `🏳️ ${userId} forfeited! 🏳️`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  // check if there are still people playing
  for (const state of Object.values(rooms[roomId].socketGameState)) {
    if (state === UserGameState.Playing) return true;
  }

  // if no one else is playing, we end the game
  endGame(roomId);

  return true;
};

const playerUnready = (ws: WebSocket): boolean => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  if (!roomId || !rooms[roomId] || !rooms[roomId].socketGameState[userId])
    return false;

  rooms[roomId].socketGameState[userId] = UserGameState.Unready;

  return true;
};

const playerReady = (ws: WebSocket): boolean => {
  const { userId } = ws;
  const roomId = userToRoom[userId];

  if (!roomId || !rooms[roomId] || !rooms[roomId].socketGameState[userId])
    return false;

  rooms[roomId].socketGameState[userId] = UserGameState.Ready;

  // start game if every user is ready
  const userStatesArray = Object.values(rooms[roomId].socketGameState);
  const everyUserIsReady = userStatesArray.every(
    (user) => user === UserGameState.Ready
  );

  if (everyUserIsReady) {
    startGame(roomId);
  }

  return true;
};

// handles websocket connections/messages
wss.on('connection', (ws: WebSocket) => {
  console.log('connected with a socket!');

  // ping-pong handler
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // action handler
  ws.on('message', (data: string, isBinary) => {
    // const message = isBinary ? data : data.toString();
    var message: string;
    if (isBinary) {
      message = data;
    } else {
      message = data.toString();
    }

    const { type, params, ts } = JSON.parse(message) as Message;

    switch (type) {
      case MessageType.Create:
        createRoom(ws);
        break;

      case MessageType.Join:
        joinRoom(ws, params);
        break;

      case MessageType.Discussion:
        console.log('got discussion');
        broadcastDiscussion(ws);
        break;

      case MessageType.Failed:
        console.log('got failed');
        broadcastFailed(ws);
        break;

      case MessageType.Finished:
        console.log('got finished');
        playerFinished(ws);
        break;

      case MessageType.Hint:
        console.log('got hint');
        broadcastHint(ws);
        break;

      case MessageType.Message:
        const message: Message = { type, params, ts };
        console.log('got message', message);

        broadcastMessage(ws, message);
        break;

      case MessageType.Solutions:
        console.log('got solutions');
        broadcastSolutions(ws);
        break;

      case MessageType.Submit:
        console.log('got submit');
        playerSubmit(ws);
        break;

      case MessageType.Ready:
        console.log('got ready');
        playerReady(ws);
        break;

      case MessageType.Unready:
        playerUnready(ws);
        break;

      case MessageType.Forfeit:
        playerForfeit(ws);
        break;

      default:
        console.error(`Error: could not process action of type ${type}`);
    }
  });

  ws.on('close', () => {
    leaveRoom(ws);
  });
});

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
