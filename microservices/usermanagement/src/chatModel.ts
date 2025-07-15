import db from './dbSqlite/db.js';
import { ChatMessage } from './userSocket.js';

export interface Message {
  username: string;
  userId: number;
  targetId: number;
  message: string;
}

export function createMessage(message: Message) {
  const stmt = db.prepare(`
    INSERT INTO conversation (
      username, userId, targetId, message
    ) VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    message.username,
    message.userId,
    message.targetId,
    message.message
);

  return result.lastInsertRowid;
}
