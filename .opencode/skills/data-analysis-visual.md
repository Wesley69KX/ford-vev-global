# Data Analysis & Visualization Skills

## Purpose
Transform raw operational data into actionable insights through statistical analysis, anomaly detection, and comparative benchmarking for fleet performance monitoring.

## Key Analysis Patterns

### 1. Fleet Benchmarking
```python
def calc_benchmark(df, metric, group_col="Veiculo"):
    """Compare each vehicle against fleet average"""
    fleet_avg = df[metric].mean()
    df[f"{metric}_vs_fleet"] = ((df[metric] - fleet_avg) / fleet_avg * 100)
    return df.sort_values(f"{metric}_vs_fleet", ascending=False)
```

### 2. Health Score per Vehicle (0-100)
```python
def vehicle_health_score(df_veiculo, df_laudos_veiculo):
    """
    - Consumption efficiency (40pts): >8km/l = 40, >6 = 25, else 10
    - Critical issues (30pts): 0 = 30, 1-2 = 15, 3+ = 0
    - Utilization (30pts): trips above median = 30, else proportional
    """
    score = 100.0
    consumo = df_veiculo["Consumo Médio (km/l)"].mean()
    if consumo >= 8: score -= 0
    elif consumo >= 6: score -= 15
    else: score -= 30
    n_crit = sum(df_laudos_veiculo["Severidade"].str.contains("crit", na=False))
    score -= min(n_crit * 10, 30)
    return max(0, score)
```

### 3. Comparative Bar-in-Bar Charts
```python
# Show individual vs benchmark as overlapping bars
fig = go.Figure()
fig.add_trace(go.Bar(x=[veiculo], y=[value], name="Veiculo", marker_color=blue))
fig.add_trace(go.Bar(x=[veiculo], y=[benchmark], name="Benchmark", marker_color=gray, opacity=0.5))
```

### 4. Anomaly Detection
- IQR-based outlier flags per vehicle
- Z-score for consumption anomalies per trip
- Rolling 7-day average comparison

### 5. Trend Indicators
- Sparklines (mini line charts) inside cards
- Delta arrows (▲▼) with percentage vs benchmark
- Moving average overlay on time series

### 6. Distribution Analysis
- Histogram of trips per vehicle
- Box plot of consumption across fleet
- Stacked bar of severity types per vehicle
