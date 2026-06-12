# Analytics Dashboard (Streamlit)

Dashboard gerencial para coordenação e engenharia, construído em **Streamlit 1.31** com **Plotly** para visualizações, consumindo dados do Firebase Realtime Database.

## Access

```
http://localhost:8501

Start command:
python -m streamlit run dashboard/app.py --server.headless true
```

## Theme

Ford Motor Co. dark theme, defined in `.streamlit/config.toml`:

| Token | Value | Usage |
|-------|-------|-------|
| `primaryColor` | `#38bdf8` | Cyan accent |
| `backgroundColor` | `#0f172a` | Dark navy |
| `secondaryBackgroundColor` | `#1e293b` | Card surfaces |
| `textColor` | `#f8fafc` | Light text |

Two theme variants available in sidebar: **Premium Dark** (default) and **Industrial Light** (light mode).

## 10 Dashboard Tabs

### Tab 0 — Resumo Gerencial
Executive overview for management. Shows:
- **Operational Score** (composite 0-100 with color coding)
- **Traffic Light KPIs**: Fuel alerts, active laudos, overdue maintenance
- **Top 5 Vehicles by KM** (bar chart)
- **Fleet Summary**: Total vehicles, active operators, fuel consumption, incident rate

### Tab 1 — Visão Geral
Comprehensive fleet overview with filters (project, operator, vehicle, date range):
- **Distance timeline**: KM accumulated over time (line chart)
- **Operator ranking**: Bars by total distance
- **Vehicle usage heatmap**: Hours × days matrix
- **KPI Cards**: Total KM, total liters, avg consumption, sessions count

### Tab 2 — Monitoramento Ao Vivo
Real-time active shifts:
- **Active operators** cards with current vehicle, timer, project
- **Live fuel consumption** gauge
- **Active sessions** timeline
- **GPS breadcrumbs** map (Folium) — last known positions

### Tab 3 — Combustível
Fuel analytics:
- **FEG trends**: Km/L per vehicle over time
- **Station comparison**: Fuel cost/efficiency by posto
- **Refueling frequency**: Histogram of intervals
- **Project fuel distribution**: Pie chart of liters by project
- **Anomaly detection**: Flag outliers in consumption (>2σ from mean)

### Tab 4 — Laudos e Saúde
Technical issue (laudo) tracking:
- **Issue severity breakdown**: Critical/High/Medium/Low
- **Affected systems pie chart**: Motor, freios, suspensão, etc.
- **Vehicle health score**: 0-100 composite score per vehicle
- **Open vs resolved** trend over time
- **MTBF** (Mean Time Between Failures) per system

### Tab 5 — Protocolos de Teste
Active test protocols and compliance:
- **Protocol completion rate**: % of laps/checkpoints completed
- **Track time distribution**: Interno vs Externo
- **R389 compliance**: Per-vehicle protocol adherence
- **Braking/deceleration test results**

### Tab 6 — Ranking de Pilotos
Driver performance competitive ranking:
- **Composite pilot score**: Efficiency + safety + consistency
- **FEG ranking**: Best fuel efficiency
- **KM/Lap profile**: Per-pilot distance and productivity
- **Multi-metric leaderboard**: Sortable by distance, efficiency, sessions

### Tab 7 — Analytics Avançado
Advanced statistical analysis:
- **Fleet benchmarking**: Vehicle vs fleet averages
- **Anomaly detection**: IQR-based outliers on consumption, distance, speed
- **Trend forecasting**: Linear regression on KM accumulation
- **Correlation matrix**: KM vs consumption, speed vs efficiency
- **Whisker plots**: Distribution of key metrics per project

### Tab 8 — Explorador de Dados
Raw data explorer:
- **Data source selector**: Turnos, Abastecimentos, Laudos, Sessões
- **Filterable table**: Multi-column sort and filter
- **CSV/Excel export**: Download filtered data
- **SQL-like query**: Date range + column selection

### Tab 9 — Cards de Carros
Visual vehicle cards grid (Ford dark theme):
- **Vehicle card** per vehicle with:
  - Name, VIN, photo placeholder
  - **Stat circles**: KM, consumption, sessions (color-coded by threshold)
  - **Progress bars**: KM vs fleet benchmark, consumption vs target
  - **Health badge**: 0-100 score with gradient colors
  - **Pilot avatar**: Initials in colored circle
  - **Project tags**: Colored project badges
- **Search**: By name or VIN
- **Sort**: By name, KM, consumption, health score
- **Expand**: Full details with laudos table

## Data Loading

### Firebase REST Endpoints

| Endpoint | Description | Cache Strategy |
|----------|-------------|----------------|
| `vev_turnos_encerrados.json` | Completed shifts | Session state fallback |
| `vev_turnos_ativos.json` | Currently active shifts | Fresh on page load |
| `vev_turnos.json` | Live shift tracking | Fresh on refresh |
| `vev_sessoes_teste.json` | Test sessions | Cached |
| `vev_laudos.json` | Technical issues | Cached |
| `vev_abastecimentos.json` | Fuel refueling records | Cached |

### Parsers (`app.py:918-1199`)

| Function | Lines | Purpose |
|----------|-------|---------|
| `parse_hora()` | 667 | Parse time strings |
| `parse_turnos_encerrados()` | 918 | Clean shift data |
| `parse_abastecimentos()` | 981 | Normalize fuel records |
| `parse_sessoes_teste()` | 1036 | Parse test sessions |
| `parse_turnos_ativos()` | 1069 | Parse active shifts |
| `parse_turnos_live()` | 1104 | Parse live tracking |
| `parse_laudos()` | 1139 | Parse technical issues |

### Session State Caching

```python
# Keys stored in st.session_state
keys = [
    "last_update",      # Timestamp of last data pull
    "data_loaded",      # Boolean guard
    "data_turnos",      # DataFrame: completed shifts
    "data_abast",       # DataFrame: fuel records
    "data_sessoes",     # DataFrame: test sessions
    "data_laudos",      # DataFrame: laudos
    "data_ativos",      # DataFrame: active shifts
    "data_live",        # DataFrame: live tracking
]
```

On first load, data is fetched from Firebase. On subsequent loads and failures, session state preserves the last valid data.

## Optimization Patterns

### Error Boundaries
Each tab wraps its content in `try/except` to prevent a single failure from crashing the entire dashboard.

### Skeleton Loading
CSS shimmer animation on data containers while Firebase responses are pending:
```css
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
.skeleton { background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
```

### Refresh (User-Controlled)
- **Button**: "🔄 Recarregar" in sidebar with toast feedback
- **Auto-toggle**: "Auto-atualizar a cada 30s" (default: off)
- No auto-reload on page load — preserves expanders, scroll, and tab state

### Color Palette
```python
CORS = {
    "ford_blue":    "#002C5B",
    "accent_blue":  "#1E90FF",
    "neon_blue":    "#00E5FF",
    "dark_bg":      "#0B0F17",
    "card_bg":      "#121824",
    "border_gray":  "#243042",
    "green":        "#10B981",
    "orange":       "#F59E0B",
    "red":          "#EF4444",
    "purple":       "#8B5CF6",
}
```

## Dependencies

```
streamlit==1.31.0
pandas==2.1.4
plotly==5.18.0
gspread==6.0.2
google-auth==2.26.1
folium==0.16.0
streamlit-folium==0.19.0
openpyxl==3.1.2
numpy==1.26.3
scipy==1.12.0
streamlit-autorefresh==1.0.1
```
