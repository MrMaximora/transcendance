FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage caching
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install --save-dev @types/better-sqlite3

# Copy the rest of the source
COPY . .

# Compile TypeScript
RUN npx tsc

EXPOSE 3002

# Start the service
CMD ["node", "dist/index.js"]
