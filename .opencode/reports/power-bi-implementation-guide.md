# Power BI Implementation Guide — Ford VEV Proving Ground

## 1. Data Model (Star Schema Design)

### Firebase REST API Endpoints

| Endpoint | Firebase Path | Description |
|---|---|---|
| Closed Shifts | `vev_turnos_encerrados.json` | Completed test shifts with fuel & diagnostics |
| Active Shifts | `vev_turnos_ativos.json` | Pilots currently working on track |
| Test Sessions | `vev_sessoes_teste.json` | Protocol test sessions (R389 cycles, braking laps) |
| Live Tracking | `vev_turnos.json` | Real-time telemetry (GPS, rodagem events) |

---

### Fact Tables

#### Fact_Turnos (Central Fact — Closed Shifts)
Source: `vev_turnos_encerrados.json`

| Column | Firebase Field | Data Type | Description |
|---|---|---|---|
| TurnoID | `$key` | string | Unique shift key |
| Data | `turnoData` | date | Shift date (ISO: `2026-06-07`) |
| HoraInicio | `horaInicio` | string | `DD/MM/AAAA, HH:mm:ss` |
| HoraFim | `horaFim` | string | `HH:mm` format |
| DuracaoMin | `tempo` (calc fallback) | int | Duration in minutes |
| Operador | `operador` | string | Pilot name |
| UID | `uid` | string | Pilot Firebase UID |
| Cargo | `cargo` | string | Role/title |
| Veiculo | `veiculo` | string | Vehicle name |
| VIN | `vin` | string | Vehicle VIN |
| TipoTeste | `tipoTeste` (or `tipoteste`) | string | Test type (duplicate key — prefer `tipoTeste`) |
| Projeto | `projeto` | string | Project name |
| CC | `cc` | string | Cost center |
| EJA | `eja` | string | EJA code |
| KMInicial | `kmInicial` | float | Start odometer |
| KMFinal | `kmFinal` | float | End odometer |
| TripKM | `trip` or `tripKm` | float | Trip distance |
| Litros | `litros` | float | Total fuel liters (may also sum from abastecimentos) |
| ConsumoMedio | `consumo` or `consumoMedio` | float | Fuel efficiency (km/l) |
| Posto | `posto` | string | Fuel station |
| TipoCombustivel | `tipoCombustivel` | string | Fuel type (E100, Gasolina, etc.) |
| ValorPago | `valorPago` | float | Amount paid (R$) |
| Saldo | `saldo` | float | Balance (R$) |
| Autonomia | `autonomia` | float | Autonomy (km) |
| Temperatura | `temperatura` | string | Track temperature |
| CiclosR389 | `ciclosR389` | float | R389 cycle count |
| LapsFrenagem | `lapsFrenagem` | float | Braking lap count |
| LapsDesaceleracao | `lapsDesaceleracao` | float | Deceleration lap count |
| KMRodagem | `kmRodagem` | float | Running-in km |
| TotalOcorrencias | `issues` or `totalOcorrencias` | float | Total mechanical issues |
| Criticas | `ocorrenciasCritico` | float | Critical issues |
| Moderadas | `ocorrenciasModerat` | float | Moderate issues |
| Leves | `ocorrenciasLeve` | float | Light issues |
| QtdAbastecimentos | `abastecimentos` count | int | Number of refuels |
| TotalLitrosAbast | sum(abastecimentos.litros) | float | Total liters from abastecimentos array |
| Problemas | `problemas` | string | Issues description |
| StatusOperacional | `statusOperacional` | string | Status (`concluido`) |
| Timestamp | `criadoEm` or `timestamp` | datetime | Unix epoch ms |

#### Fact_Abastecimentos (Fuel Events — from turnos_encerrados)
Source: `vev_turnos_encerrados.json` → `abastecimentos` array

