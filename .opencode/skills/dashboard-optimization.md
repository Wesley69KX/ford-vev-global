# Dashboard Smooth Reload & Optimization

## Purpose
Skills for optimizing Streamlit dashboard performance, smooth reloading, and data caching for the Ford VEV Control Room.

## Key Principles

### 1. Minimize Re-renders
- Move static content (CSS, configuration, theme) OUTSIDE `@st.fragment`
- Only include dynamic data-driven content inside the fragment
- Use `st.empty()` placeholders for targeted updates

### 2. Intelligent Data Caching
```python
@st.cache_data(ttl=30)
def load_historical_data():
    """Cache for 30s — balances freshness vs performance"""
    ...
    
@st.cache_data(ttl=2)
def load_live_data():
    """Live data refreshes every 2s"""
    ...
```

### 3. Session State for Data Lifecycle
```python
if "data_loaded" not in st.session_state:
    # Load once, then rely on cache + fragment refresh
    st.session_state.data_loaded = True
```

### 4. Loading States (Skeleton)
Use `st.status()` or custom skeleton HTML during data loads to prevent layout shifts:
```css
.skeleton {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
    background-size: 400px 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
}
```

### 5. Error Boundaries
```python
try:
    # render component
except Exception as e:
    st.warning(f"Component temporarily unavailable: {e}")
    # Show cached/fallback data
```

### 6. Partial Updates Pattern
```python
# Use columns as placeholders for targeted KPI updates
kpi_cols = st.columns(6)
metric_placeholders = [col.empty() for col in kpi_cols]

# Update each independently
for i, ph in enumerate(metric_placeholders):
    with ph:
        render_kpi_card(data[i])
```

### 7. Data Fetching Strategy
- **Avoid duplicate loads**: Don't load data in sidebar AND fragment
- **Use TTL-based caching**: Historical=30s, Live=2s
- **Silent refresh**: Use `@st.fragment(run_every=N)` for background updates
- **Manual override**: "Recarregar" button clears cache

## Streamlit Config Optimization (.streamlit/config.toml)
```toml
[server]
maxUploadSize = 10
enableCORS = false
enableXsrfProtection = false
# For smoother reloads
runOnSave = true
# For production
headless = true

[theme]
base = "dark"
```

## Performance Checklist
- [ ] CSS/theme outside fragment
- [ ] Data not loaded in sidebar + fragment (use session state)
- [ ] Cache TTLs set appropriately
- [ ] Empty placeholders used for targeted updates
- [ ] try/except on data-dependent blocks
- [ ] Manual reload button clears cache
- [ ] Footer timestamp shows last update time
