FROM node:21-alpine
WORKDIR /app
COPY package.json .
RUN npm i -g pnpm && pnpm i
COPY . .
CMD pnpm start