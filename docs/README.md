# Ford VEV — Proving Ground Operational System

Sistema integrado de telemetria, gestão de turnos e analytics para o Campo de Provas Ford Tatuí (TPG). Combina um **aplicativo PWA** para coleta de dados em campo (Operadores) com um **dashboard Streamlit** para análise gerencial (Coordenação/Engenharia).

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                    FORD VEV ECOSYSTEM                       │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐   │
│  │   DATA COLLECTION    │    │   ANALYTICS DASHBOARD    │   │
│  │   (PWA / Firebase)   │    │   (Streamlit + Plotly)   │   │
│  │                      │    │                          │   │
│  │  - Shift tracking    │◄──►│  - KPI dashboards       │   │
│  │  - GPS telemetry     │    │  - Live monitoring       │   │
│  │  - Technical reports │    │  - Fuel analysis         │   │
│  │  - Braking/accel     │    │  - Vehicle health cards  │   │
│  │  - Fuel refueling    │    │  - Pilot rankings        │   │
│  │  - Route logging     │    │  - Anomaly detection     │   │
│  │  - PDF generation    │    │  - Export to Excel/Sheets│   │
│  └─────────┬────────────┘    └───────────┬──────────────┘   │
│            │                             │                  │
│            ▼                             ▼                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              FIREBASE BACKEND                        │  │
│  │                                                      │  │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │  │
│  │  │Firestore │  │Realtime   │  │Auth (email/pass) │  │  │
│  │  │(historic)│  │Database   │  │@ford.com only    │  │  │
│  │  │          │  │(live ops) │  │with auto-approval│  │  │
│  │  └──────────┘  └───────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   EXTERNAL INTEGRATIONS                              │  │
│  │   - Google Sheets (via Apps Script)                  │  │
│  │   - Microsoft Forms (project-specific checklists)    │  │
│  │   - EmailJS (approval workflows)                     │  │
│  │   - Gemini API (laudo text refinement)               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

## Repo Structure

```
ford-vev-global-main/
│
├── index.html                 # PWA shell — 3 screens (Home/Telemetry/History)
├── app.js                     # Main app logic — shift engine, UI, laudos (~4K lines)
├── auth-security.js           # Firebase Auth, EmailJS, approvals, audit logs
├── turno-engine.js            # Shift lifecycle, GPS, fuel, pre-cadastro (~3K lines)
├── laudo-ia.js                # Technical report creation, Gemini integration
├── analytics.js               # Analytics dashboard (modal inside PWA)
├── vev-improvements.js        # Accessibility, modals, performance patches
├── dados-mestres.js           # Master data — projects, track tests, vehicles
├── forms-data.js              # Microsoft Forms registry per project
├── forms-engine.js            # Dynamic forms modal renderer
├── notificacoes-engine.js     # In-app notification system (Firestore)
│
├── service-worker.js          # PWA service worker (cache-v9)
├── manifest.json              # PWA manifest (standalone, pt-BR)
├── offline.html               # Offline fallback page
│
├── style.css                  # Full design system (~6K lines)
├── style-ws.css               # WebKit scrollbar styles
│
├── package.json               # Vite + Firebase v10
├── vite.config.js             # Build: minify, copy static JS to dist/
├── firebase.json              # Hosting config (dist/, Cache-Control, cleanUrls)
├── .firebaserc                # Default project: ford-vev
│
├── dashboard/
│   ├── app.py                 # Streamlit dashboard — 10 tabs (~2.8K lines)
│   ├── ford_vev_colab.py      # Google Colab companion script
│   ├── ford_vev_colab.ipynb   # Jupyter notebook version
│   ├── requirements.txt       # Python deps
│   └── .streamlit/config.toml # Theme: Ford dark blue + cyan accent
│
├── Jsonfirebase/
│   └── gestao-de-veiculos-municipal-*.json  # Service account key
│
├── Script vev tabela.txt      # Google Apps Script — syncs to Google Sheets
│
└── docs/                      # This documentation
    ├── README.md
    ├── DATA_COLLECTION.md
    ├── ANALYTICS_DASHBOARD.md
    ├── DATABASE.md
    └── DEPLOYMENT.md
```

## Quick Start

### Data Collection App (PWA)

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
# Opens at http://localhost:5173

# Build for production
npm run build

# Deploy to Firebase Hosting
npm run deploy
```

### Analytics Dashboard

```bash
cd dashboard

# Create virtual environment (recommended)
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run Streamlit
python -m streamlit run app.py --server.headless true
# Opens at http://localhost:8501
```

## Firebase Project

| Property | Value |
|----------|-------|
| Project ID | `ford-vev` |
| Auth Domain | `ford-vev.firebaseapp.com` |
| RTDB URL | `https://ford-vev-default-rtdb.firebaseio.com` |
| Storage Bucket | `ford-vev.firebasestorage.app` |
| Hosting Site | `ford-vev.web.app` |

## Key Numbers

| Metric | Value |
|--------|-------|
| JS files (modules) | 10 (copied verbatim to dist/) |
| HTML lines | 4,272 (3 screens, 17+ modals) |
| CSS lines | ~6,180 (custom design system) |
| Dashboard tabs | 10 (Streamlit) |
| Firestore collections | 19 |
| RTDB paths | 9 |
| Service cache version | `ford-vew-cache-v9` |
| Precached assets | 14 |

## Dependencies

**Frontend**: Firebase v10 (compat SDK via CDN), jsPDF, Chart.js, Leaflet (lazy), EmailJS, Google Fonts (Inter + Material Icons)

**Build**: Vite 5, ESLint, Prettier

**Dashboard**: Streamlit 1.31, Pandas 2.1, Plotly 5.18, NumPy 1.26, SciPy 1.12, Folium 0.16, gspread 6.0, OpenPyXL 3.1

## Skills & Agents (openforge)

Custom skills for AI-assisted development are defined in `.opencode/`:

- **power-bi-analysis** — DAX measures, star schema, Firebase connector for Power BI
- **dashboard-optimization** — Caching, session state, error boundaries, skeleton loading
- **frontend-ux** — Progressive disclosure, card patterns, responsive grid
- **data-analysis-visual** — Fleet benchmarking, health scores, anomaly detection
- **refresh-ux** — User-controlled refresh, state preservation

## License

Internal Ford Motor Company — TPG Insight AI