| Column | Firebase Field | Data Type |
|---|---|---|
| TurnoID | parent `$key` | string |
| Data | parent `turnoData` | date |
| Operador | parent `operador` | string |
| Veiculo | parent `veiculo` | string |
| VIN | parent `vin` | string |
| Projeto | parent `projeto` | string |
| HoraAbast | `hora` | string |
| Posto | `posto` | string |
| TipoCombustivel | `tipoCombustivel` | string |
| Litros | `litros` | float |
| KMAtual | `kmAtual` | float |
| KMFinalTurno | parent `kmFinal` | float |
| DiferencaKM | calc | float |

#### Fact_Laudos (Diagnostics — from turnos_encerrados)
Source: `vev_turnos_encerrados.json` → `laudos` array

| Column | Firebase Field | Data Type |
|---|---|---|
| TurnoID | parent `$key` | string |
| Data | parent `turnoData` or `data` | date |
| Operador | parent `operador` | string |
| Veiculo | parent `veiculo` | string |
| VIN | parent `vin` | string |
| Projeto | parent `projeto` | string |
| HoraLaudo | `hora` | string |
| Descricao | `descricao` | string |
| Severidade | `severidade` | string (`Critico`, `Moderado`, `Leve`) |
| Categoria | `categoria` | string (`Geral`, `Motor`, `Suspensao`, etc.) |

#### Fact_SessoesTeste (Protocol Test Sessions)
Source: `vev_sessoes_teste.json`

| Column | Firebase Field | Data Type |
|---|---|---|
| SessaoID | `$key` | string |
| Data | `data` | date |
| Operador | `operador` | string |
| UID | `uid` | string |
| Projeto | `projeto` | string |
| TipoTeste | `tipoTeste` | string |
| Veiculo | `veiculo` | string |
| VIN | `vin` | string |
| CC | `cc` | string |
| EJA | `eja` | string |
| CiclosR389 | `ciclos` | float |
| LapsFrenagem | `laps` | float |
| Frenagens | `frenagens` | float |
| Execucoes | `execucoes` | float |
| KMRodado | `kmRodado` | float |
| TempoExecucao | `tempoExecucao` | string |
| Observacoes | `observacoes` | string |
| Problemas | `problemas` | string |
| Status | `status` | string |
| TurnoID | `turnoId` | string |
| Timestamp | `criadoEm` | datetime |

#### Fact_MonitoramentoLive (Real-time Track Monitoring)
Source: `vev_turnos.json` (nested: date → operator → data)

| Column | Firebase Path | Data Type |
|---|---|---|
| Data | `$dateKey` | date |
| Operador | `$operatorKey` | string |
| VINGlobal | `vinGlobal` | string |
| Veiculo | `veiculo` | string |
| DistanciaRodagemKm | `rodagemDistanciaMts` / 1000 | float |
| UltimaAtualizacao | `ultimaAtualizacao` | string |
| EtapaR389Atual | `etapaAtualIndex` | int |
| QtdR389Checkins | count(`checkins`) | int |
| EtapaDesaceleracaoAtual | `etapaDesaceleracaoIndex` | int |
| QtdDesaceleracaoCheckins | count(`checkinsDesaceleracao`) | int |
| QtdCiclosFrenagem | count(`ciclosFrenagem`) | int |
| QtdEventosLogRodagem | count(`logRodagem`) | int |

### Dimension Tables

#### Dim_Operador (Pilot)
Derived from `Fact_Turnos[Operador]`, `Fact_Turnos[UID]`, `Fact_Turnos[Cargo]`

#### Dim_Veiculo (Vehicle)
Derived from `Fact_Turnos[Veiculo]`, `Fact_Turnos[VIN]`, `Fact_Turnos[CC]`, `Fact_Turnos[EJA]`

#### Dim_Projeto (Project)
Derived from `Fact_Turnos[Projeto]`

#### Dim_Data (Date)
Power BI auto-generated date table with: Year, Month, Week, DayOfWeek, IsWeekend

#### Dim_TipoTeste (Test Type)
Derived from `Fact_Turnos[TipoTeste]`

#### Dim_Severidade (Severity)
Lookup: `Critico`, `Moderado`, `Leve`

### Star Schema Diagram (Text)

