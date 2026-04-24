FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY tsconfig.json ./
COPY src ./src

CMD ["npm", "run", "dev"]
