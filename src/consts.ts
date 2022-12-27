import { PROBLEMS } from './problems';

export const MAX_ROOM_SIZE = 15;
export const MAX_PROBLEM_SIZE = PROBLEMS.length;
export const HOST = 'localhost';
export const PORT = process.env.PORT || 1234;
export const PROBLEM_TIME = 30; // in minutes
export const SOCKET_TIMEOUT = 30000; // in milliseconds
