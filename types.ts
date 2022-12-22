import { WebSocket as WebSocketOld } from 'ws';

export interface WebSocket extends WebSocketOld {
  userId: string;
}

export enum SocketMessageType {
  Create = 'create',
  Join = 'join',
  Leave = 'leave',
  Message = 'message',
  Hint = 'hint',
  Discussion = 'discussion',
  Solutions = 'solutions',
  Submit = 'submit',
  Finished = 'finished',
  Failed = 'failed',
  Action = 'action',
  Ready = 'ready',
  Unready = 'unready',
}

export enum UserGameState {
  Ready = 'ready',
  Unready = 'unready',
  Playing = 'playing',
  Spectating = 'spectating',
  Finished = 'finished',
}

export interface SocketMessageParams {
  roomId?: string;
  message?: string;
}

export interface SocketMessage {
  type: SocketMessageType;
  params: SocketMessageParams;
  ts: Date;
}

export enum ProblemDifficulty {
  Easy = 0,
  Medium = 1,
  Hard = 2,
}

export interface Problem {
  url: string;
  id: number;
  difficulty: ProblemDifficulty;
  name: string;
}

export interface Round {
  problem: Problem;
  expiryDate: Date;
  finishedOrder: WebSocket[];
}

export interface Room {
  id: string;
  sockets: {
    [userId: string]: WebSocket;
  };
  completedProblems: Problem[];
  socketGameState: {
    [userId: string]: UserGameState;
  };
  isInGame: boolean;
  round?: Round;
}

export interface Rooms {
  [id: string]: Room;
}

export interface UserToRoom {
  [id: string]: string | undefined;
}
