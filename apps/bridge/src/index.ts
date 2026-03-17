import dgram from 'node:dgram';
import { WebSocketServer } from 'ws';

type DashboardState = {
  packetCount: number;
  lastPacketAt: number | null;
  speedKph: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
};

const UDP_HOST = process.env.UDP_HOST ?? '0.0.0.0';
const UDP_PORT = Number(process.env.UDP_PORT ?? 20777);
const WS_HOST = process.env.WS_HOST ?? '0.0.0.0';
const WS_PORT = Number(process.env.WS_PORT ?? 3001);

const state: DashboardState = {
  packetCount: 0,
  lastPacketAt: null,
  speedKph: 0,
  rpm: 0,
  gear: 0,
  throttle: 0,
  brake: 0,
};

const udp = dgram.createSocket('udp4');
const wss = new WebSocketServer({ host: WS_HOST, port: WS_PORT });

function broadcastState() {
  const payload = JSON.stringify({ type: 'dashboard_state', data: state });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

function parseTelemetryFrame(msg: Buffer): Partial<DashboardState> {
  // Parser temporal MVP:
  // 1) Intentamos leer algunos offsets típicos de telemetría (pueden cambiar por versión).
  // 2) Si no hay tamaño suficiente, generamos valores simulados para validar UI end-to-end.
  const now = Date.now();
  if (msg.length >= 60) {
    const speedKph = msg.readUInt16LE(48);
    const throttleRaw = msg.readUInt8(52);
    const brakeRaw = msg.readUInt8(53);
    const gearRaw = msg.readInt8(54);
    const rpm = msg.readUInt16LE(55);

    return {
      speedKph: Number.isFinite(speedKph) ? speedKph : 0,
      throttle: Math.min(Math.max(throttleRaw / 255, 0), 1),
      brake: Math.min(Math.max(brakeRaw / 255, 0), 1),
      gear: Number.isFinite(gearRaw) ? gearRaw : 0,
      rpm: Number.isFinite(rpm) ? rpm : 0,
      lastPacketAt: now,
    };
  }

  const phase = (now / 600) % (Math.PI * 2);
  return {
    speedKph: Math.round(180 + 40 * Math.sin(phase)),
    rpm: Math.round(10500 + 1200 * Math.sin(phase * 1.3)),
    gear: 6 + Math.round(Math.sin(phase * 0.8)),
    throttle: 0.7 + 0.3 * Math.sin(phase),
    brake: Math.max(0, 0.4 * Math.sin(phase + Math.PI)),
    lastPacketAt: now,
  };
}

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'dashboard_state', data: state }));
});

udp.on('message', (msg) => {
  state.packetCount += 1;
  Object.assign(state, parseTelemetryFrame(msg));
  broadcastState();
});

udp.on('listening', () => {
  const address = udp.address();
  console.log(`[bridge] UDP escuchando en ${(address as dgram.AddressInfo).address}:${(address as dgram.AddressInfo).port}`);
});

udp.on('error', (error) => {
  console.error('[bridge] UDP error:', error);
});

wss.on('listening', () => {
  console.log(`[bridge] WS escuchando en ws://${WS_HOST}:${WS_PORT}`);
  console.log('[bridge] Esperando paquetes UDP de F1 2025...');
});

setInterval(() => {
  if (Date.now() - (state.lastPacketAt ?? 0) > 1200) {
    const fallback = parseTelemetryFrame(Buffer.alloc(0));
    state.packetCount += 1;
    Object.assign(state, fallback);
    broadcastState();
  }
}, 250);

udp.bind(UDP_PORT, UDP_HOST);
