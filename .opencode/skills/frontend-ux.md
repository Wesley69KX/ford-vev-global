# Frontend & UX Design for Data Dashboards

## Purpose
Design intuitive, high-density data dashboards with focus on scannability, progressive disclosure, and mobile-first responsive layouts for operational monitoring systems.

## Core UX Principles

### 1. Progressive Disclosure
- Show key metrics first (top-level cards), details on expand/click
- Use `st.expander()` for secondary details within cards
- Color-coded health indicators (green/yellow/red) for instant scan

### 2. Visual Density & Scannability
```css
/* Stat circles with color thresholds */
.stat-circle { width: 60px; height: 60px; border-radius: 50%; 
  display: flex; flex-direction: column; align-items: center; 
  justify-content: center; border: 2px solid; }
.stat-circle.good { border-color: #10B981; color: #10B981; }
.stat-circle.warn { border-color: #F59E0B; color: #F59E0B; }
.stat-circle.bad  { border-color: #EF4444; color: #EF4444; }
```

### 3. Card Design Pattern
```
┌─────────────────────────────────────────────────┐
│ 🚗 Vehicle Name          VIN: XYZ123  [⚠️ 2]   │
│─────────────────────────────────────────────────│
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 1,240 │ │ 320  │ │ 8.5  │ │  12  │ │  3   │ │
│  │ KM    │ │ Lit  ││ km/l │ │Trips │ │Laus  ││ │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ │
│─────────────────────────────────────────────────│
│ ████████████████░░░░░░░░  KM vs Frota: 124%    │
│ ████████░░░░░░░░░░░░░░░░  Consumo: 85% bench   │
│─────────────────────────────────────────────────│
│ 👨‍✈️ João █ Maria █ Pedro █ +2                  │
│ 📊 [Sparkline chart]                            │
│ ▼ Ver detalhes (expander)                       │
└─────────────────────────────────────────────────┘
```

### 4. Responsive Layout
- Use CSS Grid with `auto-fill` for card grids
- Min card width: 320px, max: 1fr
- Touch-friendly: minimum 44px tap targets

### 5. Interactive Elements
- Hover effects on cards (border highlight, slight lift)
- Clickable pilot tags (filters the dashboard by pilot)
- Sorting controls at top of list
- Search/filter within the tab (real-time text filter)

### 6. Data Visualization Tips
- Progress bars with comparative benchmarks
- Sparklines for trend context
- Color coding: green > benchmark, yellow = near, red = below threshold
- Icons: use unicode/emoji instead of icon libraries (faster)
