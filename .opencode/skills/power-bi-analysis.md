# Power BI Data Analysis Agent

## Purpose
Specialized agent for Power BI data analysis, dashboard optimization, and business intelligence for the Ford VEV Proving Ground system.

## Capabilities
1. **Data Modeling**: Create star schemas, measures, and DAX calculations for vehicle test data
2. **Visual Analysis**: Design Power BI visuals for KPI tracking, anomaly detection, and trend analysis
3. **Real-time Integration**: Configure DirectQuery / streaming datasets from Firebase Realtime Database
4. **Performance Tuning**: Optimize DAX queries, reduce dataset size, implement aggregations

## Recommended Visuals for VEV Data
- **Gauges**: Fuel efficiency (km/l), operational score
- **Line Charts**: Trip KM over time, consumption trends with moving averages
- **Heatmaps**: Pilot x Vehicle test distribution matrix
- **Decomposition Tree**: Root cause analysis of mechanical failures (laudos)
- **Key Influencers**: Factors affecting fuel consumption
- **Ranking**: Pilot performance scorecards

## DAX Patterns for VEV

### Operational Score
```
Operational Score =
VAR ConsumptionScore = DIVIDE(AVERAGE(Shift[Consumption]), 8.0) * 40
VAR CriticalRate = COUNTROWS(FILTER(Laudos, Laudos[Severity] = "Critical")) / COUNTROWS(Shifts)
VAR CriticalPenalty = MIN(CriticalRate * 15, 30)
VAR ShortShiftPenalty = COUNTROWS(FILTER(Shifts, Shifts[Duration] < 60)) / COUNTROWS(Shifts) * 30
RETURN 100 - ((1 - ConsumptionScore) * 40) - CriticalPenalty - ShortShiftPenalty
```

### Rolling Average Consumption
```
Rolling Avg Consumption =
VAR PeriodDays = 7
RETURN
AVERAGEX(
    DATESINPERIOD(Calendar[Date], LASTDATE(Calendar[Date]), -PeriodDays, DAY),
    AVERAGE(Shift[Consumption])
)
```

### Anomaly Detection (IQR)
```
Is Outlier =
VAR Consumption = Shift[Consumption]
VAR Q1 = PERCENTILE.INC(Shift[Consumption], 0.25)
VAR Q3 = PERCENTILE.INC(Shift[Consumption], 0.75)
VAR IQR = Q3 - Q1
RETURN Consumption > Q3 + 1.5 * IQR || Consumption < Q1 - 1.5 * IQR
```

## Firebase Data Connector
Use Power BI's ODBC/JDBC or custom connector to fetch from:
- `vev_turnos_encerrados.json` — completed shifts
- `vev_turnos_ativos.json` — active shifts
- `vev_sessoes_teste.json` — test sessions
- `vev_turnos.json` — live tracking

## Refresh Strategy
- **Scheduled**: Every 30 min for historical data
- **DirectQuery**: For live pilot tracking (ativo/live endpoints)
- **Incremental**: Load last 90 days with incremental refresh policy

