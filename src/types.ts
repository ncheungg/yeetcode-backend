import { WebSocket as WebSocketOld } from 'ws';

export interface WebSocket extends WebSocketOld {
  userId: string;
  isAlive: boolean;
}

export enum MessageType {
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
  StartGame,
  EndGame,
  Forfeit,
}

export enum UserGameState {
  Ready,
  Unready,
  Playing,
  Spectating,
  Finished,
  Forfeited,
}

export interface MessageParams {
  roomId?: string;
  message?: string;
  problem?: Problem;
  userInfo?: UserInfo;
}

export interface Message {
  type: MessageType;
  params?: MessageParams;
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
  forfeited: WebSocket[];
  timeoutId: NodeJS.Timeout;
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

export interface WebSocketIDToUserName {
  [wsId: string]: string | undefined;
}

export interface UserInfo {
  userId?: string;
  avatarUrl?: string | null;
}
