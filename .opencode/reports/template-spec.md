# Power BI Template (.pbit) Specification — Ford VEV Proving Ground

## File: `ford-vev-control-room.pbit`

### 1. Template Metadata

| Property | Value |
|---|---|
| File Extension | `.pbit` (Power BI Template) |
| Target Power BI | Desktop Dec 2024+ / Service |
| Data Source | Firebase Realtime Database (REST API) |
| Refresh Type | Live + Scheduled (30 min) |
| Theme | Dark Industrial — Ford Motor Co. Brand |
| Locale | pt-BR (Brazilian Portuguese) |
| Currency | BRL (R$) |
| Date Format | `DD/MM/YYYY` |
| Timezone | America/Sao_Paulo (UTC-3) |

### 2. Data Source Configuration

The `.pbit` will prompt for the following parameters on open:

```
Parameter Name: FirebaseBaseURL
Type: Text
Default: https://ford-vev-default-rtdb.firebaseio.com

Parameter Name: FirebaseTimeout
Type: Number
Default: 15

Parameter Name: RefreshLookbackDays
Type: Number
Default: 90
```

### 3. Tables and M Queries

Each table uses a parametrized M query. Below is the full M specification:

#### 3.1 Dim_Data (Auto-generated)

```m
// Built-in Power BI — Auto date/time disabled
// Create manually:
let
    StartDate = #date(2026, 1, 1),
    EndDate = DateTime.Date(DateTime.LocalNow()),
    Dates = List.Dates(StartDate, Duration.Days(EndDate - StartDate) + 1, #duration(1,0,0,0)),
    Table = Table.FromList(Dates, Splitter.SplitByNothing()),
    Renamed = Table.RenameColumns(Table, {{"Column1", "Date"}}),
    ChangedType = Table.TransformColumnTypes(Renamed, {{"Date", type date}}),
    YearCol = Table.AddColumn(ChangedType, "Year", each Date.Year([Date]), Int64.Type),
    MonthCol = Table.AddColumn(YearCol, "Month", each Date.Month([Date]), Int64.Type),
    MonthName = Table.AddColumn(MonthCol, "Month Name", each Date.MonthName([Date]), type text),
    WeekCol = Table.AddColumn(MonthName, "Week", each Date.WeekOfYear([Date]), Int64.Type),
    DayCol = Table.AddColumn(WeekCol, "Day", each Date.Day([Date]), Int64.Type),
    DayOfWeek = Table.AddColumn(DayCol, "Day of Week", each Date.DayOfWeek([Date]), Int64.Type),
    DayName = Table.AddColumn(DayOfWeek, "Day Name", each Date.DayOfWeekName([Date]), type text),
    IsWeekend = Table.AddColumn(DayName, "Is Weekend", each Date.DayOfWeek([Date]) >= 5, type logical)
in
    IsWeekend
```

#### 3.2 Fact_Turnos

