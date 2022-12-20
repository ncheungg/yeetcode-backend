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

export interface Rooms {
  [id: string]: WebSocket[];
}
