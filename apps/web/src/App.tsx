import { useEffect, useMemo, useRef, useState } from 'react';

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

const initialState: DashboardState = {
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


const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';

function formatLapTime(ms: number) {
  if (!ms || ms < 0) return '--:--.---';
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const msRem = ms % 1000;
  return `${min}:${sec.toString().padStart(2, '0')}.${msRem.toString().padStart(3, '0')}`;
}

export function App() {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<DashboardState>(initialState);
  const [udpPort, setUdpPort] = useState<number>(20777);
  const [inputPort, setInputPort] = useState<string>('20777');
  const [started, setStarted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!started) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'configure_udp', udpPort }));
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type: string; data: DashboardState };
        if (payload.type === 'dashboard_state') {
          setState(payload.data);
        }
      } catch {
        // ignorar payload inválido
      }
    };

    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, [started, udpPort]);

  const rpmPercent = useMemo(() => Math.min(1, Math.max(0, state.rpm / 15000)), [state.rpm]);
  const throttlePercent = Math.round(state.throttle * 100);
  const brakePercent = Math.round(state.brake * 100);

  if (!started) {
    return (
      <main className="page">
        <section className="dash-card">
          <h2>Selecciona el puerto UDP del juego</h2>
          <form
            onSubmit={e => {
              e.preventDefault();
              const num = Number(inputPort);
              if (!isNaN(num) && num > 0 && num < 65536) {
                setUdpPort(num);
                setStarted(true);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}
          >
            <label>
              Puerto UDP (juego):
              <input
                type="number"
                min={1}
                max={65535}
                value={inputPort}
                onChange={e => setInputPort(e.target.value)}
                style={{ marginLeft: 8, fontSize: '1.1rem', padding: '0.2rem 0.5rem', borderRadius: 6, border: '1px solid #ccc' }}
              />
            </label>
            <button type="submit" style={{ fontSize: '1.1rem', padding: '0.4rem 1.2rem', borderRadius: 8, background: '#1a2a4a', color: '#fff', border: 'none', cursor: 'pointer' }}>
              Iniciar dashboard
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="dash-card f1-layout">
        {/* Alertas y estado de conexión */}
        <header className="top-row">
          <span className={`status ${connected ? 'ok' : 'down'}`}>{connected ? 'LIVE' : 'OFFLINE'}</span>
          <span className="meta">Packets: {state.packetCount}</span>
          <span className="alertas">BANDERA: {state.alertFlag || '--'} | PIT: {state.pitStatus || '--'}</span>
        </header>

        <div className="f1-main-grid">
          {/* Izquierda: DRS, ERS, Combustible */}
          <aside className="f1-left">
            <div className="f1-block">
              <div className="f1-label">DRS</div>
              <div className="f1-value">{state.drsActive ? 'ACTIVO' : 'INACTIVO'}</div>
            </div>
            <div className="f1-block">
              <div className="f1-label">ERS</div>
              <div className="f1-value">{state.ersPercent}%</div>
              <div className="f1-bar ers-bar"><div className="ers-fill" style={{width: `${state.ersPercent}%`}} /></div>
              <div className="f1-label">Modo: {state.ersMode}</div>
            </div>
            <div className="f1-block">
              <div className="f1-label">Combustible</div>
              <div className="f1-value">{state.fuelLevel} L</div>
              <div className="f1-bar fuel-bar"><div className="fuel-fill" style={{width: `${state.fuelLevel}%`}} /></div>
            </div>
          </aside>

          {/* Centro: Gear, Speed, RPM */}
          <section className="f1-center">
            <div className="f1-gear">{state.gear}</div>
            <div className="f1-speed">{state.speedKph} <span className="f1-unit">km/h</span></div>
            <div className="f1-rpm-row">
              <span className="f1-label">RPM</span>
              <span className="f1-rpm-value">{state.rpm}</span>
            </div>
            <div className="rpm-bar">
              <div className="rpm-fill" style={{ width: `${rpmPercent * 100}%` }} />
            </div>
            <div className="pedals">
              <div>
                <p className="label">Throttle</p>
                <p className="pedal-value">{throttlePercent}%</p>
              </div>
              <div>
                <p className="label">Brake</p>
                <p className="pedal-value">{brakePercent}%</p>
              </div>
            </div>
          </section>

          {/* Derecha: Delta, Tiempos, Sector */}
          <aside className="f1-right">
            <div className="f1-block">
              <div className="f1-label">Delta</div>
              <div className="f1-value">{state.lapDelta}</div>
            </div>
            <div className="f1-block">
              <div className="f1-label">Vuelta actual</div>
              <div className="f1-value">{formatLapTime(state.currentLapTime)}</div>
            </div>
            <div className="f1-block">
              <div className="f1-label">Mejor vuelta</div>
              <div className="f1-value">{formatLapTime(state.bestLapTime)}</div>
            </div>
            <div className="f1-block">
              <div className="f1-label">Sector</div>
              <div className="f1-value">{state.sector}</div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