```m
let
    BaseURL = FirebaseBaseURL,
    Source = Json.Document(
        Web.Contents(
            BaseURL,
            [RelativePath = "/vev_turnos_encerrados.json",
             Headers = [ #"User-Agent" = "PowerBI/2.0" ],
             Timeout = #duration(0,0,0,FirebaseTimeout)]
        )
    ),
    ToTable = Record.ToTable(Source),
    Renamed = Table.RenameColumns(ToTable, {{"Name", "TurnoID"}, {"Value", "Raw"}}),
    ExpandTurno = Table.ExpandRecordColumn(Renamed, "Raw", {
        "turnoData", "horaInicio", "horaFim", "tempo", "operador", "uid", "cargo",
        "veiculo", "vin", "tipoTeste", "projeto", "cc", "eja",
        "kmInicial", "kmFinal", "trip", "litros", "consumo", "posto",
        "tipoCombustivel", "valorPago", "saldo", "autonomia", "temperatura",
        "ciclosR389", "lapsFrenagem", "lapsDesaceleracao", "kmRodagem",
        "issues", "ocorrenciasCritico", "ocorrenciasModerat", "ocorrenciasLeve",
        "abastecimentos", "laudos", "problemas", "statusOperacional", "criadoEm"
    }, null, true),  // true = ignore missing fields
    ChangeTypes = Table.TransformColumnTypes(ExpandTurno, {
        {"turnoData", type text},
        {"horaInicio", type text},
        {"horaFim", type text},
        {"tempo", type text},
        {"operador", type text},
        {"uid", type text},
        {"cargo", type text},
        {"veiculo", type text},
        {"vin", type text},
        {"tipoTeste", type text},
        {"projeto", type text},
        {"cc", type text},
        {"eja", type text},
        {"kmInicial", type number},
        {"kmFinal", type number},
        {"trip", type number},
        {"litros", type number},
        {"consumo", type number},
        {"posto", type text},
        {"tipoCombustivel", type text},
        {"valorPago", type number},
        {"saldo", type number},
        {"autonomia", type number},
        {"temperatura", type text},
        {"ciclosR389", type number},
        {"lapsFrenagem", type number},
        {"lapsDesaceleracao", type number},
        {"kmRodagem", type number},
        {"issues", type number},
        {"ocorrenciasCritico", type number},
        {"ocorrenciasModerat", type number},
        {"ocorrenciasLeve", type number},
        {"problemas", type text},
        {"statusOperacional", type text},
        {"criadoEm", type number}
    }),
    DateCol = Table.AddColumn(ChangeTypes, "Data", each
        try Date.FromText([turnoData], [Culture="pt-BR"])
        otherwise null, type date),
    DuracaoMin = Table.AddColumn(DateCol, "DuracaoMin", each
        if [tempo] <> null and [tempo] <> "" then
            try Number.From([tempo]) otherwise null
        else null, Int64.Type),
    ConsumoCalc = Table.AddColumn(DuracaoMin, "ConsumoMedio", each
        if [consumo] <> null and [consumo] > 0 then [consumo]
        else if [trip] <> null and [litros] <> null and [litros] > 0
             then [trip] / [litros]
             else null, type number),
    QtdAbastecimentos = Table.AddColumn(ConsumoCalc, "QtdAbastecimentos", each
        if [abastecimentos] <> null then
            try List.Count([abastecimentos]) else 0
        else 0, Int64.Type),
    QtdLaudos = Table.AddColumn(QtdAbastecimentos, "QtdLaudos", each
        if [laudos] <> null then
            try List.Count([laudos]) else 0
        else 0, Int64.Type),
    // Remove nested columns - they'll be expanded in separate queries
    RemoveNested = Table.RemoveColumns(QtdLaudos, {"abastecimentos", "laudos"}),
    EpochToDatetime = Table.AddColumn(RemoveNested, "DataHoraCriacao", each
        if [criadoEm] <> null then
            #datetime(1970,1,1,0,0,0) + #duration(0,0,0,[criadoEm]/1000)
        else null, type datetime),
    FilteredRows = Table.SelectRows(EpochToDatetime, each
        [DataHoraCriacao] >= Date.AddDays(DateTime.LocalNow(), -RefreshLookbackDays)
        or [DataHoraCriacao] = null)
in
    FilteredRows
```

#### 3.3 Fact_Abastecimentos

