# Propuesta técnica inicial — Web app telemetría F1 2025 (modo estático)

## Objetivo
Crear una web app **responsive** que muestre telemetría del juego F1 2025 con look & feel similar al volante de F1, pero con una condición clave:

- **No depender de un servidor backend en la nube**.
- Poder desplegarse en hosting estático gratuito (GitHub Pages, Netlify, Vercel Static, Cloudflare Pages).

---

## Restricción técnica importante (UDP en navegador)
El navegador web **no puede abrir sockets UDP directamente** por seguridad.

Esto implica que una web estática pura **no puede** escuchar por sí sola `IP:PUERTO (20777)` del juego.

---

## Opciones viables sin servidor remoto

### Opción 1 (recomendada): Web estática + bridge local mínimo
- **Frontend**: React + TypeScript (estático)
- **Bridge local** (en tu PC): proceso ligero (Node.js/Go/Python) que:
  1. Escucha UDP de F1 2025 en `0.0.0.0:20777` (o configurable).
  2. Reenvía al navegador por WebSocket local (`ws://localhost:3001`).
- **Ventaja**: no hay backend en la nube; solo un helper local.
- **Resultado**: puedes hostear la UI como sitio estático gratis.

### Opción 2: App de escritorio (Tauri/Electron)
- Todo corre local: UI + listener UDP embebido.
- No requiere servidor externo.
- Mejor experiencia “plug & play”, pero deja de ser web pura en hosting estático.

### Opción 3: App móvil/tablet con relay local
- Similar a opción 1, pero el relay corre en el PC y la UI puede abrirse desde otro dispositivo.
- Requiere configurar red local/CORS/WS.

---

## Recomendación para tu caso
Dado que quieres hosting estático gratuito, la mejor estrategia es:

1. **UI 100% estática en React + TypeScript**.
2. **Bridge local opcional y mínimo** (sin despliegue cloud).
3. Mantener separación clara:
   - `apps/web` → desplegable como estático.
   - `apps/bridge` → ejecutable local para UDP.

Así cumples “sin server” en infraestructura remota, manteniendo acceso a UDP.

---

## Diseño MVP actualizado

### Flujo de datos
1. F1 2025 envía paquetes UDP a `UDP_PORT=20777`.
2. `bridge-local` parsea binario de F1 2025.
3. `bridge-local` publica estado normalizado por `ws://localhost:3001`.
4. `web` renderiza dashboard responsive estilo volante.

### Datos iniciales para dashboard
- Marcha (gear)
- RPM + barra de revoluciones
- Velocidad
- DRS
- ERS batería/modo
- Combustible
- Delta de vuelta
- Tiempo de vuelta actual/mejor

---

## Stack propuesto

### Frontend (estático)
- React + Vite + TypeScript
- Estado en tiempo real con Zustand/Redux Toolkit (opcional)
- UI: CSS Modules/Tailwind (a elección)

### Bridge local
- **Recomendado**: Node.js + TypeScript (rápido para arrancar)
- Alternativa de rendimiento: Go

---

## Dockerización
Sí, se puede dockerizar sin problema.

### Qué se dockeriza
- `web` (build estático + preview)
- `bridge` (listener UDP + WS local)

### Nota práctica
Para uso diario gamer (latencia + acceso a red local), suele ser más simple ejecutar el bridge como binario local; Docker queda excelente para desarrollo y pruebas.

---

## Investigación de protocolo F1 2025
Para implementación correcta del parser:
1. Validar documento oficial UDP Spec de F1 2025.
2. Implementar parser por tipo de paquete (header + payload).
3. Priorizar paquetes:
   - Car Telemetry
   - Car Status
   - Lap Data
   - Session
4. Mapear a un `DashboardState` común para la UI.

---

## Roadmap sugerido

### Fase 1
- Scaffold monorepo `apps/web` + `apps/bridge`
- UI responsive base con datos mock
- WebSocket client listo

### Fase 2
- UDP listener real en bridge (`20777` configurable)
- Parser inicial de 2–3 paquetes
- Streaming en vivo a UI

### Fase 3
- Dashboard estilo volante F1
- Estados de conexión, errores y reconexión
- Optimización visual/latencia

### Fase 4
- Build estático final para hosting gratuito
- Script instalador del bridge local (one-click)
- Documentación de setup (PC + juego)
