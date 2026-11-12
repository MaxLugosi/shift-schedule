FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY server server
COPY client client
RUN npm run build


FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev && npm cache clean --force

COPY server/drizzle server/drizzle
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist

USER node
EXPOSE 8787
CMD ["node", "server/dist/index.js"]
