import { WebSocket as WebSocketOld } from 'ws';

export interface WebSocket extends WebSocketOld {
  roomID?: string;
  userID?: string;
}

export enum SocketMessageDataType {
  Create = 'create',
  Join = 'join',
  Leave = 'leave',
  Message = 'message',
  Action = 'action',
}

export interface SocketMessageDataParams {
  roomID?: string;
  message?: string;
}

export interface SocketMessageData {
  type: SocketMessageDataType;
  params: SocketMessageDataParams;
}

export interface Rooms {
  [id: string]: WebSocket[];
}