```m
let
    BaseURL = FirebaseBaseURL,
    Source = Json.Document(Web.Contents(BaseURL, [RelativePath = "/vev_turnos_encerrados.json"])),
    ToTable = Record.ToTable(Source),
    Renamed = Table.RenameColumns(ToTable, {{"Name", "TurnoID"}, {"Value", "Raw"}}),
    // Select only needed fields from parent
    ExpandParent = Table.ExpandRecordColumn(Renamed, "Raw", {
        "turnoData", "operador", "veiculo", "vin", "projeto", "kmFinal",
        "abastecimentos", "criadoEm"
    }),
    ExpandAbast = Table.ExpandListColumn(ExpandParent, "abastecimentos"),
    ExpandAbastRec = Table.ExpandRecordColumn(ExpandAbast, "abastecimentos", {
        "hora", "kmAtual", "litros", "posto", "tipoCombustivel"
    }, {"HoraAbast", "KMAtual", "Litros", "Posto", "TipoCombustivel"}),
    ChangeTypes = Table.TransformColumnTypes(ExpandAbastRec, {
        {"turnoData", type text},
        {"operador", type text},
        {"veiculo", type text},
        {"vin", type text},
        {"projeto", type text},
        {"kmFinal", type number},
        {"HoraAbast", type text},
        {"KMAtual", type number},
        {"Litros", type number},
        {"Posto", type text},
        {"TipoCombustivel", type text},
        {"criadoEm", type number}
    }),
    DataCol = Table.AddColumn(ChangeTypes, "Data", each
        try Date.FromText([turnoData], [Culture="pt-BR"])
        otherwise null, type date),
    DiferencaKM = Table.AddColumn(DataCol, "DiferencaKM", each
        if [kmFinal] <> null and [KMAtual] <> null and [kmFinal] > 0 and [KMAtual] > 0
        then [kmFinal] - [KMAtual] else 0, type number),
    // Filter out where no actual abastecimento record
    FilterNotNull = Table.SelectRows(DiferencaKM, each [Litros] <> null)
in
    FilterNotNull
```

#### 3.4 Fact_Laudos

```m
let
    BaseURL = FirebaseBaseURL,
    Source = Json.Document(Web.Contents(BaseURL, [RelativePath = "/vev_turnos_encerrados.json"])),
    ToTable = Record.ToTable(Source),
    Renamed = Table.RenameColumns(ToTable, {{"Name", "TurnoID"}, {"Value", "Raw"}}),
    ExpandParent = Table.ExpandRecordColumn(Renamed, "Raw", {
        "turnoData", "operador", "veiculo", "vin", "projeto", "laudos", "criadoEm"
    }),
    ExpandLaudos = Table.ExpandListColumn(ExpandParent, "laudos"),
    ExpandLaudosRec = Table.ExpandRecordColumn(ExpandLaudos, "laudos", {
        "hora", "descricao", "severidade", "categoria"
    }, {"HoraLaudo", "Descricao", "Severidade", "Categoria"}),
    ChangeTypes = Table.TransformColumnTypes(ExpandLaudosRec, {
        {"TurnoID", type text},
        {"turnoData", type text},
        {"operador", type text},
        {"veiculo", type text},
        {"vin", type text},
        {"projeto", type text},
        {"HoraLaudo", type text},
        {"Descricao", type text},
        {"Severidade", type text},
        {"Categoria", type text}
    }),
    DataCol = Table.AddColumn(ChangeTypes, "Data", each
        try Date.FromText([turnoData], [Culture="pt-BR"])
        otherwise null, type date),
    FilterNotNull = Table.SelectRows(DataCol, each [Descricao] <> null)
in
    FilterNotNull
```

#### 3.5 Fact_SessoesTeste

```m
let
    BaseURL = FirebaseBaseURL,
    Source = Json.Document(
        Web.Contents(BaseURL, [RelativePath = "/vev_sessoes_teste.json"])
    ),
    ToTable = Record.ToTable(Source),
    Renamed = Table.RenameColumns(ToTable, {{"Name", "SessaoID"}, {"Value", "Raw"}}),
    Expand = Table.ExpandRecordColumn(Renamed, "Raw", {
        "data", "operador", "uid", "projeto", "tipoTeste",
        "veiculo", "vin", "cc", "eja",
        "ciclos", "laps", "frenagens", "execucoes", "kmRodado",
        "tempoExecucao", "observacoes", "problemas", "status", "turnoId", "criadoEm"
    }),
    ChangeTypes = Table.TransformColumnTypes(Expand, {
        {"data", type text},
        {"operador", type text},
        {"uid", type text},
        {"projeto", type text},
        {"tipoTeste", type text},
        {"veiculo", type text},
        {"vin", type text},
        {"cc", type text},
        {"eja", type text},
        {"ciclos", type number},
        {"laps", type number},
        {"frenagens", type number},
        {"execucoes", type number},
        {"kmRodado", type number},
        {"tempoExecucao", type text},
        {"observacoes", type text},
        {"problemas", type text},
        {"status", type text},
        {"turnoId", type text},
        {"criadoEm", type number}
    }),
    DataCol = Table.AddColumn(ChangeTypes, "Data", each
        try Date.FromText([data]) otherwise null, type date),
    EpochCol = Table.AddColumn(DataCol, "DataHoraCriacao", each
        try #datetime(1970,1,1,0,0,0) + #duration(0,0,0,[criadoEm]/1000)
        otherwise null, type datetime)
in
    EpochCol
```

