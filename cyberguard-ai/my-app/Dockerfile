FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Install dependencies
RUN npm install

# Build TypeScript
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Run the server
CMD ["node", "dist/server.js"]
