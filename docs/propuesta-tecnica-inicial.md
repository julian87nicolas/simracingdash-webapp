# Propuesta técnica inicial — Web app telemetría F1 2025

## Objetivo
Crear una web app **responsive** que reciba telemetría por **UDP** (IP configurable y puerto `20777` por defecto), procese los paquetes del juego **F1 2025** y renderice un dashboard visual inspirado en la pantalla del volante de F1.

---

## Opciones de stack (lenguaje + framework)

### Opción A (recomendada): TypeScript end-to-end
- **Backend**: Node.js + Fastify/NestJS
- **Frontend**: React + Vite + TypeScript
- **Tiempo real**: WebSocket (Socket.IO o ws)
- **Ventajas**:
  - Un único lenguaje en todo el proyecto.
  - Curva de desarrollo rápida para MVP.
  - Ecosistema muy maduro para UI responsive y data streaming.
- **Riesgos**:
  - Parsing binario UDP complejo puede requerir cuidado en buffers.

### Opción B: Go + TypeScript
- **Backend**: Go (UDP parser + API/WebSocket)
- **Frontend**: React + TypeScript
- **Ventajas**:
  - Excelente rendimiento para parsing UDP y concurrencia.
  - Binarios simples y despliegue muy robusto.
- **Riesgos**:
  - Dos lenguajes en el equipo.

### Opción C: Python + TypeScript
- **Backend**: Python (FastAPI + UDP worker)
- **Frontend**: React + TypeScript
- **Ventajas**:
  - Desarrollo rápido de parser/prototipo.
  - Facilidad para análisis posterior de telemetría.
- **Riesgos**:
  - Menor rendimiento bruto que Go para carga alta.

---

## Recomendación para comenzar
Para arrancar rápido y mantener mantenimiento simple, usar **Opción A (TypeScript end-to-end)**.

### ¿Por qué?
1. Te da velocidad para iterar UI + telemetría en paralelo.
2. Facilita compartir tipos de datos entre backend y frontend.
3. Dockerización y CI simples desde el día 1.

---

## Investigación de protocolo F1 2025 (enfoque)
El juego de F1 suele emitir paquetes UDP con estructuras binarias (cabecera + payloads por tipo de paquete). Para implementarlo correctamente hay que:

1. Confirmar el **UDP specification document oficial** de F1 2025.
2. Definir el parser por versión de protocolo (para evitar roturas por updates).
3. Mapear paquetes útiles para la UI inicial:
   - `Car telemetry`
   - `Lap data`
   - `Car status`
   - `Session`
   - `Participants` (si aplica)
4. Diseñar un modelo interno normalizado para UI (por ejemplo `DashboardState`).

> Nota: en la primera iteración conviene soportar solo los paquetes necesarios para la pantalla principal y ampliar gradualmente.

---

## Arquitectura propuesta (MVP)

### Flujo de datos
1. **UDP Listener** (backend): escucha en `HOST_UDP` + `PORT_UDP`.
2. **Parser Binario**: transforma paquetes a objetos tipados.
3. **State Aggregator**: mantiene estado actual por sesión/coche.
4. **Realtime Gateway**: emite estado al frontend vía WebSocket.
5. **Web UI**: renderiza componentes del volante (marcha, RPM, velocidad, ERS, combustible, delta, etc.).

### Configuración inicial
- `UDP_HOST=0.0.0.0`
- `UDP_PORT=20777`
- `WS_PORT=3001`
- `WEB_PORT=3000`

---

## Dockerización (obligatoria desde inicio)

### Servicios sugeridos
- `api` (backend UDP + WS)
- `web` (frontend React)
- (opcional) `nginx` para servir estáticos/proxy

### Entregables Docker mínimos
1. `Dockerfile` backend
2. `Dockerfile` frontend
3. `docker-compose.yml`
4. `.env.example`

### Consideraciones importantes
- Exponer UDP en compose (`20777/udp`).
- La UI debe ser responsive (mobile/tablet/desktop).
- Añadir healthchecks básicos para backend/frontend.

---

## Roadmap sugerido

### Fase 1 — Base técnica
- Monorepo (apps/web + apps/api)
- Docker + compose funcional
- Listener UDP activo y log de paquetes recibidos

### Fase 2 — Parser y modelo
- Parsear cabecera + 2–3 paquetes clave
- Construir `DashboardState`
- Publicar estado en WebSocket

### Fase 3 — UI volante
- Layout responsive estilo volante F1
- Widgets clave (RPM, gear, speed, DRS/ERS, fuel, lap delta)
- Animaciones suaves y legibles

### Fase 4 — Pulido
- Reconexión/estados vacíos
- Modo oscuro/alto contraste
- Métricas y perfilado

---

## Siguiente paso recomendado
Si te parece bien, en el siguiente paso te preparo un **scaffold inicial dockerizado** con:
- Backend TypeScript (UDP listener + WebSocket)
- Frontend React responsive con datos mock en vivo
- Estructura lista para enchufar el parser de F1 2025