#### 3.6 Fact_MonitoramentoLive

```m
let
    BaseURL = FirebaseBaseURL,
    Source = Json.Document(
        Web.Contents(BaseURL, [RelativePath = "/vev_turnos.json"])
    ),
    // Structure: {date: {operator: {data}}}
    ToDateTable = Record.ToTable(Source),
    RenamedDates = Table.RenameColumns(ToDateTable, {{"Name", "Data"}, {"Value", "Operadores"}}),
    ExpandOps = Table.ExpandRecordColumn(RenamedDates, "Operadores", Record.FieldNames(
        try Record.First(Table.FirstN(RenamedDates, 1)[Operadores]{0}) otherwise {}
    )),
    UnpivotOps = Table.UnpivotOtherColumns(ExpandOps, {"Data"}, "Attribute", "Value"),
    RenamedOps = Table.RenameColumns(UnpivotOps, {{"Attribute", "Operador"}, {"Value", "Raw"}}),
    ExpandLive = Table.ExpandRecordColumn(RenamedOps, "Raw", {
        "vinGlobal", "veiculo", "rodagemDistanciaMts", "ultimaAtualizacao",
        "etapaAtualIndex", "etapaDesaceleracaoIndex"
    }),
    DistanceKm = Table.AddColumn(ExpandLive, "DistanciaRodagemKm", each
        try [rodagemDistanciaMts] / 1000 otherwise 0, type number),
    ChangeTypes = Table.TransformColumnTypes(DistanceKm, {
        {"Data", type date},
        {"Operador", type text},
        {"vinGlobal", type text},
        {"veiculo", type text},
        {"ultimaAtualizacao", type text},
        {"etapaAtualIndex", Int64.Type},
        {"etapaDesaceleracaoIndex", Int64.Type}
    }),
    // Placeholder for checkin counts — requires nested expansion
    FilterEmpty = Table.SelectRows(ChangeTypes, each [Operador] <> null)
in
    FilterEmpty
```

### 4. DAX Measures (included in .pbit)

All measures from section 2 of the implementation guide are pre-built in the template. The template includes the following measure groups:

| Display Folder | Measures |
|---|---|
| 01 - Score | Score Operacional, Score Piloto, Ranking Piloto, Medalha Piloto |
| 02 - Fuel | KM Total, Litros Total, Consumo Medio Global, Consumo por Posto, Custo Total Combustivel |
| 03 - Anomaly | Q1 Consumo, Q3 Consumo, IQR Consumo, Limite Inferior/Superior IQR, Qtd Outliers Consumo, Taxa Criticas por Turno, Alerta Critico |
| 04 - Time Intel | Turnos MTD, KM MTD, Consumo Medio Movel 3d, Turnos vs Periodo Anterior |
| 05 - Stats | Total Turnos, Total Laudos, Media Duracao, Pilotos Ativos, Ultima Atualizacao |

### 5. Visual Configuration

#### 5.1 Theme File (`ford-vev-theme.json`)

