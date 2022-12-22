import { WebSocket as WebSocketOld } from 'ws';

export interface WebSocket extends WebSocketOld {
  userId: string;
}

export enum SocketMessageType {
  Create,
  Join,
  Leave,
  Message,
  Hint,
  Discussion,
  Solutions,
  Submit,
  Finished,
  Failed,
  Action,
  Ready,
  Unready,
}

export enum UserGameState {
  Ready,
  Unready,
  Playing,
  Spectating,
  Finished,
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
  Easy,
  Medium,
  Hard,
}

export interface Problem {
  url: string;
  id: number;
  difficulty: ProblemDifficulty;
  name: string;
  premium: boolean;
  topics: string[];
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
  completedProblems: Set<Problem>;
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