```
Dim_Data ◄──────── Fact_Turnos ────────► Dim_Projeto
                     │    │                      
                     │    └──────────────────► Dim_Veiculo
                     │                         
                     ├── Fact_Abastecimentos ──► Dim_Operador
                     │                         
                     ├── Fact_Laudos ──────────► Dim_Severidade
                     │                         
                     └── Fact_SessoesTeste ────► Dim_TipoTeste

Fact_MonitoramentoLive ──► Dim_Operador
                        ──► Dim_Veiculo
                        ──► Dim_Data
```

---

## 2. DAX Measures

### Operational Score

```dax
-- ===================================================================
-- CORE MEASURES
-- ===================================================================

Score Operacional =
VAR TotalTurnos = COUNTROWS(Fact_Turnos)
VAR MediaConsumo =
    AVERAGEX(
        FILTER(Fact_Turnos, Fact_Turnos[ConsumoMedio] > 0),
        Fact_Turnos[ConsumoMedio]
    )
VAR Benchmark = 8.0
VAR RatioConsumo = MIN(MediaConsumo / Benchmark, 1.0)
VAR PenalidadeConsumo = (1.0 - RatioConsumo) * 40

VAR NCriticos =
    COUNTROWS(
        FILTER(Fact_Laudos, CONTAINSSTRING(LOWER(Fact_Laudos[Severidade]), "crit"))
    )
VAR TaxaCriticos = DIVIDE(NCriticos, MAX(TotalTurnos, 1), 0)
VAR PenalidadeCriticos = MIN(TaxaCriticos * 15, 30)

VAR TurnosCurto =
    COUNTROWS(
        FILTER(Fact_Turnos, Fact_Turnos[DuracaoMin] > 0 && Fact_Turnos[DuracaoMin] < 60)
    )
VAR PctCurto = DIVIDE(TurnosCurto, MAX(TotalTurnos, 1), 0)
VAR PenalidadeCurto = PctCurto * 30

VAR Score = 100.0 - PenalidadeConsumo - PenalidadeCriticos - PenalidadeCurto
RETURN ROUND(MAX(MIN(Score, 100), 0), 1)
```

### Fuel Efficiency

```dax
-- ===================================================================
-- FUEL / EFFICIENCY MEASURES
-- ===================================================================

KM Total = SUM(Fact_Turnos[TripKM])

Litros Total = SUM(Fact_Turnos[Litros])

Consumo Medio Global =
DIVIDE([KM Total], [Litros Total], 0)

Consumo Medio por Veiculo =
AVERAGEX(
    FILTER(Fact_Turnos, Fact_Turnos[ConsumoMedio] > 0),
    Fact_Turnos[ConsumoMedio]
)

Eficiencia Benchmark = 8.0

Delta vs Benchmark = [Consumo Medio Global] - [Eficiencia Benchmark]

Custo Total Combustivel (R$) = SUM(Fact_Turnos[ValorPago])

Consumo por Posto =
SUMX(
    FILTER(Fact_Abastecimentos, Fact_Abastecimentos[Posto] <> ""),
    Fact_Abastecimentos[Litros]
)

Media Abastecimentos por Turno =
AVERAGEX(Fact_Turnos, Fact_Turnos[QtdAbastecimentos])

KM por Litro por Projeto =
AVERAGEX(
    FILTER(Fact_Turnos, Fact_Turnos[ConsumoMedio] > 0),
    Fact_Turnos[ConsumoMedio]
)
```

### Anomaly Detection

