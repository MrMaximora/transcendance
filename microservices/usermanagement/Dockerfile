FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install
RUn npm install socket.io-client
RUN npm install --save-dev @types/better-sqlite3

COPY . .

RUN npx tsc

EXPOSE 3001
EXPOSE 3004

CMD ["node", "dist/index.js"]