import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/config';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socketEvents';

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const getSocketClient = () => {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      auth: {
        token: sessionStorage.getItem('token') || undefined,
      },
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });
  }

  return socketInstance;
};

export const disconnectSocketClient = () => {
  if (!socketInstance) return;
  socketInstance.disconnect();
  socketInstance = null;
};

