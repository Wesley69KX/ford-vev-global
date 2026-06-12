# User-Controlled Refresh UX for Dashboards

## Core Principle
**Never auto-reload the entire dashboard.** Auto-reload destroys user context (scroll position, open expanders, active tab) and creates a jarring experience. Instead, give the user full control.

## Strategy

### 1. Manual-Only Refresh (Default)
```python
# NO @st.fragment(run_every=N) at page level
# User clicks "Recarregar" when they want fresh data
if st.button("Recarregar", use_container_width=True):
    st.cache_data.clear()
    st.rerun()
```

### 2. User-Configurable Auto-Refresh (Optional)
Let the user choose:
```python
auto_refresh = st.sidebar.toggle("Auto-atualizar a cada 30s", value=False)
if auto_refresh:
    st.markdown('<meta http-equiv="refresh" content="30">', unsafe_allow_html=True)
```

### 3. Silent Background Updates with st.empty()
For live data that needs periodic updates:
```python
placeholder = st.empty()
def update_live():
    with placeholder.container():
        # render live data only
        pass
# Call update_live() only when user presses refresh or on explicit trigger
```

### 4. Preserve User State Across Refreshes
```python
# Save scroll position, open expanders, active tab before rerun
st.session_state["saved_active_tab"] = active_tab
# On rerun, restore them
```

### 5. Refresh Button with Feedback
```python
if st.button("🔄 Recarregar Dados"):
    st.cache_data.clear()
    st.toast("Dados atualizados!", icon="✅")
    time.sleep(0.2)
    st.rerun()
```

### 6. Timestamp Instead of Countdown
Show when data was LAST updated, not a countdown to next refresh:
```
Ultima atualizacao: 14/06/2026 15:32:07
[🔄 Recarregar]
```

## Streamlit Config
```toml
[server]
# Disable runOnSave to prevent unwanted re-renders
runOnSave = false
```

## Benefits
- No layout shifts while reading
- Expanders stay open
- Active tab stays selected
- User controls the experience
- Lower Firebase costs (fewer API calls)
