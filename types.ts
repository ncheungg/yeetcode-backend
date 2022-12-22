import { WebSocket as WebSocketOld } from 'ws';

export interface WebSocket extends WebSocketOld {
  roomID?: string;
  userID?: string;
}

export enum SocketMessageType {
  Create = 'create',
  Join = 'join',
  Leave = 'leave',
  Message = 'message',
  Action = 'action',
}

export interface SocketMessageParams {
  roomID?: string;
  message?: string;
}

export interface SocketMessage {
  type: SocketMessageType;
  params: SocketMessageParams;
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
}

export interface Room {
  id: string;
  sockets: WebSocket[];
  completedProblems: Problem[];
  // userGameState
}

export interface Rooms {
  [id: string]: Room;
}
