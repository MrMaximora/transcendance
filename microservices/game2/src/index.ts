import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { Server } from "socket.io";
import {
  createRoom,
  inGame,
  awaitforOpponent,
  joinLobby,
  historyGame,
  postGame
} from './gameRoutes.js';

dotenv.config();

//START FOR GAME SERVICES
const app = Fastify();

const PORT = process.env.GAME2_PORT;


await app.register(cors, {
  origin: '*',
  credentials: true,
});

export const io = new Server(app.server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log(`socket connected : ${socket.id}`);


})

// TOKEN 
app.register(jwt , {secret: process.env.JWT_SECRET!});

//ROUTES
app.register(createRoom, { prefix: 'api/game' });
app.register(inGame, { prefix: 'api/game' });
app.register(awaitforOpponent, {prefix: 'api/game' });
app.register(joinLobby, {prefix: 'api/game' })
app.register(historyGame, {prefix: 'api/game' });
app.register(postGame, { prefix: 'api/game' });

// HOOK
app.addHook('onRequest', async (request, reply) => {
  try {
    if (request.headers.authorization) {
      await request.jwtVerify();
    } else {
     return reply.status(401).send({ error: 'Unauthorized: No token provided' });
    }
  } catch (err) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
  }
});

app.listen({ port: Number(PORT), host: '0.0.0.0' }, err => {
  if (err) throw err;
  console.log(`Game 2 service running on port ${PORT}`);
});