```dax
-- ===================================================================
-- ANOMALY / OUTLIER DETECTION
-- ===================================================================

Q1 Consumo =
PERCENTILE.INC(
    FILTER(Fact_Turnos, Fact_Turnos[ConsumoMedio] > 0),
    Fact_Turnos[ConsumoMedio],
    0.25
)

Q3 Consumo =
PERCENTILE.INC(
    FILTER(Fact_Turnos, Fact_Turnos[ConsumoMedio] > 0),
    Fact_Turnos[ConsumoMedio],
    0.75
)

IQR Consumo = [Q3 Consumo] - [Q1 Consumo]

Limite Inferior IQR = [Q1 Consumo] - 1.5 * [IQR Consumo]

Limite Superior IQR = [Q3 Consumo] + 1.5 * [IQR Consumo]

Qtd Outliers Consumo =
COUNTROWS(
    FILTER(
        Fact_Turnos,
        Fact_Turnos[ConsumoMedio] > 0 &&
        (Fact_Turnos[ConsumoMedio] < [Limite Inferior IQR] ||
         Fact_Turnos[ConsumoMedio] > [Limite Superior IQR])
    )
)

Taxa Criticas por Turno =
VAR NCrit = COUNTROWS(
    FILTER(Fact_Laudos, CONTAINSSTRING(LOWER(Fact_Laudos[Severidade]), "crit"))
)
VAR NTurnos = COUNTROWS(Fact_Turnos)
RETURN DIVIDE(NCrit, MAX(NTurnos, 1), 0)

Alerta Critico =
IF([Taxa Criticas por Turno] > 0.3, "⚠ Intervencao necessaria",
    IF([Taxa Criticas por Turno] > 0.1, "▲ Atencao", "✅ Normal"))
```

### Pilot Ranking

```dax
-- ===================================================================
-- PILOT PERFORMANCE
-- ===================================================================

Score Piloto =
VAR ConsumoMedioPiloto =
    AVERAGEX(
        FILTER(Fact_Turnos, Fact_Turnos[ConsumoMedio] > 0),
        Fact_Turnos[ConsumoMedio]
    )
VAR Ratio = MIN(DIVIDE(ConsumoMedioPiloto, 8.0, 1), 1.0)
VAR PenalidadeConsumo = (1.0 - Ratio) * 40

VAR NLaudosPiloto = COUNTROWS(Fact_Laudos)
VAR NTurnosPiloto = MAX(COUNTROWS(Fact_Turnos), 1)
VAR PenalidadeOcorrencias = MIN(DIVIDE(NLaudosPiloto, NTurnosPiloto, 0) * 30, 30)

VAR Score = 100.0 - PenalidadeConsumo - PenalidadeOcorrencias
RETURN ROUND(MAX(MIN(Score, 100), 0), 1)

Ranking Piloto = RANKX(ALL(Fact_Turnos[Operador]), [Score Piloto], , DESC)

Medalha Piloto =
VAR Rank = [Ranking Piloto]
RETURN SWITCH(TRUE(),
    Rank = 1, "🥇 Ouro",
    Rank = 2, "🥇 Prata",
    Rank = 3, "🥇 Bronze",
    "⭐ Top " & Rank
)

KM por Piloto = SUM(Fact_Turnos[TripKM])

Turnos por Piloto = COUNTROWS(Fact_Turnos)

Ocorrencias por Piloto = COUNTROWS(Fact_Laudos)

Consumo Medio Piloto =
AVERAGEX(
    FILTER(Fact_Turnos, Fact_Turnos[ConsumoMedio] > 0),
    Fact_Turnos[ConsumoMedio]
)
```

### Time Intelligence

```dax
-- ===================================================================
-- TIME INTELLIGENCE
-- ===================================================================

Turnos MTD =
TOTALMTD(COUNTROWS(Fact_Turnos), Dim_Data[Date])

KM MTD =
TOTALMTD([KM Total], Dim_Data[Date])

Consumo Medio Movel 3d =
AVERAGEX(
    DATESINPERIOD(Dim_Data[Date], LASTDATE(Dim_Data[Date]), -3, DAY),
    [Consumo Medio Global]
)

Turnos vs Periodo Anterior =
COUNTROWS(Fact_Turnos) -
CALCULATE(COUNTROWS(Fact_Turnos), SAMEPERIODLASTYEAR(Dim_Data[Date]))

Score Operacional Media =
AVERAGEX(VALUES(Dim_Data[Date]), [Score Operacional])
```

---

## 3. Suggested Power BI Visuals & Layout

