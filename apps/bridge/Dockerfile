FROM node:22-alpine
WORKDIR /app

COPY package.json /app/package.json
COPY apps/bridge/package.json /app/apps/bridge/package.json

RUN npm install

COPY apps/bridge /app/apps/bridge

WORKDIR /app/apps/bridge
RUN npm run build

EXPOSE 3001
EXPOSE 20777/udp

CMD ["npm", "run", "start"]