```json
{
  "name": "Ford VEV Dark Industrial",
  "dataColors": ["#1E90FF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#00E5FF", "#94A3B8", "#002C5B"],
  "background": "#0B0F17",
  "foreground": "#F1F5F9",
  "tableAccent": "#243042",
  "visualStyles": {
    "*": {
      "*": {
        "outspace": [{"color": {"solid": {"color": "#0B0F17"}}}],
        "background": [{"color": {"solid": {"color": "#121824"}}, "transparency": 0}],
        "border": [{"color": {"solid": {"color": "#243042"}}, "show": true, "radius": 8}]
      }
    },
    "card": {
      "*": {
        "outspace": [{"color": {"solid": {"color": "#0B0F17"}}}]
      }
    }
  }
}
```

#### 5.2 Report Pages

| # | Page Name | Tab Label (pt-BR) | Description |
|---|---|---|---|
| 1 | Executive | Resumo Gerencial | Score, KPIs, KM trend, heatmap |
| 2 | Fuel | Eficiencia Energetica | Gauges, consumption analysis |
| 3 | Health | Laudos e Saude | Diagnostics, failure analysis |
| 4 | Ranking | Ranking de Pilotos | Pilot leaderboard, radar, metrics |
| 5 | Analytics | Analytics Avancado | Trends, outliers, correlations |
| 6 | Live | Monitoramento Ao Vivo | Real-time operator tracking |
| 7 | Protocols | Protocolos de Teste | Test sessions, R389 cycles |
| 8 | Explorer | Explorador de Dados | Raw data tables, export |

#### 5.3 Filters (Report-level)

```
Filter: Projeto (ALL)
Filter: Operador (ALL)  
Filter: Veiculo (ALL)
Filter: Dim_Data[Date] (Relative Date = Last 90 days)
```

### 6. Refresh Strategy (saved in .pbit)

| Setting | Value |
|---|---|
| Incremental refresh | Enabled on Fact_Turnos, Fact_Abastecimentos, Fact_Laudos, Fact_SessoesTeste (90-day lookback) |
| Full refresh | Fact_MonitoramentoLive (small, real-time) |
| Scheduled refresh | 30 minutes via Power BI Service |
| Gateway | Required for on-premises, not needed for direct REST |
| Data source credential | Anonymous (public Firebase RTDB) |

### 7. File Structure Inside .pbit

```
ford-vev-control-room.pbit
├── DataModel
│   ├── Fact_Turnos
│   ├── Fact_Abastecimentos
│   ├── Fact_Laudos
│   ├── Fact_SessoesTeste
│   ├── Fact_MonitoramentoLive
│   └── Dim_Data
├── Measures
│   ├── Score Operacional
│   ├── Score Piloto
│   ├── Ranking Piloto
│   ├── KM Total / Litros Total / Consumo Medio
│   ├── Q1/Q3/IQR Consumo
│   └── Qtd Outliers Consumo
├── Pages
│   ├── Resumo Gerencial (8 visuals + 4 cards)
│   ├── Eficiencia Energetica (6 visuals)
│   ├── Laudos e Saude (4 visuals + table)
│   ├── Ranking de Pilotos (3 visuals + table)
│   ├── Analytics Avancado (4 visuals + stats)
│   ├── Monitoramento Ao Vivo (1 card + table + map)
│   ├── Protocolos de Teste (2 visuals + table)
│   └── Explorador de Dados (slicer + search + table + buttons)
└── Theme
    └── ford-vev-theme.json
```

### 8. Power BI Service Configuration

After publishing the `.pbit`:

1. **Create workspace** `Ford VEV — Proving Ground`
2. **Upload** `.pbit` → Power BI generates a `.pbix`
3. **Set schedule**: Dataset Settings → Scheduled Refresh → Every 30 min
4. **Configure parameters**: None needed (public API)
5. **Create app** from workspace for distribution
6. **Set permissions**: Stakeholders get Viewer access
7. **Enable** "Endorsement" → Certified for production

### 9. Mobile Layout

A mobile phone layout is configured for pages 1 (Executive) and 6 (Live Monitoring):
- Stack visuals vertically
- Hide detail tables
- Enlarge KPI cards
- Keep filter pane collapsed by default
