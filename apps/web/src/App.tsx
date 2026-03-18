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


function buildWsUrl(port: number) {
  // Usa localhost y el puerto dado
  return `ws://localhost:${port}`;
}

export function App() {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<DashboardState>(initialState);
  const [port, setPort] = useState<number>(20777);
  const [inputPort, setInputPort] = useState<string>('20777');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    const ws = new WebSocket(buildWsUrl(port));

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
  }, [port, started]);

  const rpmPercent = useMemo(() => Math.min(1, Math.max(0, state.rpm / 15000)), [state.rpm]);
  const throttlePercent = Math.round(state.throttle * 100);
  const brakePercent = Math.round(state.brake * 100);

  if (!started) {
    return (
      <main className="page">
        <section className="dash-card">
          <h2>Selecciona el puerto UDP</h2>
          <form
            onSubmit={e => {
              e.preventDefault();
              const num = Number(inputPort);
              if (!isNaN(num) && num > 0 && num < 65536) {
                setPort(num);
                setStarted(true);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}
          >
            <label>
              Puerto UDP:
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
