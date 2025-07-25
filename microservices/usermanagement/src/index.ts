import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import jwt from '@fastify/jwt';
import db from './dbSqlite/db.js';
import { Message } from './chatModel.js'
import { ChatMessage } from './userSocket.js';
import {
  auth,
  register
} from './authService.js';
import {
  friendList,
  profil,
  updateProfile,
  deleteProfile,
  friendAdd,
  friendDelete,
  friendSendMsg
} from './userRoutes.js';

dotenv.config();

const app = Fastify();

const PORT = process.env.USER_MANA_PORT;

//REQUEST CORS
await app.register(cors, {
  origin: '*',
  credentials: true,
});

export const io = new Server(app.server, {
  cors: {
    origin: '*', // ALL ORIGIN REQUEST ALLOWED
  },
});

// Socket.io logic
io.on('connection', (socket) => {
  console.log(`USER connected: ${socket.id}`);

  socket.on('register-socket', (userID: number) => {
    const stmt = db.prepare('UPDATE users SET socket = ?, is_online = 1 WHERE id = ?');
    stmt.run(socket.id, userID);
    console.log(`Socket ${socket.id} registered to user ${userID}`);
    const msg = db.prepare('SELECT * FROM conversation WHERE targetId = ?').all(userID) as Message[];
    if (msg) {
      msg.forEach(msg => {
        const tmp: ChatMessage = {
          from: msg.username,
          userId: msg.userId,
          target: msg.targetId,
          for: socket.id,
          text: msg.message,
          timestamp: msg.date
        };
        console.log(`old message send to ${socket.id}`);
        io.to(socket.id).emit('message', tmp);
      });
    }
    socket.on('message', (msg) => {
      console.log('message received');
      io.to(msg.for).emit('message', msg);
    });
  });

  socket.on('disconnect', () => {
    const stmt = db.prepare('UPDATE users SET is_online = 0 WHERE socket = ?');
    stmt.run(socket.id);
    console.log(`Socket ${socket.id} disconnected`);
  });
});

//TOKEN
await app.register(jwt, { secret: process.env.JWT_SECRET! });

// JWT auth hook
app.addHook('onRequest', async (request, reply) => {
  const url = request.raw.url || '';
  const publicRoutes = ['/api/user/login', '/api/user/register'];

  if (publicRoutes.some(route => url.startsWith(route))) return;

  try {
    if (request.headers.authorization) {
      await request.jwtVerify();
    } else {
      return reply.code(401).send({ error: 'Unauthor/userRoized: No token provided' });
    }
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
  }
});

// Register routes
app.register(register, { prefix: '/api/user' });
app.register(auth, { prefix: '/api/user' });
app.register(profil, { prefix: '/api/user' });
app.register(friendList, { prefix: '/api/user' });
app.register(updateProfile, { prefix: '/api/user' });
app.register(deleteProfile, { prefix: '/api/user' });
app.register(friendAdd, { prefix: '/api/user' });
app.register(friendDelete, { prefix: '/api/user' });
app.register(friendSendMsg, { prefix: '/api/user' });

// Start Fastify server
app.listen({ port: Number(PORT), host: '0.0.0.0' }, (err,) => {
  if (err) {
    console.error(err);
  }
  console.log(`User service running on port ${PORT}`);
});
