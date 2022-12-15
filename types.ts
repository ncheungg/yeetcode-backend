import { WebSocket } from "ws";

export enum SocketMessageDataType {
  Create = "create",
  Join = "join",
  Leave = "leave",
}

export interface SocketMessageDataParams {
  roomId?: string;
}

export interface SocketMessageData {
  type: SocketMessageDataType;
  params: SocketMessageDataParams;
}

export interface Rooms {
  [id: string]: WebSocket[];
}
