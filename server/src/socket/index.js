import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

let io;

/**
 * Simple cookie string parser.
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, pair) => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

/**
 * Initialise Socket.IO on the given HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {Server}
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || origin === env.CLIENT_URL || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    },
  });

  // ── Authentication middleware ────────────────────────────────────
  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) {
        return next(new Error('Authentication error: no cookie'));
      }

      const cookies = parseCookies(rawCookie);
      const token = cookies.token;

      if (!token) {
        return next(new Error('Authentication error: no token'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  // ── Connection handler ───────────────────────────────────────────
  io.on('connection', (socket) => {
    // Join the user's personal room
    socket.join(`user:${socket.userId}`);

    // If trainer, join their unique trainer room and global role room
    if (socket.userRole === 'trainer') {
      socket.join(`trainer:${socket.userId}`);
      socket.join('role:trainer');
    }

    // Join lecture room
    socket.on('join_lecture', (lectureId) => {
      if (lectureId) socket.join(`lecture:${lectureId}`);
    });

    socket.on('leave_lecture', (lectureId) => {
      if (lectureId) socket.leave(`lecture:${lectureId}`);
    });

    // Join batch room
    socket.on('join_batch', (batchId) => {
      if (batchId) socket.join(`batch:${batchId}`);
    });

    socket.on('leave_batch', (batchId) => {
      if (batchId) socket.leave(`batch:${batchId}`);
    });
  });

  return io;
}

/**
 * Get the current Socket.IO instance.
 * @returns {Server}
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.IO has not been initialised. Call initSocket() first.');
  }
  return io;
}

export default { initSocket, getIO };
