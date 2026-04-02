FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY src/ ./src/

ENV PORT=3001
EXPOSE ${PORT}

CMD ["npx", "tsx", "src/index.ts"]
