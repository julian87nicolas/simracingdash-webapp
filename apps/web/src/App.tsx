import { useEffect, useMemo, useState } from 'react';

type DashboardState = {
  packetCount: number;
  lastPacketAt: number | null;
  speedKph: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
};

const initialState: DashboardState = {
  packetCount: 0,
  lastPacketAt: null,
  speedKph: 0,
  rpm: 0,
  gear: 0,
  throttle: 0,
  brake: 0,
};

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001';

export function App() {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<DashboardState>(initialState);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setConnected(true);
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

    return () => ws.close();
  }, []);

  const rpmPercent = useMemo(() => Math.min(1, Math.max(0, state.rpm / 15000)), [state.rpm]);
  const throttlePercent = Math.round(state.throttle * 100);
  const brakePercent = Math.round(state.brake * 100);

  return (
    <main className="page">
      <section className="dash-card">
        <header className="top-row">
          <span className={`status ${connected ? 'ok' : 'down'}`}>{connected ? 'LIVE' : 'OFFLINE'}</span>
          <span className="meta">Packets: {state.packetCount}</span>
        </header>

        <div className="center-grid">
          <div className="metric">
            <p className="label">Speed</p>
            <p className="value">{state.speedKph}</p>
            <p className="unit">km/h</p>
          </div>

          <div className="metric gear">
            <p className="label">Gear</p>
            <p className="value">{state.gear}</p>
          </div>

          <div className="metric">
            <p className="label">RPM</p>
            <p className="value">{state.rpm}</p>
          </div>
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
    </main>
  );
}
