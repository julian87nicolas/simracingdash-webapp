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
  drsActive: boolean;
  ersPercent: number;
  ersMode: string;
  fuelLevel: number;
  lapDelta: number | string;
  currentLapTime: number;
  bestLapTime: number;
  sector: string;
  alertFlag: string;
  pitStatus: string;
};

const UDP_HOST = process.env.UDP_HOST ?? '0.0.0.0';
const UDP_PORT = Number(process.env.UDP_PORT ?? 20777);
const WS_HOST = process.env.WS_HOST ?? '0.0.0.0';
const WS_PORT = Number(process.env.WS_PORT ?? 3001);
let currentUdpPort = UDP_PORT;

const state: DashboardState = {
  packetCount: 0,
  lastPacketAt: null,
  speedKph: 0,
  rpm: 0,
  gear: 0,
  throttle: 0,
  brake: 0,
  drsActive: false,
  ersPercent: 0,
  ersMode: 'NORM',
  fuelLevel: 100,
  lapDelta: 0,
  currentLapTime: 0,
  bestLapTime: 0,
  sector: 'S1',
  alertFlag: '',
  pitStatus: '',
};

const wss = new WebSocketServer({ host: WS_HOST, port: WS_PORT });
let udp = createUdpSocket();

function broadcastState() {
  const payload = JSON.stringify({ type: 'dashboard_state', data: state });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

function broadcastBridgeStatus() {
  const payload = JSON.stringify({ type: 'bridge_status', data: { udpPort: currentUdpPort } });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

function createUdpSocket() {
  const socket = dgram.createSocket('udp4');

  socket.on('message', (msg, rinfo) => {
    state.packetCount += 1;
    const parsed = parseTelemetryFrame(msg);
    console.log(`[bridge] UDP de ${rinfo.address}:${rinfo.port} - ${msg.length} bytes`);
    console.log(`[bridge] Raw hex (primeros 64 bytes): ${msg.slice(0, 64).toString('hex')}`);
    console.log('[bridge] Parseado:', parsed);
    Object.assign(state, parsed);
    broadcastState();
  });

  socket.on('listening', () => {
    const address = socket.address();
    if (typeof address === 'string') {
      console.log(`[bridge] UDP escuchando en ${address}`);
    } else {
      console.log(`[bridge] UDP escuchando en ${address.address}:${address.port}`);
    }
    broadcastBridgeStatus();
  });

  socket.on('error', (error) => {
    console.error('[bridge] UDP error:', error);
  });

  return socket;
}

function rebindUdpPort(nextPort: number) {
  if (!Number.isInteger(nextPort) || nextPort < 1 || nextPort > 65535) {
    console.error(`[bridge] Puerto UDP inválido solicitado: ${nextPort}`);
    return;
  }
  if (nextPort === currentUdpPort) {
    broadcastBridgeStatus();
    return;
  }

  const oldSocket = udp;
  const newSocket = createUdpSocket();
  currentUdpPort = nextPort;
  udp = newSocket;

  oldSocket.close(() => {
    console.log(`[bridge] Reconfigurando UDP a ${UDP_HOST}:${currentUdpPort}`);
    newSocket.bind(currentUdpPort, UDP_HOST);
  });
}

function parseTelemetryFrame(msg: Buffer): Partial<DashboardState> {
  // Parser temporal MVP:
  // 1) Intentamos leer algunos offsets típicos de telemetría (pueden cambiar por versión).
  // 2) Si no hay tamaño suficiente, no actualizamos estado.
  const now = Date.now();
  if (msg.length >= 60) {
    const speedKph = msg.readUInt16LE(48);
    const throttleRaw = msg.readUInt8(52);
    const brakeRaw = msg.readUInt8(53);
    const gearRaw = msg.readInt8(54);
    const rpm = msg.readUInt16LE(55);
    // Aquí deberías mapear los offsets reales para los nuevos campos si tienes el spec
    return {
      speedKph: Number.isFinite(speedKph) ? speedKph : 0,
      throttle: Math.min(Math.max(throttleRaw / 255, 0), 1),
      brake: Math.min(Math.max(brakeRaw / 255, 0), 1),
      gear: Number.isFinite(gearRaw) ? gearRaw : 0,
      rpm: Number.isFinite(rpm) ? rpm : 0,
      lastPacketAt: now,
      // TODO: mapear los siguientes campos a partir del buffer real
      drsActive: false,
      ersPercent: 0,
      ersMode: 'NORM',
      fuelLevel: 0,
      lapDelta: 0,
      currentLapTime: 0,
      bestLapTime: 0,
      sector: 'S1',
      alertFlag: '',
      pitStatus: '',
    };
  }
  // Si no hay datos reales, no devolver nada
  return {};
}

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'dashboard_state', data: state }));
  socket.send(JSON.stringify({ type: 'bridge_status', data: { udpPort: currentUdpPort } }));

  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type?: string; udpPort?: number };
      if (msg.type === 'configure_udp' && typeof msg.udpPort === 'number') {
        rebindUdpPort(msg.udpPort);
      }
    } catch {
      console.error('[bridge] Mensaje WS inválido recibido');
    }
  });
});

wss.on('listening', () => {
  console.log(`[bridge] WS escuchando en ws://${WS_HOST}:${WS_PORT}`);
  console.log('[bridge] Esperando paquetes UDP de F1 2025...');
});

udp.bind(currentUdpPort, UDP_HOST);