### Page 1: Executive Dashboard (Resumo Gerencial)

| Visual | Data | Position |
|---|---|---|
| Card: Score Operacional | `[Score Operacional]` + conditional color | Top-left |
| Card: Consumo Medio | `[Consumo Medio Global]` km/l | Top-center |
| Card: KM Total | `[KM Total]` | Top-right |
| Card: Turnos Concluidos | `COUNTROWS(Fact_Turnos)` | Top-right-2 |
| Card: Pilotos Ativos | `COUNTROWS(Fact_MonitoramentoLive)` | Top-right-3 |
| Gauge: Eficiencia vs Meta | `[Consumo Medio Global]` vs 8.0 km/l | Mid-left |
| Line Chart: KM Diario + MM3 | `[KM Total]` by Dim_Data[Date] + `[Consumo Medio Movel 3d]` | Mid-center |
| Bar Chart: KM por Projeto | `[KM Total]` by Dim_Projeto[Projeto] | Mid-right |
| Matrix Heatmap: Piloto x Veiculo KM | `[KM Total]` rows=Operador, cols=Veiculo | Bottom |
| Traffic Light Cards | `[Alerta Critico]` colored indicators | Bottom-right |

### Page 2: Fuel Efficiency (Combustivel)

| Visual | Data |
|---|---|
| Gauge: Consumo Medio | `[Consumo Medio Global]` scale 0-15 km/l |
| Bar Chart: km/l por Veiculo | `[Consumo Medio por Veiculo]` horizontal |
| Bar Chart: Volume por Posto | `[Consumo por Posto]` |
| Pie/Donut: Tipo Combustivel | Distribution by `TipoCombustivel` |
| Line Chart: Consumo ao Longo do Tempo | `[Consumo Medio Global]` by date |
| Scatter: Litros vs KM | Fact_Turnos[Litros] vs Fact_Turnos[TripKM] by Operador |

### Page 3: Diagnostics & Health (Laudos)

| Visual | Data |
|---|---|
| Donut: Severidade | `COUNTROWS(Fact_Laudos)` by Severidade |
| Bar Chart: Categoria | `COUNTROWS(Fact_Laudos)` by Categoria |
| Bar Chart: Laudos por Veiculo | `COUNTROWS(Fact_Laudos)` by Veiculo |
| Table: Laudos Recentes | Top 30 sorted by date desc |
| Slicer: Severidade | Critico / Moderado / Leve |

### Page 4: Pilot Ranking

| Visual | Data |
|---|---|
| Table: Ranked Pilots | [Ranking Piloto], Operador, [Score Piloto], [KM por Piloto], [Consumo Medio Piloto], [Turnos por Piloto], [Ocorrencias por Piloto] |
| Radar Chart: Top 5 | Normalized: Score, KM, Consumo, Turnos |
| Bar Chart: Consumo por Piloto | `[Consumo Medio Piloto]` horizontal with benchmark line |

### Page 5: Advanced Analytics

| Visual | Data |
|---|---|
| Scatter: KM vs Ocorrencias | x=TripKM, y=TotalOcorrencias colored by Operador |
| Line + Trend: Consumo Trend | Confidence band + regression line |
| Histogram: Duracao Turnos | Distribution with mean line |
| Key Influencers | Impact of Veiculo/Projeto/Operador on Consumo |

### Page 6: Live Monitoring (Ao Vivo)

| Visual | Data |
|---|---|
| Card: Pilotos na Pista | `COUNTROWS(Fact_MonitoramentoLive)` |
| Table: Live Operators | Fact_MonitoramentoLive[Operador, Veiculo, VINGlobal, EtapaR389Atual, QtdR389Checkins, UltimaAtualizacao] |
| Map: GPS Rastro | Fact_MonitoramentoLive → rastroGps lat/lng (if imported) |

---

## 4. Step-by-Step Firebase REST API Connection Guide

### Method A: Power Query (M Language) — Direct REST

1. **Power BI Desktop** → **Get Data** → **Blank Query**

2. **Advanced Editor** — paste the following M code for each endpoint:

