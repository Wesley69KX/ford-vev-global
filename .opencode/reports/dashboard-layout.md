# Power BI Dashboard Layout Diagram — Ford VEV Proving Ground

```
================================================================================
                         FORD VEV CONTROL ROOM
              Power BI Dashboard — Layout Specification
================================================================================

                              ┌──────────────────────────────────────┐
  PAGE 1                      │        RESUMO GERENCIAL              │
  EXECUTIVE                    │   (Executive Overview)               │
  OVERVIEW                     └──────────────────────────────────────┘

  ┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
  │ SCORE CARD  │  CARD       │  CARD       │  CARD       │  CARD       │
  │ Operational │ Consumo     │ KM Total    │ Turnos      │ Pilotos     │
  │ Score /100  │ Medio km/l  │             │ Concluidos  │ Ativos      │
  │ [color=     │ [icon: fuel]│ [icon: road]│ [icon: flag]│ [icon:      │
  │  dynamic]   │             │             │             │  person]    │
  └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

  ┌─────────────────────────────────────┬─────────────────────────────────┐
  │                                     │                                 │
  │    LINE CHART                       │    BAR CHART                    │
  │    KM Diario + Media Movel 3d       │    KM por Projeto               │
  │                                     │                                 │
  │    [area chart with trend]          │    [horizontal bar]             │
  │                                     │                                 │
  └─────────────────────────────────────┴─────────────────────────────────┘

  ┌─────────────────────────────────────┬─────────────────────────────────┐
  │                                     │                                 │
  │    HEATMAP MATRIX                   │    TRAFFIC LIGHTS + CARDS       │
  │    KM por Piloto x Veiculo         │    • Fuel Efficiency: 🟢🟡🔴  │
  │                                     │    • Critical Issues: 🟢🟡🔴  │
  │    [colored pivot table]            │    • Pilots Active:  🟢🟡🔴  │
  │                                     │    • Score Description          │
  └─────────────────────────────────────┴─────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════

                              ┌──────────────────────────────────────┐
  PAGE 2                      │        EFICIENCIA ENERGETICA         │
  FUEL                         │   (Fuel & Refuel Management)         │
  EFFICIENCY                   └──────────────────────────────────────┘

  ┌──────────────────────────────┬──────────────────────────────────────┐
  │                              │                                      │
  │    GAUGE CHART               │    HORIZONTAL BAR CHART              │
  │    Consumo Medio Global      │    km/l por Veiculo                  │
  │    Scale 0-15 km/l           │    [color by performance]            │
  │    [speedometer]             │                                      │
  │                              │                                      │
  └──────────────────────────────┴──────────────────────────────────────┘

  ┌──────────────────────┬──────────────────────┬──────────────────────┐
  │   BAR CHART          │   PIE / DONUT        │   LINE CHART         │
  │   Volume por Posto   │   Tipo Combustivel   │   Evolucao Consumo   │
  │   [litros]           │   [E100, Gasolina,   │   [daily avg km/l]   │
  │                      │    Diesel, GNV]       │                      │
  └──────────────────────┴──────────────────────┴──────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  DETAIL TABLE                                                        │
  │  Registros de Abastecimento: Data | Operador | Veiculo | Posto |    │
  │    Tipo | Litros | KM Atual                                          │
  └─────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════

                              ┌──────────────────────────────────────┐
  PAGE 3                      │     LAUDOS E SAUDE DO VEICULO        │
  DIAGNOSTICS                  │   (Vehicle Health & Diagnostics)      │
  & HEALTH                     └──────────────────────────────────────┘

  ┌──────────────────────┬──────────────────────┬──────────────────────┐
  │   DONUT CHART        │   HORIZONTAL BAR     │   HORIZONTAL BAR     │
  │   Severidade         │   Categoria          │   Laudos por         │
  │   (Critico /         │   (Motor, Freio,     │   Veiculo            │
  │    Moderado / Leve)  │    Suspensao...)      │                      │
  └──────────────────────┴──────────────────────┴──────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  TOP N TABLE (30 rows)                                              │
  │  • Ticket-style rows with left border color (🔴🟡🟢)               │
  │  • Colunas: Data | Veiculo | VIN | Piloto | Severidade |           │
  │    Categoria | Descricao                                            │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  SLICER: Severidade [Todos | Critico | Moderado | Leve]            │
  └─────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════

                              ┌──────────────────────────────────────┐
  PAGE 4                      │     RANKING DE PILOTOS               │
  PILOT                        │   (Pilot Leaderboard)                │
  RANKING                      └──────────────────────────────────────┘

  ┌─────────────────────────────────────┬─────────────────────────────────┐
  │                                     │                                 │
  │    TABLE + RANK                     │    RADAR CHART (Top 5)          │
  │    # | Medal | Pilot | Score        │    Axes: Score, KM, Consumo,   │
  │    | Turnos | KM | Consumo |        │          Turnos (normalized)    │
  │      Ocorrencias                    │    [5 traces, one per pilot]   │
  │                                     │                                 │
  └─────────────────────────────────────┴─────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  HORIZONTAL BAR CHART                                               │
  │  Consumo Medio por Piloto [with benchmark line at 7.0 km/l]        │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  DETAIL TABLE: Metricas Comparativas (Pilot | Score | KM | Consumo │
  │    | Turnos | Ocorrencias)                                          │
  └─────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════

                              ┌──────────────────────────────────────┐
  PAGE 5                      │     ANALYTICS AVANCADO               │
  ADVANCED                     │   (Trends, Outliers, Correlations)    │
  ANALYTICS                    └──────────────────────────────────────┘

  ┌─────────────────────────────────────┬─────────────────────────────────┐
  │                                     │                                 │
  │    SCATTER CHART                    │    LINE + TREND CHART           │
  │    KM vs Ocorrencias               │    Consumo com Linear Trend     │
  │    (x: TripKM, y: TotalOcorrencias)│    (with R² annotation)         │
  │    Colored by Operador              │                                 │
  │    + trend line                     │                                 │
  └─────────────────────────────────────┴─────────────────────────────────┘

  ┌─────────────────────────────────────┬─────────────────────────────────┐
  │                                     │                                 │
  │    HISTOGRAM                        │    HORIZONTAL BAR               │
  │    Distribuicao Duracao Turnos      │    Eficiencia por Piloto       │
  │    (with mean line annotation)      │    (with 7 km/l benchmark)     │
  │                                     │                                 │
  └─────────────────────────────────────┴─────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  OUTLIER DETECTION SECTION                                         │
  │  [Stat card: Q1 | Q3 | IQR | Lower | Upper]                        │
  │  [List of anomalous consumption events with inline formatting]      │
  └─────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════

                              ┌──────────────────────────────────────┐
  PAGE 6                      │     MONITORAMENTO AO VIVO            │
  LIVE                         │   (Real-time Track Monitoring)       │
  MONITORING                   └──────────────────────────────────────┘

  ┌─────────────┬───────────────────────────────────────────────────────┐
  │ CARD        │  TABLE                                                 │
  │ Pilotos     │  Operador | Veiculo | VIN Global | Etapa R389 |       │
  │ na Pista    │  Qtd Checkins | Ultima Atualizacao                    │
  │ : N         │                                                       │
  └─────────────┴───────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  MAP VISUAL (if GPS data imported)                                  │
  │  Last known position of active operators (lat/lng from rastroGps)  │
  └─────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════

                              ┌──────────────────────────────────────┐
  PAGE 7                      │     PROTOCOLOS DE TESTE              │
  TEST                         │   (Test Sessions & R389 Cycles)      │
  PROTOCOLS                    └──────────────────────────────────────┘

  ┌─────────────────────────────────────┬─────────────────────────────────┐
  │                                     │                                 │
  │    BAR CHART                        │    BAR CHART                    │
  │    KM por Projeto                   │    Ciclos R389 por Projeto     │
  │                                     │                                 │
  └─────────────────────────────────────┴─────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  DETAIL TABLE                                                       │
  │  Data | Projeto | Tipo Teste | Veiculo | VIN | KM | Ciclos |       │
  │    Status | Problemas                                               │
  └─────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════

                              ┌──────────────────────────────────────┐
  PAGE 8                      │     EXPLORADOR DE DADOS              │
  DATA                         │   (Data Explorer & Export)           │
  EXPLORER                     └──────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  SLICER: Select Dataset [Turnos | Sessoes | Abastecimentos |       │
  │                          Laudos]                                    │
  └─────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────┐
  │  TABLE: All records with search bar                                 │
  └─────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────┬──────────────────────────────────────────────┐
  │  BUTTON: Export CSV  │  BUTTON: Export Excel (.xlsx)                │
  └──────────────────────┴──────────────────────────────────────────────┘

================================================================================
                            FILTER PANEL (SIDEBAR)
================================================================================

  ┌─────────────────────────────────────────────────────────────────────┐
  │  FILTERS:                                                          │
  │  • Projeto: [Dropdown — Todos | Project A | Project B | ...]      │
  │  • Operador: [Dropdown — Todos | Pilot 1 | Pilot 2 | ...]         │
  │  • Veiculo: [Dropdown — Todos | Vehicle A | Vehicle B | ...]      │
  │  • Periodo: [Date Range Picker — start to end]                    │
  │                                                                     │
  │  ACTIONS:                                                           │
  │  • [Refresh Data] button                                           │
  │  • [Export XLS] button                                             │
  │  • Last update timestamp                                           │
  └─────────────────────────────────────────────────────────────────────┘

================================================================================
                         POWER BI PAGE SIZING
================================================================================

  Canvas: 16:9 widescreen (1280 x 720 px default)
  Theme: Dark industrial (Ford-branded custom theme .json)
  Font: 'Outfit' for headers, 'Share Tech Mono' for numbers
  Corner radius: 8px for cards, 12px for score card
  Border: 1px solid #243042
