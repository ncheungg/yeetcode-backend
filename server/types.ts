import { WebSocket as WebSocketOld } from 'ws';

export interface WebSocket extends WebSocketOld {
  userId?: string;
  isAlive: boolean;
}

export enum MessageType {
  Create = 'Create',
  Join = 'Join',
  Leave = 'Leave',
  Message = 'Message',
  Hint = 'Hint',
  Discussion = 'Discussion',
  Solutions = 'Solutions',
  Submit = 'Submit',
  Finished = 'Finished',
  Failed = 'Failed',
  Action = 'Action',
  Ready = 'Ready',
  Unready = 'Unready',
  StartGame = 'StartGame',
  EndGame = 'EndGame',
  Forfeit = 'Forfeit',
}

export enum UserGameState {
  Ready = 'Ready',
  Unready = 'Unready',
  Playing = 'Playing',
  Spectating = 'Spectating',
  Finished = 'Finished',
  Forfeited = 'Forfeited',
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
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
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

export interface UserInfo {
  userId?: string;
  avatarUrl?: string | null;
}
