import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';

export function initSockets(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.emit('ping', { ok: true, ts: Date.now() });

    socket.on('join-order', (orderId: string) => {
      if (!orderId) return;
      socket.join(`order:${orderId}`);
      socket.emit('joined-order', { orderId });
    });

    socket.on('leave-order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on('chat:typing', (payload: { orderId: string; userId: string }) => {
      if (!payload?.orderId) return;
      socket.to(`order:${payload.orderId}`).emit('chat:typing', payload);
    });
  });

  return io;
}