```
// Fact_Turnos — Closed Shifts
let
    Source = Json.Document(
        Web.Contents(
            "https://ford-vev-default-rtdb.firebaseio.com",
            [RelativePath = "/vev_turnos_encerrados.json"]
        )
    ),
    ToTable = Record.ToTable(Source),
    Renamed = Table.RenameColumns(ToTable, {{"Name", "TurnoID"}, {"Value", "Raw"}}),
    Expand = Table.ExpandRecordColumn(Renamed, "Raw", {
        "turnoData", "horaInicio", "horaFim", "tempo", "operador", "uid", "cargo",
        "veiculo", "vin", "tipoTeste", "projeto", "cc", "eja",
        "kmInicial", "kmFinal", "trip", "litros", "consumo", "posto",
        "tipoCombustivel", "valorPago", "saldo", "autonomia", "temperatura",
        "ciclosR389", "lapsFrenagem", "lapsDesaceleracao", "kmRodagem",
        "issues", "ocorrenciasCritico", "ocorrenciasModerat", "ocorrenciasLeve",
        "abastecimentos", "laudos", "problemas", "statusOperacional", "criadoEm"
    })
in
    Expand
```

3. **Transform each column** to proper types:
   - `turnoData` → Date type (ISO format `2026-06-07`)
   - `horaInicio` → Text (parse `DD/MM/AAAA, HH:mm:ss`)
   - `kmInicial`, `kmFinal`, `trip`, `litros`, `consumo` → Number
   - `criadoEm` → DateTime (Unix ms: `#datetime(1970,1,1,0,0,0) + #duration(0,0,0,[criadoEm]/1000)`)

4. **Expand nested arrays**:
   - `abastecimentos` → `Table.ExpandListColumn` for Fact_Abastecimentos
   - `laudos` → `Table.ExpandListColumn` for Fact_Laudos

### Method B: Python Script in Power BI

```
// Power Query — Python integration
let
    Source = Python.Execute(
        "import requests, json, pandas as pd#(lf)" &
        "url = 'https://ford-vev-default-rtdb.firebaseio.com/vev_turnos_encerrados.json'#(lf)" &
        "resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15)#(lf)" &
        "data = resp.json()#(lf)" &
        "rows = []#(lf)" &
        "for k, v in data.items():#(lf)" &
        "    if v:#(lf)" &
        "        row = {'TurnoID': k, **{fld: v.get(fld, '') for fld in ['turnoData','operador','veiculo','vin','projeto','tipoTeste','kmInicial','kmFinal','trip','litros','consumo','posto','tipoCombustivel','valorPago']}}#(lf)" &
        "        rows.append(row)#(lf)" &
        "df = pd.DataFrame(rows)#(lf)" &
        "df['Data'] = pd.to_datetime(df['turnoData'], errors='coerce')#(lf)"
    )
in
    Source
```

### Required API Parameters

- **Base URL**: `https://ford-vev-default-rtdb.firebaseio.com`
- **No authentication** (public read — confirmed by existing Streamlit app)
- **Headers**: `User-Agent: Mozilla/5.0`
- **Timeout**: 15 seconds per request
- **Rate limit**: Firebase RTDB allows ~10 concurrent connections; staggering recommended

---

## 5. Refresh Strategy

### Incremental Refresh Setup

| Table | Filter Field | Policy |
|---|---|---|
| Fact_Turnos | `criadoEm` (epoch ms) | Range: Last 90 days + current |
| Fact_Abastecimentos | parent `criadoEm` | Range: Last 90 days + current |
| Fact_Laudos | parent `criadoEm` | Range: Last 90 days + current |
| Fact_SessoesTeste | `criadoEm` (epoch ms) | Range: Last 90 days + current |
| Fact_MonitoramentoLive | `Data` (date) | Full refresh (small dataset) |

### Implementation Steps for Incremental Refresh

1. **Power BI Desktop** → Right-click table → **Incremental refresh**
2. **Define refresh policy**:
   - Archive data starting: `90` days before today
   - Incrementally refresh data starting: `1` day before today
   - Only refresh complete periods: `Yes`
