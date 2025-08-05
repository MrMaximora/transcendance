import Fastify from 'fastify';
import dotenv from 'dotenv';
import jwt from '@fastify/jwt';
import {
  createRoom,
  inGame,
  awaitforOpponent,
  joinLobby,
  historyGame,
  postGame
} from './gameRoutes.js';
import { gameBoard } from './gameObjects/gameBoard.js';
import { Card } from './gameObjects/card.js';

//START FOR GAME SERVICES
const app = Fastify();
dotenv.config();
const PORT = process.env.GAME2_PORT;

// TOKEN 
app.register(jwt , {secret: process.env.JWT_SECRET!});

//ROUTES
app.register(createRoom, { prefix: 'api/game' });
app.register(inGame, { prefix: 'api/game' });
app.register(awaitforOpponent, {prefix: 'api/game' });
app.register(joinLobby, {prefix: 'api/game' })
app.register(historyGame, {prefix: 'api/game' });
app.register(postGame, { prefix: 'api/game' });

const tmp:gameBoard = new gameBoard;
tmp.startGame();
var playerOne : Card[] = tmp.getPlayerCard(1);
console.log("player one : ")
for (var i = 0; playerOne[i]; i++)
  console.log(`${playerOne[i].getType()}.${playerOne[i].getNumber()}`);
tmp.discardCard(1, playerOne[2].getType(), playerOne[2].getNumber());
tmp.drawCard(1);
var playerOne : Card[] = tmp.getPlayerCard(1);
console.log("\nplayer one : ")
for (var i = 0; playerOne[i]; i++)
  console.log(`${playerOne[i].getType()}.${playerOne[i].getNumber()}`);

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