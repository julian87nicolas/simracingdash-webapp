FROM node:22-alpine AS build
WORKDIR /app

COPY package.json /app/package.json
COPY apps/web/package.json /app/apps/web/package.json

RUN npm install

COPY apps/web /app/apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
