# Data Collection App (PWA)

Aplicação single-page (SPA) em JavaScript puro, sem frameworks, que funciona como **PWA instalável** para coleta de dados em campo no Campo de Provas Ford Tatuí.

## Screens

The app has 3 main screens navigated via a bottom tab bar:

| Screen | ID | Purpose |
|--------|----|---------|
| **Central** | `screen-home` | Shift management, quick actions, bento menu |
| **Telemetria** | `screen-telemetry` | GPS route logging, speed telemetry |
| **Histórico** | `screen-history` | Report feed (laudos, trips, shifts), PDF viewer |

## User Flow

```
Login (@ford.com) → Home Screen → Iniciar Turno (choose project/vehicle)
  ├── Roteiro R389 (lap-by-lap checklist)
  ├── Desaceleração 16 Laps (deceleration protocol)
  ├── Protocolo de Frenagem (braking test, 8 checkpoints)
  ├── Laudo Técnico (issue report with photo, severity)
  ├── Abastecimento (fuel refueling log)
  ├── Copiloto GPS (telemetry/route recording)
  └── Encerrar Turno (final km, liters, fuel station)
       └── Data saved to Firebase (Firestore + RTDB)
```

## Core Modules

### `app.js` (~4,000 lines)
Main application logic: Firebase init, turno state, GPS tracking, UI event handlers, PDF generation, data persistence, modal management. Contains the `app` object with all state variables (fotos, videosFiles, checkins, rastroGps, etc.).

### `turno-engine.js` (~3,159 lines)
Two engines:
- **PreCadastroEngine** — localStorage-based CRUD for operators and fuel stations
- **TurnoEngine** — Full shift lifecycle: `iniciar()`, `adicionarAbastecimento()`, `sincronizarComApp()`, `encerrar()`. Saves to both localStorage (active turno cache) and Firebase RTDB (`vev_turnos_ativos`)

### `auth-security.js` (~1,160 lines)
- Firebase Auth with email/password, LOCAL persistence
- `@ford.com` domain auto-approval
- 3-attempt lockout (5 min cooldown)
- EmailJS integration for approval workflows
- Security audit logs to Firestore (`vev_logs_seguranca`)
- Operator auto-registration on login

### `laudo-ia.js` (~1,069 lines)
Technical issue (laudo) creation with:
- Photo capture (compressed to 800px max)
- Severity selection (Leve/Moderado/Grave/Crítico)
- System affected (motor, transmissão, freios, suspensão, elétrica, etc.)
- Gemini API text refinement
- PDF generation via jsPDF with autoTable (5-page template)

### `analytics.js` (~775 lines)
- Trip analytics (export to Google Maps URL)
- Speed/ RPM summary, distance breakdown
- Per-vehicle FEG (fuel efficiency) trends
- Battery voltage tracking

### `dados-mestres.js` (219 lines)
Master data registry with Firestore sync:
- **PROJETOS**: Active projects (EET Ranger 2024, Ranger VoCF, Testes Especiais, 1M Mile)
- **TESTES_PISTA**: Track test types (Durabilidade, Especiais × Interno/Externo)
- Methods: `getProjetos()`, `getTestesPista()`, `getVeiculos()`, `getPostos()`

### `forms-engine.js` (123 lines)
Dynamic modal for project-specific Microsoft Forms links. Displays a list of form buttons per project, opening forms in new tabs.

### `notificacoes-engine.js` (71 lines)
Firestore-based notification system: `turnoEncerrado()`, `issueCritico()`, `kmExcedido()`, with real-time listener for coordinator panel.

## Modals (17+)

| Modal | Trigger | Purpose |
|-------|---------|---------|
| `modal-inicio-turno` | "Iniciar Turno" | Project, ambiente, vehicle, initial km |
| `modal-turno` | "Encerrar Turno" | Final km, liters, fuel station, observations |
| `modal-roteiro` | "Roteiro R389" | Lap-by-lap checklist (R389 protocol) |
| `modal-desaceleracao` | "Desaceleração" | 16-lap deceleration protocol |
| `modal-frenagem` | "Frenagem" | Braking test protocol (8 checkpoints) |
| `modal-laudo` | "Laudo Técnico" | Issue report form |
| `modal-laudos-pendentes` | Home indicator | View pending/open laudos |
| `modal-gps` | "Copiloto GPS" | Real-time GPS track recording |
| `modal-utilidades` | "Utilidades" | Quick tools/miscellaneous |
| `modal-analytics` | "Analytics" | Driver performance charts |
| `modal-aprovacoes` | Admin | Approval panel for new users |
| `modal-configuracoes-sistema` | Admin | System settings, log viewer |
| `modal-gerenciar-forms` | Admin | Form management |
| `modal-historico-turnos` | "Histórico" | Past shift history |
| `modal-historico-performance` | "Performance" | Performance history |
| `modal-login` | App start | Firebase Auth login |
| `modal-recuperacao` | Login screen | Password recovery |

## Telemetry (GPS)

The Copiloto GPS system records:
- GPS coordinates (batched to RTDB at `vev_gps_batch/`)
- Instant speed → speed bands (<80, 80-160, 160-230, >230 km/h)
- Distance traveled, average speed, max speed
- Chart.js real-time speed graph
- Route export to Google Maps URL

## PDF Generation

Generated via jsPDF + autoTable + html2canvas:
- **Laudo template**: 5 pages — header, vehicle data, occurrence description, photo page, digital signature
- **Route report**: Telemetry stats, speed distribution, map snapshot

## PWA Features

- **Service Worker**: `ford-vev-cache-v9`, network-first with offline fallback
- **Precached**: 14 assets (all JS modules, index.html, offline.html)
- **Installable**: `display: standalone`, maskable icons, theme color `#003399`
- **Offline page**: `offline.html` with "Você está offline" message and retry button

## Build (Vite)

```js
// vite.config.js highlights
- Build output: dist/
- JS minification: esbuild (drops console.log + debugger)
- Static JS files copied verbatim (not bundled) for Firebase compat SDK
- Assets cached 1 year (immutable) in firebase.json
```

## Key Routes (app.js)

| Function | Purpose |
|----------|---------|
| `app.iniciarTurno()` | Start shift, save to localStorage + RTDB |
| `app.encerrarTurno()` | End shift, save to Firestore collection |
| `app.adicionarAbastecimento()` | Log fuel refueling |
| `app.gerarRelatorioRodagem()` | Generate GPS route PDF |
| `app.salvarRastroGps()` | Batch-save GPS points |
| `app.abrirModal()` / `app.fecharModal()` | Modal management |
| `switchScreen('home'|'telemetry'|'history')` | Bottom nav screen switch |
