import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthService } from '../services/auth.service.ts';

export class SocketManager {
  private static io: SocketIOServer | null = null;

  public static initialize(ioInstance: SocketIOServer) {
    this.io = ioInstance;

    this.io.use((socket: Socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (token && typeof token === 'string') {
        const payload = AuthService.verifyToken(token);
        if (payload) {
          (socket as any).user = payload;
          return next();
        }
      }
      // Allow unauthenticated connection for public demo preview or handshake, but tag unauthenticated
      (socket as any).user = null;
      return next();
    });

    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user;
      if (user) {
        // Join organization room and role room
        socket.join(`org_${user.organizationId}`);
        socket.join(`role_${user.role}`);
        if (user.departmentId) {
          socket.join(`dept_${user.departmentId}`);
        }
      }

      socket.on('disconnect', () => {
        // Clean disconnect
      });
    });
  }

  public static broadcast(orgId: string, event: string, payload: any) {
    if (!this.io) return;
    this.io.to(`org_${orgId}`).emit(event, payload);
    // Also emit universally so active connected clients on dev dashboard receive live updates
    this.io.emit(event, payload);
  }
}
