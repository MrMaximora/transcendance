#!/bin/sh

echo "📦 Setting up frontend..."

# Initialize package.json

cat <<EOF > package.json
{
  "name": "frontend",
  "version": "1.0.0",
  "description": "Fastify-based frontend service",
  "main": "src/index.ts",
  "scripts": {
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "fastify": "^4.22.2",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "ts-node-dev": "^2.0.0"
  }
}
EOF

# Install dependencies
echo "📁 Installing dependencies..."
npm install

# Build project
echo "🛠️ Building project..."
npm run build

# Install static server
npm install -g serve

echo "✅ Frontend setup complete!"