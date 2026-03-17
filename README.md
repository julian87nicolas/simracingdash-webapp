# SimRacing Dash WebApp

Proyecto inicial con dos apps:

- `apps/web`: dashboard responsive (sitio estático)
- `apps/bridge`: bridge local UDP -> WebSocket para telemetría F1

## Quickstart

```bash
npm install
npm run dev:bridge
npm run dev:web
```

Variables útiles del bridge:

- `UDP_HOST` (default: `0.0.0.0`)
- `UDP_PORT` (default: `20777`)
- `WS_HOST` (default: `0.0.0.0`)
- `WS_PORT` (default: `3001`)

Variables útiles del web:

- `VITE_WS_URL` (default: `ws://localhost:3001`)

## Docker

```bash
docker compose up --build
```

- Web: http://localhost:3000
- Bridge WS: ws://localhost:3001
- Bridge UDP: `20777/udp`
