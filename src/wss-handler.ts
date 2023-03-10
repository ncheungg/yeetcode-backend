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
} from './types';
import { MAX_ROOM_SIZE, PROBLEM_TIME } from './consts';
import { getRandomProblem } from './utils';

const rooms: Rooms = {};
const userToRoom: UserToRoom = {};

// broadcasts a user message to all sockets except for itself
const broadcastMessage = (ws: WebSocket, message: Message): boolean => {
  if (!ws.userId) return false;

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

// updates all clients in a room when a player state changes
const broadcastPlayerStateUpdate = (
  ws: WebSocket,
  roomId: string,
  state: UserGameState
): boolean => {
  const { userId } = ws;
  if (!userId) return false;

  if (!roomId || !rooms[roomId]) return false;

  const updateStateMessage: Message = {
    type: MessageType.UpdateUserState,
    params: {
      playerStates: {
        [userId]: state,
      },
    },
    ts: new Date(),
  };

  for (const wsClient of Object.values(rooms[roomId].sockets)) {
    wsClient.send(JSON.stringify(updateStateMessage));
  }

  return true;
};

// updates all clients in a room to change all player states in a room
const broadcastPlayerStateUpdateAll = (
  roomId: string,
  state: UserGameState
): boolean => {
  if (!roomId || !rooms[roomId]) return false;

  const playerStates: Record<string, UserGameState> = {};
  for (const userId in rooms[roomId].sockets) {
    playerStates[userId] = state;
  }

  const updateStateMessage: Message = {
    type: MessageType.UpdateUserState,
    params: {
      playerStates,
    },
    ts: new Date(),
  };

  for (const wsClient of Object.values(rooms[roomId].sockets)) {
    wsClient.send(JSON.stringify(updateStateMessage));
  }

  return true;
};

// creates a room, broadcasts action message, sends roomId back to socket
const createRoom = (ws: WebSocket, params?: MessageParams): boolean => {
  if (!params?.userInfo?.userId) return false;

  const { userId } = params.userInfo;
  ws.userId = userId;

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
      [userId]: UserGameState.Unready,
    },
    isInGame: false,
  };
  rooms[roomId] = room;
  userToRoom[userId] = roomId;

  // broadcasts this state change to everyone (in this case just themselves)
  broadcastPlayerStateUpdate(ws, roomId, UserGameState.Unready);

  const actionMessage: Message = {
    type: MessageType.Action,
    params: {
      message: `${userId} created a room (${roomId})!`,
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

  return true;
};

const joinRoom = (ws: WebSocket, params?: MessageParams): boolean => {
  if (!params) return false;

  const { roomId, userInfo } = params;
  if (!userInfo?.userId) return false;

  const { userId } = userInfo;
  ws.userId = userId;

  if (
    !roomId ||
    !rooms[roomId] ||
    Object.keys(rooms[roomId].sockets).length >= MAX_ROOM_SIZE
  )
    return false;

  userToRoom[userId] = roomId;
  rooms[roomId].sockets[userId] = ws;

  // Unready if game hasn't started yet, spectating if game has started
  if (rooms[roomId].isInGame) {
    rooms[roomId].socketGameState[userId] = UserGameState.Spectating;
    broadcastPlayerStateUpdate(ws, roomId, UserGameState.Spectating);
  } else {
    rooms[roomId].socketGameState[userId] = UserGameState.Unready;
    broadcastPlayerStateUpdate(ws, roomId, UserGameState.Unready);
  }

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

export const leaveRoom = (ws: WebSocket): boolean => {
  const { userId } = ws;
  if (!userId) return false;

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
  if (!userId) return false;

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
      message: `?????? ${userId} viewed the Discussions tab! ??????`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  return true;
};

const broadcastFailed = (ws: WebSocket): boolean => {
  const { userId } = ws;
  if (!userId) return false;

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
      message: `???? ${userId}'s submission failed! ????`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  return true;
};

const playerFinished = (ws: WebSocket): boolean => {
  const { userId } = ws;
  if (!userId) return false;

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
  broadcastPlayerStateUpdate(ws, roomId, UserGameState.Finished);

  const message: Message = {
    type: MessageType.Action,
    params: {
      message: `??? ${userId} finished! ???`,
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
  if (!userId) return false;

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
      message: `?????? ${userId} viewed a hint! ??????`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  return true;
};

const broadcastSolutions = (ws: WebSocket): boolean => {
  const { userId } = ws;
  if (!userId) return false;

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
      message: `?????? ${userId} viewed the Solutions tab! ??????`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, message);

  return true;
};

const playerSubmit = (ws: WebSocket): boolean => {
  const { userId } = ws;
  if (!userId) return false;

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

  const room = rooms[roomId];
  const problem = getRandomProblem(room);
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

  // updates the player states on all clients
  broadcastPlayerStateUpdateAll(roomId, UserGameState.Playing);

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

  broadcastPlayerStateUpdateAll(roomId, UserGameState.Unready);

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

const playerForfeit = (ws: WebSocket): boolean => {
  const { userId } = ws;
  if (!userId) return false;

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

  rooms[roomId].round?.forfeited.push(ws);
  rooms[roomId].socketGameState[userId] = UserGameState.Forfeited;
  broadcastPlayerStateUpdate(ws, roomId, UserGameState.Forfeited);

  const message: Message = {
    type: MessageType.Action,
    params: {
      message: `??????? ${userId} forfeited! ???????`,
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
  if (!userId) return false;

  const roomId = userToRoom[userId];

  if (!roomId || !rooms[roomId] || !rooms[roomId].socketGameState[userId])
    return false;

  rooms[roomId].socketGameState[userId] = UserGameState.Unready;
  broadcastPlayerStateUpdate(ws, roomId, UserGameState.Unready);

  // send unready message
  const unreadyMessage: Message = {
    type: MessageType.Action,
    params: {
      message: `${userId} is not ready`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, unreadyMessage);

  return true;
};

const playerReady = (ws: WebSocket): boolean => {
  const { userId } = ws;
  if (!userId) return false;

  const roomId = userToRoom[userId];

  if (!roomId || !rooms[roomId] || !rooms[roomId].socketGameState[userId])
    return false;

  rooms[roomId].socketGameState[userId] = UserGameState.Ready;
  broadcastPlayerStateUpdate(ws, roomId, UserGameState.Ready);

  // send ready message
  const readyMessage: Message = {
    type: MessageType.Action,
    params: {
      message: `${userId} is ready!`,
    },
    ts: new Date(),
  };
  broadcastToRoom(roomId, readyMessage);

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

export const handleWebsocketConnection = (ws: WebSocket) => {
  console.log('connected with a socket!');

  // ping-pong handler
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // action handler
  ws.on('message', (data: string, isBinary) => {
    const message: string = isBinary ? data : data.toString();
    const { type, params, ts } = JSON.parse(message) as Message;

    switch (type) {
      case MessageType.Create:
        createRoom(ws, params);
        break;

      case MessageType.Join:
        joinRoom(ws, params);
        break;

      case MessageType.Discussion:
        broadcastDiscussion(ws);
        break;

      case MessageType.Failed:
        broadcastFailed(ws);
        break;

      case MessageType.Finished:
        playerFinished(ws);
        break;

      case MessageType.Hint:
        broadcastHint(ws);
        break;

      case MessageType.Message:
        const message: Message = { type, params, ts };
        broadcastMessage(ws, message);
        break;

      case MessageType.Solutions:
        broadcastSolutions(ws);
        break;

      case MessageType.Submit:
        playerSubmit(ws);
        break;

      case MessageType.Ready:
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
};