3. **Enable** "Get the latest data in real-time" for the live facts

### Scheduled Refresh (Power BI Service)

| Setting | Value |
|---|---|
| Gateway | On-premises data gateway (if using Python/M) |
| Frequency | Every 30 minutes |
| Time zone | Brasilia (UTC-3) |
| Failure notification | Email to operacoes@ford-vev.com |

### M-parameterized Refresh Query

```
// Incremental refresh enabled via RangeStart/RangeEnd
let
    RangeStart = #datetime(2026, 3, 9, 0, 0, 0),
    RangeEnd = #datetime(2026, 6, 8, 23, 59, 59),

    Source = Json.Document(
        Web.Contents("https://ford-vev-default-rtdb.firebaseio.com",
            [RelativePath = "/vev_turnos_encerrados.json"]
        )
    ),
    ToTable = Record.ToTable(Source),
    Renamed = Table.RenameColumns(ToTable, {{"Name", "TurnoID"}, {"Value", "Raw"}}),
    Expand = Table.ExpandRecordColumn(...),
    // Filter by epoch ms range
    #"Filtered by Timestamp" = Table.SelectRows(Expand, each
        [criadoEm] >= Duration.TotalSeconds(RangeStart - #datetime(1970,1,1,0,0,0)) * 1000
        and [criadoEm] <= Duration.TotalSeconds(RangeEnd - #datetime(1970,1,1,0,0,0)) * 1000
    )
in
    #"Filtered by Timestamp"
```

### Monitoring Refresh Health

Create a DAX measure to track data freshness:

```dax
Ultima Atualizacao =
FORMAT(
    MAXX(Fact_Turnos, Fact_Turnos[Timestamp]),
    "DD/MM/YYYY HH:mm:ss"
)

Idade dos Dados (horas) =
ROUND(
    DATEDIFF(
        MAXX(Fact_Turnos, Fact_Turnos[Timestamp]),
        NOW(),
        HOUR
    ),
    1
)
```

---

## 6. Color Palette (Ford Motor Co. Brand)

| Token | Hex | Usage |
|---|---|---|
| Ford Blue | `#002C5B` | Headers, primary accents |
| Accent Blue | `#1E90FF` | Interactive elements, charts |
| Neon Blue | `#00E5FF` | Highlight, glow effects |
| Dark Background | `#0B0F17` | Page background |
| Card Background | `#121824` | Card backgrounds |
| Border Gray | `#243042` | Borders, dividers |
| Green | `#10B981` | Positive, good status |
| Orange | `#F59E0B` | Warning, moderate |
| Red | `#EF4444` | Critical, danger |
| Purple | `#8B5CF6` | Auxiliary metric |
| Text Gray | `#8E9AA8` | Secondary text |
| Light Text | `#F1F5F9` | Primary text |

### Conditional Formatting Rules

- **Score >= 75**: Green `#10B981`
- **Score 50–75**: Orange `#F59E0B`
- **Score < 50**: Red `#EF4444`
- **Consumo >= 7 km/l**: Green
- **Consumo 5–7 km/l**: Orange
- **Consumo < 5 km/l**: Red

---

## 7. Key Business Rules (from Streamlit Code)

1. **Operational Score** = 100 − Penalties:
   - Fuel penalty: up to 40 pts (ratio vs 8 km/l benchmark)
   - Critical issues penalty: up to 30 pts (15 pts per critical/turno)
   - Short shift penalty: up to 30 pts (% of shifts < 60 min)

2. **ConsumoMedio** uses `consumo` field, falling back to `trip / litros`

3. **DuracaoMin** uses `tempo` field, falling back to calculated difference between `horaInicio` and `horaFim` (minutes)

4. **Abastecimentos** can be inline (`litros` on turno) or nested array (`abastecimentos[]`)

5. **tipoTeste** has duplicate keys (`tipoTeste` and `tipoteste`) — prefer `tipoTeste` in all queries
