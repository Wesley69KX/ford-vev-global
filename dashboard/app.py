import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import json
import os
import io
import urllib.request
import re


# ==============================================================================
# CONFIGURACAO DA PAGINA
# ==============================================================================
st.set_page_config(
    page_title="Ford VEV — Central de Performance Proving Ground",
    page_icon="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>F</text></svg>",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ==============================================================================
# SESSION STATE INIT
# ==============================================================================
for key in ["last_update", "data_loaded", "data_turnos", "data_abast", "data_sessoes", "data_laudos", "data_ativos", "data_live", "data_operadores_db", "data_postos_db"]:
    if key not in st.session_state:
        st.session_state[key] = None if key != "data_loaded" else False
if "last_toast" not in st.session_state:
    st.session_state.last_toast = 0.0


# ==============================================================================
# PALETA DE CORES FORD
# ==============================================================================
CORS = {
    "ford_blue":    "#002C5B",
    "accent_blue":  "#1E90FF",
    "neon_blue":    "#00E5FF",
    "dark_bg":      "#0B0F17",
    "card_bg":      "#121824",
    "card_bg2":     "#0F1520",
    "border_gray":  "#243042",
    "green":        "#10B981",
    "orange":       "#F59E0B",
    "red":          "#EF4444",
    "purple":       "#8B5CF6",
    "gray_text":    "#8E9AA8",
    "light_text":   "#F1F5F9",
    "gold":         "#F59E0B",
    "silver":       "#94A3B8",
    "bronze":       "#B45309",
}

with st.sidebar:
    st.markdown(
        f"<div style='text-align:center;padding:12px 0 8px;'>"
        f"<img src='https://upload.wikimedia.org/wikipedia/commons/a/a0/Ford_Motor_Company_Logo.svg' width='110' style='margin-bottom:10px;'><br>"
        f"<h3 style='color:#F1F5F9;margin:0;font-size:1rem;letter-spacing:2px;'>PROVING GROUND</h3>"
        f"<span style='color:#00E5FF;font-size:0.72rem;font-weight:700;letter-spacing:1.5px;'>VEV SYSTEM CENTRAL</span></div>",
        unsafe_allow_html=True,
    )
    st.markdown("---")
    tema = st.selectbox(
        "Estilo do Painel:",
        ["Premium Dark", "Industrial Light"],
        key="app_theme_selection"
    )
    st.markdown("---")

if tema == "Industrial Light":
    CORS["dark_bg"] = "#F8FAFC"
    CORS["card_bg"] = "#FFFFFF"
    CORS["card_bg2"] = "#F1F5F9"
    CORS["border_gray"] = "#E2E8F0"
    CORS["light_text"] = "#0F172A"
    CORS["gray_text"] = "#64748B"
    CORS["ford_blue"] = "#002C5B"
    bg_page = CORS["dark_bg"]
else:
    bg_page = CORS["dark_bg"]

# ==============================================================================
# CSS GLOBAL — FORD INDUSTRIAL PREMIUM THEME
# ==============================================================================
st.markdown(
    f"""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Share+Tech+Mono&display=swap');

        html, body, [class*="css"] {{
            font-family: 'Outfit', sans-serif;
            background-color: {CORS['dark_bg']};
            color: {CORS['light_text']};
        }}
        .stApp {{ background-color: {CORS['dark_bg']}; }}
        section[data-testid="stSidebar"] {{
            background-color: {CORS['card_bg']};
            border-right: 1px solid {CORS['border_gray']};
        }}
        .block-container {{ padding: 1rem 2rem 2rem 2rem; max-width: 1600px; }}

        /* ── KPI Cards ── */
        .kpi-card {{
            background: {CORS['card_bg']};
            border: 1px solid {CORS['border_gray']};
            border-top: 3px solid {CORS['accent_blue']};
            border-radius: 8px;
            padding: 14px 16px 10px;
            margin-bottom: 4px;
            transition: box-shadow 0.2s;
        }}
        .kpi-card:hover {{ box-shadow: 0 4px 20px rgba(30,144,255,0.15); }}
        .kpi-label {{ font-size: 0.68rem; text-transform: uppercase; letter-spacing: 1.2px; color: {CORS['gray_text']}; font-weight: 700; margin-bottom: 4px; }}
        .kpi-value {{ font-family: 'Share Tech Mono', monospace; font-size: 1.55rem; font-weight: bold; color: {CORS['light_text']}; line-height: 1.1; }}
        .kpi-delta {{ font-size: 0.72rem; margin-top: 4px; }}
        .delta-positive {{ color: {CORS['green']}; }}
        .delta-negative {{ color: {CORS['red']}; }}
        .delta-neutral {{ color: {CORS['gray_text']}; }}

        /* ── Section Header ── */
        .section-header {{
            font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1.5px;
            color: {CORS['accent_blue']}; font-weight: 800;
            border-bottom: 1px solid {CORS['border_gray']};
            padding-bottom: 6px; margin-bottom: 14px;
        }}

        /* ── Score Card ── */
        .score-card {{
            background: {CORS['card_bg']}; border: 1px solid {CORS['border_gray']};
            border-radius: 10px; padding: 20px 16px; text-align: center;
        }}
        .score-label {{ font-size: 0.68rem; text-transform: uppercase; letter-spacing: 1px; color: {CORS['gray_text']}; font-weight: 700; }}
        .score-number {{ font-family: 'Share Tech Mono', monospace; font-size: 3.2rem; font-weight: 900; line-height: 1.1; margin-top: 8px; }}

        /* ── Semaforo ── */
        .semaforo-card {{
            display: flex; align-items: center; gap: 10px;
            padding: 7px 12px; border-radius: 6px;
            background: {CORS['card_bg2']}; border: 1px solid {CORS['border_gray']};
            margin-bottom: 6px;
        }}
        .semaforo-dot {{ width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }}
        .semaforo-dot.verde {{ background: {CORS['green']}; box-shadow: 0 0 6px {CORS['green']}; }}
        .semaforo-dot.amarelo {{ background: {CORS['orange']}; box-shadow: 0 0 6px {CORS['orange']}; }}
        .semaforo-dot.vermelho {{ background: {CORS['red']}; box-shadow: 0 0 6px {CORS['red']}; }}
        .semaforo-label {{ font-size: 0.76rem; color: {CORS['gray_text']}; flex: 1; font-weight: 500; }}
        .semaforo-value {{ font-family: 'Share Tech Mono', monospace; font-size: 0.78rem; color: {CORS['light_text']}; font-weight: 700; }}

        /* ── Top Cards ── */
        .top-card {{
            background: {CORS['card_bg2']}; border: 1px solid {CORS['border_gray']};
            border-radius: 8px; padding: 12px 14px;
        }}
        .top-title {{ font-size: 0.65rem; text-transform: uppercase; color: {CORS['gray_text']}; font-weight: 700; letter-spacing: 0.8px; }}
        .top-value {{ font-size: 1.05rem; color: {CORS['light_text']}; font-weight: 800; margin-top: 4px; }}
        .top-sub {{ font-family: 'Share Tech Mono', monospace; font-size: 0.78rem; color: {CORS['accent_blue']}; margin-top: 2px; }}

        /* ── Piloto Card ── */
        .piloto-card {{
            background: {CORS['card_bg']}; border: 1px solid {CORS['border_gray']};
            border-left: 3px solid {CORS['green']}; border-radius: 8px;
            padding: 14px 16px; margin-bottom: 10px;
        }}
        .live-badge {{
            display: inline-flex; align-items: center; gap: 5px;
            background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
            border-radius: 20px; padding: 3px 10px;
            font-size: 0.65rem; font-weight: 800; color: {CORS['green']};
            letter-spacing: 0.8px;
        }}
        .live-dot {{
            width: 6px; height: 6px; border-radius: 50%; background: {CORS['green']};
            animation: pulse-green 1.5s infinite;
        }}
        @keyframes pulse-green {{
            0%, 100% {{ opacity: 1; transform: scale(1); }}
            50% {{ opacity: 0.5; transform: scale(1.3); }}
        }}

        /* ── Ranking ── */
        .rank-row {{
            display: flex; align-items: center; gap: 12px;
            padding: 10px 14px; border-radius: 8px;
            background: {CORS['card_bg2']}; border: 1px solid {CORS['border_gray']};
            margin-bottom: 6px;
        }}
        .rank-medal {{ font-size: 1.2rem; font-weight: 900; min-width: 28px; text-align: center; }}
        .rank-name {{ font-size: 0.9rem; font-weight: 700; color: {CORS['light_text']}; flex: 1; }}
        .rank-score {{ font-family: 'Share Tech Mono', monospace; font-size: 1.1rem; font-weight: 900; }}

        /* ── Laudo Ticket ── */
        .laudo-ticket {{
            border-radius: 8px; padding: 12px 14px; margin-bottom: 8px;
            border-left: 4px solid {CORS['gray_text']};
            background: {CORS['card_bg']};
        }}
        .laudo-ticket.critico {{ border-left-color: {CORS['red']}; }}
        .laudo-ticket.moderado {{ border-left-color: {CORS['orange']}; }}
        .laudo-ticket.leve {{ border-left-color: {CORS['green']}; }}
        .laudo-meta {{ font-size: 0.7rem; color: {CORS['gray_text']}; margin-bottom: 4px; }}
        .laudo-desc {{ font-size: 0.88rem; color: {CORS['light_text']}; font-weight: 600; margin-bottom: 6px; }}

        .badge {{ display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.5px; }}
        .badge-critico {{ background: rgba(239,68,68,0.15); color: {CORS['red']}; border: 1px solid rgba(239,68,68,0.3); }}
        .badge-moderado {{ background: rgba(245,158,11,0.15); color: {CORS['orange']}; border: 1px solid rgba(245,158,11,0.3); }}
        .badge-leve {{ background: rgba(16,185,129,0.15); color: {CORS['green']}; border: 1px solid rgba(16,185,129,0.3); }}

        /* ── Outlier Row ── */
        .outlier-row {{
            padding: 8px 14px; border-radius: 6px;
            background: {CORS['card_bg']}; border: 1px solid {CORS['border_gray']};
            font-size: 0.82rem; margin-bottom: 5px;
        }}

        /* ── Footer ── */
        .footer-bar {{
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px 16px; margin-top: 24px; border-top: 1px solid {CORS['border_gray']};
            font-size: 0.68rem; color: {CORS['gray_text']}; font-weight: 500;
        }}

        /* ── Veiculo Cards ── */
        .veiculo-card {{
            background: {CORS['card_bg']}; border: 1px solid {CORS['border_gray']};
            border-left: 4px solid {CORS['accent_blue']};
            border-radius: 10px; padding: 18px 20px; margin-bottom: 14px;
            transition: box-shadow 0.2s;
        }}
        .veiculo-card:hover {{ box-shadow: 0 4px 24px rgba(30,144,255,0.12); }}
        .veiculo-card-header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }}
        .veiculo-nome {{
            display: flex; align-items: center; gap: 10px;
            font-size: 1.1rem; font-weight: 800; color: {CORS['light_text']};
        }}
        .veiculo-icon {{
            display: inline-flex; align-items: center; justify-content: center;
            width: 34px; height: 34px; border-radius: 8px;
            background: {CORS['ford_blue']}; color: #fff;
            font-weight: 900; font-size: 1rem; flex-shrink: 0;
        }}
        .veiculo-vin {{
            font-family: 'Share Tech Mono', monospace; font-size: 0.68rem;
            color: {CORS['gray_text']}; font-weight: 400; margin-left: 6px;
        }}
        .veiculo-periodo {{ font-size: 0.65rem; color: {CORS['gray_text']}; text-align: right; line-height: 1.5; }}
        .stat-circle {{
            border-radius: 50%; width: 64px; height: 64px;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            border: 2px solid {CORS['border_gray']}; background: {CORS['card_bg2']};
            margin: 0 auto;
        }}
        .stat-circle.good {{ border-color: {CORS['green']}; }}
        .stat-circle.warn {{ border-color: {CORS['orange']}; }}
        .stat-circle.bad {{ border-color: {CORS['red']}; }}
        .stat-circle.neutral {{ border-color: {CORS['accent_blue']}; }}
        .stat-circle-value {{ font-family: 'Share Tech Mono', monospace; font-size: 0.78rem; font-weight: 800; color: {CORS['light_text']}; line-height: 1.1; }}
        .stat-circle-label {{ font-size: 0.5rem; text-transform: uppercase; color: {CORS['gray_text']}; font-weight: 700; letter-spacing: 0.5px; margin-top: 1px; }}
        .v-progress {{ height: 6px; background: {CORS['border_gray']}; border-radius: 3px; overflow: hidden; margin-top: 4px; }}
        .v-progress-bar {{ height: 100%; border-radius: 3px; transition: width 0.4s; }}
        .v-progress-label {{ display: flex; justify-content: space-between; font-size: 0.65rem; color: {CORS['gray_text']}; margin-bottom: 2px; }}
        .pilot-avatar {{
            display: inline-flex; align-items: center; gap: 5px;
            background: rgba(30,144,255,0.08); border: 1px solid rgba(30,144,255,0.2);
            border-radius: 20px; padding: 2px 9px; font-size: 0.68rem;
            color: {CORS['accent_blue']}; font-weight: 600; margin: 2px 3px 2px 0;
        }}
        .pilot-initial {{
            font-weight: 800; font-size: 0.7rem; color: {CORS['neon_blue']};
        }}
        .project-tag {{
            display: inline-block; background: rgba(139,92,246,0.1);
            border: 1px solid rgba(139,92,246,0.2); border-radius: 4px;
            padding: 2px 8px; font-size: 0.68rem; color: {CORS['purple']};
            font-weight: 600; margin: 2px 3px 2px 0;
        }}

        /* ── Health badges ── */
        .health-badge {{
            display: inline-flex; align-items: center; gap: 5px;
            padding: 3px 12px; border-radius: 20px; font-size: 0.7rem;
            font-weight: 700; font-family: 'Share Tech Mono', monospace;
        }}
        .health-badge.ok {{ background: rgba(16,185,129,0.12); color: {CORS['green']}; border: 1px solid rgba(16,185,129,0.25); }}
        .health-badge.warn {{ background: rgba(245,158,11,0.12); color: {CORS['orange']}; border: 1px solid rgba(245,158,11,0.25); }}
        .health-badge.crit {{ background: rgba(239,68,68,0.12); color: {CORS['red']}; border: 1px solid rgba(239,68,68,0.25); }}

        /* ── Detail grid ── */
        .detail-grid {{
            display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px;
            font-size: 0.78rem; color: {CORS['gray_text']}; line-height: 1.7;
        }}
        .detail-grid .label {{ color: {CORS['gray_text']}; }}
        .detail-grid .value {{ color: {CORS['light_text']}; font-weight: 600; font-family: 'Share Tech Mono', monospace; }}

        /* ── Search bar ── */
        .vei-search {{
            width: 100%; padding: 10px 14px; border-radius: 8px;
            border: 1px solid {CORS['border_gray']};
            background: {CORS['card_bg2']}; color: {CORS['light_text']};
            font-size: 0.9rem; font-family: 'Outfit', sans-serif;
            outline: none; transition: border-color 0.2s; margin-bottom: 12px;
        }}

        /* ── METRIC SUMMARY ── */
        .stat-box {{
            background-color: {CORS['card_bg']};
            border: 1px solid {CORS['border_gray']};
            border-radius: 6px;
            padding: 0.6rem 0.9rem;
            text-align: center;
        }}
        .stat-label {{ font-size: 0.65rem; color: {CORS['gray_text']}; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }}
        .stat-val   {{ font-family: 'Share Tech Mono', monospace; font-size: 1.1rem; color: {CORS['light_text']}; font-weight: bold; margin-top: 2px; }}

        /* ── Fade-in ── */
        .fade-in-content {{ animation: fadeIn 0.4s ease-in; }}
        @keyframes fadeIn {{ from {{ opacity: 0; transform: translateY(8px); }} to {{ opacity: 1; transform: translateY(0); }} }}
    </style>
    """,
    unsafe_allow_html=True,
)

# ==============================================================================
# HELPERS UTILITARIOS
# ==============================================================================

def calcular_duracao(inicio, fim):
    if not inicio or not fim:
        return ""
    try:
        if "," in inicio:
            inicio = inicio.split(",")[1].strip()
        if "," in fim:
            fim = fim.split(",")[1].strip()

        def parse_hora(str_val):
            partes = re.search(r"(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?", str_val, re.IGNORECASE)
            if not partes:
                return None
            h = int(partes.group(1))
            m = int(partes.group(2))
            ampm = partes.group(4)
            if ampm:
                if ampm.upper() == "PM" and h != 12:
                    h += 12
                elif ampm.upper() == "AM" and h == 12:
                    h = 0
            return h * 60 + m

        minI = parse_hora(inicio)
        minF = parse_hora(fim)
        if minI is None or minF is None:
            return ""
        diff = minF - minI
        if diff < 0:
            diff += 1440
        return int(round(diff))
    except Exception:
        return ""


def fetch_json(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        st.error(f"Erro ao buscar dados do Firebase: {e}")
        return None


def obter_progresso_seguro(atual, maximo):
    try:
        val = float(atual) if atual is not None else 0.0
        mx = float(maximo) if maximo is not None else 10.0
        if mx <= 0:
            return 0.0
        return max(0.0, min(1.0, val / mx))
    except Exception:
        return 0.0


def safe_mean(series):
    try:
        s = series.dropna()
        return float(s.mean()) if len(s) > 0 else 0.0
    except Exception:
        return 0.0


def linear_trend(x_vals, y_vals):
    try:
        x = np.array(x_vals, dtype=float)
        y = np.array(y_vals, dtype=float)
        mask = np.isfinite(x) & np.isfinite(y)
        x, y = x[mask], y[mask]
        if len(x) < 2:
            return 0.0, 0.0, 0.0
        coeffs = np.polyfit(x, y, 1)
        slope, intercept = coeffs
        y_pred = np.polyval(coeffs, x)
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
        return float(slope), float(intercept), float(r2)
    except Exception:
        return 0.0, 0.0, 0.0


def calcular_score_operacional(df_turnos, df_laudos, benchmark=8.0):
    score = 100.0
    if not df_turnos.empty and "Consumo Médio (km/l)" in df_turnos.columns:
        consumo_vals = df_turnos["Consumo Médio (km/l)"][df_turnos["Consumo Médio (km/l)"] > 0]
        if len(consumo_vals) > 0:
            ratio = min(consumo_vals.mean() / benchmark, 1.0)
            score -= (1.0 - ratio) * 40
    if not df_laudos.empty and "Severidade" in df_laudos.columns and not df_turnos.empty:
        n_criticos = df_laudos["Severidade"].str.lower().str.contains("crit", na=False).sum()
        n_turnos = max(len(df_turnos), 1)
        taxa = n_criticos / n_turnos
        penalidade = min(taxa * 15, 30)
        score -= penalidade
    if not df_turnos.empty and "Duração (min)" in df_turnos.columns:
        dur_vals = pd.to_numeric(df_turnos["Duração (min)"], errors="coerce").dropna()
        if len(dur_vals) > 0:
            pct_curtos = (dur_vals < 60).sum() / len(dur_vals)
            score -= pct_curtos * 30
    return round(max(0.0, min(100.0, score)), 1)


def calcular_score_piloto(df_piloto_turnos, df_piloto_laudos, benchmark=8.0):
    score = 100.0
    try:
        if not df_piloto_turnos.empty and "Consumo Médio (km/l)" in df_piloto_turnos.columns:
            consumo_vals = df_piloto_turnos["Consumo Médio (km/l)"][df_piloto_turnos["Consumo Médio (km/l)"] > 0]
            if len(consumo_vals) > 0:
                ratio = min(consumo_vals.mean() / benchmark, 1.0)
                score -= (1.0 - ratio) * 40
        n_laudos = len(df_piloto_laudos) if not df_piloto_laudos.empty else 0
        n_turnos = max(len(df_piloto_turnos), 1)
        penalidade = min((n_laudos / n_turnos) * 30, 30)
        score -= penalidade
    except Exception:
        pass
    return round(max(0.0, min(100.0, score)), 1)


def score_cor(score):
    if score >= 75:
        return CORS["green"]
    elif score >= 50:
        return CORS["orange"]
    return CORS["red"]


def fmt_badge(s):
    v = str(s).lower()
    if "crit" in v:
        return f'<span class="badge badge-critico">{s}</span>'
    elif "mod" in v:
        return f'<span class="badge badge-moderado">{s}</span>'
    return f'<span class="badge badge-leve">{s}</span>'


def get_delta_html(val, inverse=False):
    if val > 0:
        cls = "delta-positive" if not inverse else "delta-negative"
        arrow = "▲"
        sign = "+"
    elif val < 0:
        cls = "delta-negative" if not inverse else "delta-positive"
        arrow = "▼"
        sign = ""
    else:
        cls = "delta-neutral"
        arrow = "—"
        sign = ""
    return (
        f'<div class="kpi-delta {cls}">'
        f'<span>{arrow} {sign}{val:.1f}%</span>'
        f'<span style="color:{CORS["gray_text"]};font-weight:normal;margin-left:4px;">vs media geral</span>'
        f'</div>'
    )


def semaforo_html(cor, label, valor):
    cls_map = {"verde": "verde", "amarelo": "amarelo", "vermelho": "vermelho"}
    cls = cls_map.get(cor, "amarelo")
    return (
        f'<div class="semaforo-card">'
        f'<span class="semaforo-dot {cls}"></span>'
        f'<span class="semaforo-label">{label}</span>'
        f'<span class="semaforo-value">{valor}</span>'
        f'</div>'
    )


def exportar_excel(dfs_dict):
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        for sheet_name, df in dfs_dict.items():
            if df is not None and not df.empty:
                df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
    return buf.getvalue()


def sparkline_fig(values, color):
    fig = go.Figure(
        go.Scatter(
            y=values,
            mode="lines",
            line=dict(color=color, width=2),
            fill="tozeroy",
            fillcolor=f"rgba({int(color[1:3],16)},{int(color[3:5],16)},{int(color[5:7],16)},0.1)",
        )
    )
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=0, r=0, t=0, b=0),
        height=50,
        xaxis=dict(visible=False),
        yaxis=dict(visible=False),
        showlegend=False,
    )
    return fig


def gauge_fig(value, max_val, label, color):
    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=value,
            number={"suffix": " km/l", "font": {"family": "Share Tech Mono", "color": CORS["light_text"], "size": 24}},
            gauge={
                "axis": {"range": [0, max_val], "tickcolor": CORS["gray_text"], "tickfont": {"size": 9}},
                "bar": {"color": color, "thickness": 0.25},
                "bgcolor": CORS["card_bg"],
                "bordercolor": CORS["border_gray"],
                "steps": [
                    {"range": [0, max_val * 0.4], "color": "rgba(239,68,68,0.15)"},
                    {"range": [max_val * 0.4, max_val * 0.7], "color": "rgba(245,158,11,0.12)"},
                    {"range": [max_val * 0.7, max_val], "color": "rgba(16,185,129,0.12)"},
                ],
                "threshold": {"line": {"color": color, "width": 3}, "thickness": 0.75, "value": value},
            },
            title={"text": label, "font": {"size": 12, "color": CORS["gray_text"], "family": "Outfit"}},
        )
    )
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        font_color=CORS["light_text"],
        height=220,
        margin=dict(l=20, r=20, t=40, b=10),
    )
    return fig


def gerar_storytelling(df_turnos, df_laudos, df_ativos, benchmark, meta_min):
    story = {}
    
    # 1. HOOK (Gancho)
    total_km = df_turnos["Trip KM"].sum() if not df_turnos.empty and "Trip KM" in df_turnos.columns else 0.0
    total_litros = df_turnos["Litros"].sum() if not df_turnos.empty and "Litros" in df_turnos.columns else 0.0
    media_consumo = total_km / total_litros if total_litros > 0 else 0.0
    
    status_consumo = "acima da meta ideal" if media_consumo >= benchmark else "abaixo da meta ideal"
    if media_consumo < meta_min:
        status_consumo = "em nivel critico"
        
    story["hook"] = (
        f"A frota registrou uma rodagem robusta de <b>{total_km:,.1f} km</b> "
        f"com um consumo medio geral de <b>{media_consumo:.2f} km/l</b>, o que se posiciona <b>{status_consumo}</b> "
        f"de {benchmark} km/l."
    )
    
    # 2. CONFLITO (Anomalias, Ocorrencias, Alertas)
    conflitos = []
    
    # Outliers de consumo
    if not df_turnos.empty and "Consumo Médio (km/l)" in df_turnos.columns:
        consumo_series = df_turnos[df_turnos["Consumo Médio (km/l)"] > 0]["Consumo Médio (km/l)"]
        if len(consumo_series) >= 4:
            Q1 = consumo_series.quantile(0.25)
            Q3 = consumo_series.quantile(0.75)
            IQR = Q3 - Q1
            lower_fence = Q1 - 1.5 * IQR
            upper_fence = Q3 + 1.5 * IQR
            df_outliers = df_turnos[(df_turnos["Consumo Médio (km/l)"] > 0) & ((df_turnos["Consumo Médio (km/l)"] < lower_fence) | (df_turnos["Consumo Médio (km/l)"] > upper_fence))]
            
            if not df_outliers.empty:
                conflitos.append(f"Identificados <b>{len(df_outliers)} turnos com consumo anomalo</b> (outliers de consumo).")
                
    # Laudos criticos
    n_crit = 0
    if not df_laudos.empty and "Severidade" in df_laudos.columns:
        n_crit = df_laudos["Severidade"].str.lower().str.contains("crit", na=False).sum()
    if n_crit > 0:
        conflitos.append(f"Registramos <b>{n_crit} ocorrencias de severidade CRITICA</b> nos veiculos em campo.")
        
    # Pilotos com laudos pendentes
    n_pend = 0
    if not df_ativos.empty and "Qtd Laudos Pendentes" in df_ativos.columns:
        n_pend = (df_ativos["Qtd Laudos Pendentes"] > 0).sum()
        if n_pend > 0:
            conflitos.append(f"Existem <b>{n_pend} piloto(s) ativo(s) com pendencias de laudos</b> no aplicativo movel.")
            
    if conflitos:
        story["conflict"] = " • " + "<br> • ".join(conflitos)
    else:
        story["conflict"] = "Nenhuma anomalia operacional critica ou desvio de eficiencia foi detectado no periodo selecionado."
        
    # 3. RESOLUCAO (Acoes Recomendadas)
    resolucoes = []
    
    # Se ha consumo baixo
    if media_consumo < benchmark and not df_turnos.empty and "Veiculo" in df_turnos.columns and "Consumo Médio (km/l)" in df_turnos.columns:
        piores = df_turnos[df_turnos["Consumo Médio (km/l)"] > 0].groupby("Veiculo")["Consumo Médio (km/l)"].mean()
        if not piores.empty:
            pior_vei = piores.idxmin()
            pior_val = piores.min()
            resolucoes.append(f"Recomenda-se realizar uma inspecao mecanica no veiculo <b>{pior_vei}</b>, que apresentou o menor consumo medio (<b>{pior_val:.2f} km/l</b>).")
            
    # Se ha laudos criticos
    if not df_laudos.empty and "Severidade" in df_laudos.columns and n_crit > 0:
        crit_list = df_laudos[df_laudos["Severidade"].str.lower().str.contains("crit", na=False)]
        pior_vei_laudo = crit_list["Veiculo"].mode().iloc[0] if not crit_list["Veiculo"].mode().empty else crit_list["Veiculo"].iloc[0]
        resolucoes.append(f"Priorizar o diagnostico e reparo do veiculo <b>{pior_vei_laudo}</b> devido a recorrencia de falhas criticas.")
        
    # Se ha pilotos ativos pendentes
    if not df_ativos.empty and n_pend > 0:
        ops_pend = df_ativos[df_ativos["Qtd Laudos Pendentes"] > 0]["Operador"].tolist()
        resolucoes.append(f"Cobrar o preenchimento de laudos atrasados dos operadores: <b>{', '.join(ops_pend[:3])}</b>.")
        
    if not resolucoes:
        resolucoes.append("Manter o plano de rodagem planejado e as rotinas de manutencao preventiva padrao.")
        
    story["resolution"] = " → " + "<br> → ".join(resolucoes)
    
    return story


# ==============================================================================
# PARSERS DE DADOS
# ==============================================================================

def parse_turnos_encerrados(data):
    if not data:
        return pd.DataFrame()
    rows = []
    for id_val, t in data.items():
        if not t:
            continue
        abs_list = t.get("abastecimentos", [])
        if isinstance(abs_list, dict):
            abs_list = list(abs_list.values())
        elif not isinstance(abs_list, list):
            abs_list = []
        total_litros_abast = sum(float(a.get("litros") or 0) for a in abs_list if a)
        hora_inicio = t.get("horaInicio", "")
        hora_fim = t.get("horaFim", "")
        duracao = t.get("tempo") or calcular_duracao(hora_inicio, hora_fim)
        row = {
            "ID":                    id_val,
            "Data":                  t.get("data") or t.get("turnoData") or "",
            "Dia Semana":            t.get("diaSemana", ""),
            "Mes":                   t.get("mes", ""),
            "Semana":                t.get("semana", ""),
            "Hora Inicio":           hora_inicio,
            "Hora Fim":              hora_fim,
            "Duração (min)":         duracao,
            "Operador":              t.get("operador", ""),
            "UID":                   t.get("uid", ""),
            "Cargo":                 t.get("cargo", ""),
            "Veiculo":               t.get("veiculo", ""),
            "VIN":                   t.get("vin", ""),
            "Tipo Teste":            t.get("tipoTeste") or t.get("tipoteste", ""),
            "Projeto":               t.get("projeto", ""),
            "CC":                    t.get("cc", ""),
            "EJA":                   t.get("eja", ""),
            "KM Inicial":            float(t.get("kmInicial") or 0),
            "KM Final":              float(t.get("kmFinal") or 0),
            "Trip KM":               float(t.get("tripKm") or t.get("trip") or 0),
            "Litros":                float(t.get("litros") or 0),
            "Consumo Médio (km/l)":  float(t.get("consumoMedio") or t.get("consumo") or 0),
            "Posto":                 t.get("posto", ""),
            "Tipo Combustivel":      t.get("tipoCombustivel", ""),
            "Valor Pago (R$)":       float(t.get("valorPago") or 0),
            "Saldo (R$)":            float(t.get("saldo") or 0),
            "Autonomia (km)":        float(t.get("autonomia") or 0),
            "Temperatura":           t.get("temperatura", ""),
            "Ciclos R389":           float(t.get("ciclosR389") or 0),
            "Laps Frenagem":         float(t.get("lapsFrenagem") or 0),
            "Laps Desaceleracao":    float(t.get("lapsDesaceleracao") or 0),
            "KM Rodagem":            float(t.get("kmRodagem") or 0),
            "Total Ocorrencias":     float(t.get("totalOcorrencias") or t.get("issues") or 0),
            "Criticas":              float(t.get("ocorrenciasCritico") or 0),
            "Moderadas":             float(t.get("ocorrenciasModerat") or 0),
            "Leves":                 float(t.get("ocorrenciasLeve") or 0),
            "Qtd Abastecimentos":    len(abs_list),
            "Total Litros Abast.":   round(total_litros_abast, 2),
            "Problemas":             t.get("problemas", ""),
            "Status Operacional":    t.get("statusOperacional", ""),
            "Timestamp":             str(t.get("timestamp") or t.get("criadoEm") or ""),
        }
        rows.append(row)
    return pd.DataFrame(rows)


def parse_abastecimentos(data):
    if not data:
        return pd.DataFrame()
    rows = []
    for id_val, t in data.items():
        if not t:
            continue
        abs_list = t.get("abastecimentos", [])
        if isinstance(abs_list, dict):
            abs_list = list(abs_list.values())
        elif not isinstance(abs_list, list):
            abs_list = []
        if len(abs_list) == 0:
            litros = float(t.get("litros") or 0)
            if litros > 0:
                rows.append({
                    "Turno ID":        id_val,
                    "Data":            t.get("data") or t.get("turnoData") or "",
                    "Operador":        t.get("operador", ""),
                    "Veiculo":         t.get("veiculo", ""),
                    "VIN":             t.get("vin", ""),
                    "Projeto":         t.get("projeto", ""),
                    "Hora Abast.":     t.get("horaFim", "") or "",
                    "Posto":           t.get("posto", "") or "Nao Informado",
                    "Tipo Combustivel": t.get("tipoCombustivel", "") or "Nao Informado",
                    "Litros":          litros,
                    "KM Atual":        float(t.get("kmFinal") or 0),
                    "KM Final Turno":  float(t.get("kmFinal") or 0),
                    "Diferenca KM":    0.0,
                })
        else:
            for a in abs_list:
                if not a:
                    continue
                km_atual = float(a.get("kmAtual") or 0)
                km_final = float(t.get("kmFinal") or 0)
                diff_km = km_final - km_atual if km_final > 0 and km_atual > 0 else 0.0
                rows.append({
                    "Turno ID":        id_val,
                    "Data":            t.get("data") or t.get("turnoData") or "",
                    "Operador":        t.get("operador", ""),
                    "Veiculo":         t.get("veiculo", ""),
                    "VIN":             t.get("vin", ""),
                    "Projeto":         t.get("projeto", ""),
                    "Hora Abast.":     a.get("hora", ""),
                    "Posto":           a.get("posto", "") or "Nao Informado",
                    "Tipo Combustivel": a.get("tipoCombustivel", "") or "Nao Informado",
                    "Litros":          float(a.get("litros") or 0),
                    "KM Atual":        km_atual,
                    "KM Final Turno":  km_final,
                    "Diferenca KM":    round(diff_km, 1),
                })
    return pd.DataFrame(rows)


def parse_sessoes_teste(data):
    if not data:
        return pd.DataFrame()
    rows = []
    for id_val, s in data.items():
        if not s:
            continue
        rows.append({
            "ID":              id_val,
            "Data":            s.get("data", ""),
            "Operador":        s.get("operador", ""),
            "UID":             s.get("uid", ""),
            "Projeto":         s.get("projeto", ""),
            "Tipo Teste":      s.get("tipoTeste", ""),
            "Veiculo":         s.get("veiculo", ""),
            "VIN":             s.get("vin", ""),
            "CC":              s.get("cc", ""),
            "EJA":             s.get("eja", ""),
            "Ciclos R389":     float(s.get("ciclos") or 0),
            "Laps Frenagem":   float(s.get("laps") or 0),
            "Frenagens":       float(s.get("frenagens") or 0),
            "Execucoes":       float(s.get("execucoes") or 0),
            "KM Rodado":       float(s.get("kmRodado") or 0),
            "Tempo Execucao":  s.get("tempoExecucao", ""),
            "Observacoes":     s.get("observacoes", ""),
            "Problemas":       s.get("problemas", ""),
            "Status":          s.get("status", ""),
            "Turno ID":        s.get("turnoId", ""),
            "Timestamp":       str(s.get("criadoEm") or ""),
        })
    return pd.DataFrame(rows)


def parse_turnos_ativos(data):
    if not data:
        return pd.DataFrame()
    rows = []
    for uid, t in data.items():
        if not t:
            continue
        abs_list = t.get("abastecimentos", [])
        if isinstance(abs_list, dict):
            abs_list = list(abs_list.values())
        elif not isinstance(abs_list, list):
            abs_list = []
        total_litros = sum(float(a.get("litros") or 0) for a in abs_list if a)
        laudos_pend = t.get("laudosPendentes", [])
        qtd_laudos = len(laudos_pend) if isinstance(laudos_pend, (dict, list)) else 0
        rows.append({
            "UID":                    uid,
            "Operador":               t.get("operador", ""),
            "Veiculo":                t.get("veiculo", ""),
            "VIN":                    t.get("vin", ""),
            "Hora Inicio":            t.get("horaInicio", ""),
            "KM Inicial":             float(t.get("kmInicial") or 0),
            "Projeto":                t.get("projeto", ""),
            "Tipo Teste":             t.get("tipoTeste") or t.get("tipoteste", ""),
            "CC":                     t.get("cc", ""),
            "EJA":                    t.get("eja", ""),
            "Qtd Abastecimentos":     len(abs_list),
            "Total Litros":           round(total_litros, 2),
            "Qtd Laudos Pendentes":   qtd_laudos,
            "Outras Info":            t.get("outrasInfo", ""),
            "Ultimo Timestamp":       str(t.get("timestamp") or ""),
        })
    return pd.DataFrame(rows)


def parse_laudos(data):
    if not data:
        return pd.DataFrame()
    rows = []
    for id_val, t in data.items():
        if not t:
            continue
        laudos = t.get("laudos", [])
        if isinstance(laudos, dict):
            lista = list(laudos.values())
        elif isinstance(laudos, list):
            lista = laudos
        else:
            lista = []
        for l in lista:
            if not l:
                continue
            rows.append({
                "Turno ID":  id_val,
                "Data":      t.get("data") or t.get("turnoData") or "",
                "Operador":  t.get("operador", ""),
                "Veiculo":   t.get("veiculo", ""),
                "VIN":       t.get("vin", ""),
                "Hora Laudo": l.get("hora", ""),
                "Descricao": l.get("descricao", ""),
                "Severidade": l.get("severidade", "") or "Nao Informado",
                "Categoria": l.get("categoria", "") or "Geral",
                "Projeto":   t.get("projeto", ""),
            })
    return pd.DataFrame(rows)


# ==============================================================================
# CARREGADORES DE DADOS (CACHEADOS)
# ==============================================================================

@st.cache_data(ttl=30)
def carregar_dados_historicos():
    base_url = "https://ford-vev-default-rtdb.firebaseio.com"
    raw_turnos = fetch_json(f"{base_url}/vev_turnos_encerrados.json")
    raw_sessoes = fetch_json(f"{base_url}/vev_sessoes_teste.json")
    raw_veiculos = fetch_json(f"{base_url}/vev_veiculos.json")
    raw_projetos = fetch_json(f"{base_url}/vev_projetos.json")
    raw_operadores = fetch_json(f"{base_url}/vev_operadores.json")
    raw_postos = fetch_json(f"{base_url}/vev_postos.json")
    
    df_turnos = parse_turnos_encerrados(raw_turnos)
    df_abast = parse_abastecimentos(raw_turnos)
    df_laudos = parse_laudos(raw_turnos)
    df_sessoes = parse_sessoes_teste(raw_sessoes)
    
    # Process veiculos cadastrados do DB
    vei_list = []
    if raw_veiculos:
        for vid, v in raw_veiculos.items():
            if v and v.get("ativo") is not False:
                vei_list.append({
                    "id": vid,
                    "nome": v.get("nome", ""),
                    "vin": v.get("vin", ""),
                    "eja": v.get("eja", ""),
                    "cc": v.get("cc", ""),
                    "outrasInfo": v.get("outrasInfo", ""),
                    "projetosVinculados": v.get("projetosVinculados", [])
                })
    df_veiculos_db = pd.DataFrame(vei_list)
    
    # Process projetos cadastrados do DB
    proj_list = []
    if raw_projetos:
        for pid, p in raw_projetos.items():
            if p and p.get("ativo") is not False:
                proj_list.append({
                    "id": pid,
                    "nome": p.get("nome", "")
                })
    df_projetos_db = pd.DataFrame(proj_list)

    # Process operadores cadastrados do DB
    op_list = []
    if raw_operadores:
        for oid, o in raw_operadores.items():
            if o and o.get("ativo") is not False:
                op_list.append({
                    "id": oid,
                    "nome": o.get("nome", ""),
                    "matricula": o.get("matricula", ""),
                    "email": o.get("email", ""),
                    "cargo": o.get("cargo", "")
                })
    df_operadores_db = pd.DataFrame(op_list)

    # Process postos cadastrados do DB
    postos_list = []
    if raw_postos:
        for postoid, p in raw_postos.items():
            if p and p.get("ativo") is not False:
                postos_list.append({
                    "id": postoid,
                    "nome": p.get("nome", "")
                })
    df_postos_db = pd.DataFrame(postos_list)
    
    return df_turnos, df_abast, df_sessoes, df_laudos, df_veiculos_db, df_projetos_db, df_operadores_db, df_postos_db


@st.cache_data(ttl=2)
def carregar_dados_ativos_live():
    base_url = "https://ford-vev-default-rtdb.firebaseio.com"
    raw_ativos = fetch_json(f"{base_url}/vev_turnos_ativos.json")
    df_ativos = parse_turnos_ativos(raw_ativos)
    return df_ativos


# ==============================================================================
# SIDEBAR (Filtros, Benchmarks e Controles)
# ==============================================================================
with st.sidebar:
    st.markdown(
        f"<span style='font-size:0.72rem;text-transform:uppercase;letter-spacing:1.2px;color:{CORS['gray_text']};font-weight:700;'>Filtros Globais</span>",
        unsafe_allow_html=True,
    )

    df_turnos_cache, df_abast_cache, df_sessoes_cache, df_laudos_cache, df_veiculos_db, df_projetos_db, df_operadores_db, df_postos_db = carregar_dados_historicos()

    df_turnos_filtro = df_turnos_cache.copy()
    if not df_turnos_filtro.empty and "Data" in df_turnos_filtro.columns:
        df_turnos_filtro["Data_parsed"] = pd.to_datetime(df_turnos_filtro["Data"], errors="coerce")

    projetos = ["Todos"]
    if not df_projetos_db.empty and "nome" in df_projetos_db.columns:
        projetos += sorted(df_projetos_db["nome"].dropna().unique().tolist())
    elif not df_turnos_filtro.empty and "Projeto" in df_turnos_filtro.columns:
        projetos += sorted(df_turnos_filtro["Projeto"].dropna().unique().tolist())
    filtro_projeto = st.selectbox("Projeto:", projetos)

    operadores = ["Todos"]
    if not df_operadores_db.empty and "nome" in df_operadores_db.columns:
        operadores += sorted(df_operadores_db["nome"].dropna().unique().tolist())
    elif not df_turnos_filtro.empty and "Operador" in df_turnos_filtro.columns:
        operadores += sorted(df_turnos_filtro["Operador"].dropna().unique().tolist())
    filtro_operador = st.selectbox("Operador:", operadores)

    veiculos = ["Todos"]
    if not df_veiculos_db.empty and "nome" in df_veiculos_db.columns:
        veiculos += sorted(df_veiculos_db["nome"].dropna().unique().tolist())
    elif not df_turnos_filtro.empty and "Veiculo" in df_turnos_filtro.columns:
        veiculos += sorted(df_turnos_filtro["Veiculo"].dropna().unique().tolist())
    filtro_veiculo = st.selectbox("Veiculo:", veiculos)

    # Datas dinamicas baseadas nos dados reais
    min_date = datetime(2024, 1, 1)
    max_date = datetime.now()
    if not df_turnos_filtro.empty and "Data_parsed" in df_turnos_filtro.columns and df_turnos_filtro["Data_parsed"].notnull().any():
        min_date = df_turnos_filtro["Data_parsed"].min().to_pydatetime()
        max_date = df_turnos_filtro["Data_parsed"].max().to_pydatetime()

    datas = st.date_input(
        "Periodo de Analise:",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date,
    )

    st.markdown("---")
    st.markdown(
        f"<span style='font-size:0.72rem;text-transform:uppercase;letter-spacing:1.2px;color:{CORS['gray_text']};font-weight:700;'>Benchmarks</span>",
        unsafe_allow_html=True,
    )
    benchmark_kmpl = st.slider(
        "Meta Consumo (km/l):",
        min_value=4.0, max_value=15.0, value=8.0, step=0.5,
        key="benchmark_slider",
        help="Benchmark de eficiencia de combustivel usado nos scores e alertas."
    )
    meta_min_kmpl = st.slider(
        "Limite Critico (km/l):",
        min_value=2.0, max_value=8.0, value=5.0, step=0.5,
        key="meta_min_slider",
        help="Abaixo deste valor o consumo e considerado CRITICO."
    )

    st.markdown("---")
    st.markdown(
        f"<span style='font-size:0.72rem;text-transform:uppercase;letter-spacing:1.2px;color:{CORS['gray_text']};font-weight:700;'>Assistente Gemini</span>",
        unsafe_allow_html=True,
    )
    api_key_input = st.text_input(
        "Chave API do Gemini:",
        type="password",
        value=st.session_state.get("gemini_api_key", ""),
        help="Insira sua chave do Google AI Studio para ativar o IA Advisor.",
    )
    if api_key_input != st.session_state.get("gemini_api_key", ""):
        st.session_state.gemini_api_key = api_key_input
        st.rerun()

    st.markdown("---")
    auto_refresh = st.toggle("Auto-atualizar a cada 30s", value=st.session_state.get("auto_refresh", False))
    if auto_refresh != st.session_state.get("auto_refresh", False):
        st.session_state.auto_refresh = auto_refresh
        st.rerun()

    col_btn1, col_btn2 = st.columns(2)
    with col_btn1:
        if st.button("🔄 Recarregar", use_container_width=True):
            st.cache_data.clear()
            st.session_state.data_loaded = False
            st.toast("Dados atualizados!", icon="✅")
            st.rerun()
    with col_btn2:
        if st.button("Exportar XLS", use_container_width=True):
            st.session_state.trigger_export = True

    st.markdown("---")
    last_up = st.session_state.last_update or datetime.now()
    ts_display = last_up.strftime("%d/%m/%Y %H:%M:%S")
    st.markdown(
        f"<div style='font-size:0.68rem;color:{CORS['gray_text']};text-align:center;'>"
        f"Ultima atualizacao<br><b style='color:{CORS['light_text']};'>{ts_display}</b></div>",
        unsafe_allow_html=True,
    )


# ==============================================================================
# RENDER DASHBOARD (fragmento principal)
# ==============================================================================
auto_refresh_enabled = st.session_state.get("auto_refresh", False)
refresh_interval = st.session_state.get("refresh_interval", 30)
benchmark_kmpl = st.session_state.get("benchmark_slider", 8.0)
meta_min_kmpl = st.session_state.get("meta_min_slider", 5.0)


@st.fragment(run_every=refresh_interval if auto_refresh_enabled else None)
def render_dashboard(filtro_projeto, filtro_operador, filtro_veiculo, datas):
    try:
        df_turnos_raw, df_abast_raw, df_sessoes_raw, df_laudos_raw, df_veiculos_db, df_projetos_db, df_operadores_db, df_postos_db = carregar_dados_historicos()
        df_ativos = carregar_dados_ativos_live()
        st.session_state.data_loaded = True
        st.session_state.last_update = datetime.now()
    except Exception as e:
        st.warning(f"Dados temporariamente indisponiveis: {e}")
        if st.session_state.data_loaded:
            st.info("Exibindo dados da ultima carga.")
            df_turnos_raw = st.session_state.get("data_turnos") or pd.DataFrame()
            df_abast_raw = st.session_state.get("data_abast") or pd.DataFrame()
            df_sessoes_raw = st.session_state.get("data_sessoes") or pd.DataFrame()
            df_laudos_raw = st.session_state.get("data_laudos") or pd.DataFrame()
            df_veiculos_db = st.session_state.get("data_veiculos_db") or pd.DataFrame()
            df_projetos_db = st.session_state.get("data_projetos_db") or pd.DataFrame()
            df_operadores_db = st.session_state.get("data_operadores_db") or pd.DataFrame()
            df_postos_db = st.session_state.get("data_postos_db") or pd.DataFrame()
            df_ativos = st.session_state.get("data_ativos") or pd.DataFrame()
        else:
            st.error("Nao foi possivel carregar os dados. Verifique a conexao com Firebase.")
            return

    st.session_state.data_turnos = df_turnos_raw
    st.session_state.data_abast = df_abast_raw
    st.session_state.data_sessoes = df_sessoes_raw
    st.session_state.data_laudos = df_laudos_raw
    st.session_state.data_veiculos_db = df_veiculos_db
    st.session_state.data_projetos_db = df_projetos_db
    st.session_state.data_operadores_db = df_operadores_db
    st.session_state.data_postos_db = df_postos_db
    st.session_state.data_ativos = df_ativos

    df_turnos_total = df_turnos_raw.copy()
    if not df_turnos_raw.empty and "Data" in df_turnos_raw.columns:
        df_turnos_raw["Data_parsed"] = pd.to_datetime(df_turnos_raw["Data"], errors="coerce")
        df_turnos_total["Data_parsed"] = pd.to_datetime(df_turnos_total["Data"], errors="coerce")
    else:
        df_turnos_raw["Data_parsed"] = pd.NaT
        df_turnos_total["Data_parsed"] = pd.NaT

    df_turnos = df_turnos_raw.copy()
    df_abast = df_abast_raw.copy()
    df_laudos = df_laudos_raw.copy()
    df_sessoes = df_sessoes_raw.copy()

    def apply_filters(df, col_projeto=None, col_operador=None, col_veiculo=None, col_data=None):
        if df.empty:
            return df
        if filtro_projeto != "Todos" and col_projeto and col_projeto in df.columns:
            df = df[df[col_projeto] == filtro_projeto]
        if filtro_operador != "Todos" and col_operador and col_operador in df.columns:
            df = df[df[col_operador] == filtro_operador]
        if filtro_veiculo != "Todos" and col_veiculo and col_veiculo in df.columns:
            df = df[df[col_veiculo] == filtro_veiculo]
        if isinstance(datas, tuple) and len(datas) == 2 and col_data and col_data in df.columns:
            d_col = pd.to_datetime(df[col_data], errors="coerce")
            df = df[(d_col >= pd.to_datetime(datas[0])) & (d_col <= pd.to_datetime(datas[1]))]
        return df

    df_turnos = apply_filters(df_turnos, "Projeto", "Operador", "Veiculo", "Data_parsed")
    df_abast = apply_filters(df_abast, "Projeto", "Operador", "Veiculo", "Data")
    df_laudos = apply_filters(df_laudos, "Projeto", "Operador", "Veiculo", "Data")
    df_sessoes = apply_filters(df_sessoes, "Projeto", "Operador", "Veiculo", "Data")

    if st.session_state.get("trigger_export", False):
        st.session_state.trigger_export = False
        try:
            xlsx_bytes = exportar_excel({
                "Turnos": df_turnos,
                "Abastecimentos": df_abast,
                "Laudos": df_laudos,
                "Sessoes Teste": df_sessoes,
            })
            st.sidebar.download_button(
                label="Baixar Relatorio (.xlsx)",
                data=xlsx_bytes,
                file_name=f"ford_vev_relatorio_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                use_container_width=True,
            )
        except Exception as e:
            st.error(f"Erro ao exportar: {e}")

    # ── KPIs GLOBAIS ──
    try:
        total_turnos = len(df_turnos)
        total_km = df_turnos["Trip KM"].sum() if not df_turnos.empty and "Trip KM" in df_turnos.columns else 0.0
        total_litros = df_turnos["Litros"].sum() if not df_turnos.empty and "Litros" in df_turnos.columns else 0.0
        media_consumo = total_km / total_litros if total_litros > 0 else 0.0
        total_laudos = len(df_laudos) if not df_laudos.empty else 0
        ativos_count = len(df_ativos) if not df_ativos.empty else 0
        n_crit_global = 0
        if not df_laudos_raw.empty and "Severidade" in df_laudos_raw.columns:
            n_crit_global = int(df_laudos_raw["Severidade"].str.lower().str.contains("crit", na=False).sum())

        total_km_geral = df_turnos_total["Trip KM"].sum() if not df_turnos_total.empty and "Trip KM" in df_turnos_total.columns else 1.0
        total_litros_geral = df_turnos_total["Litros"].sum() if not df_turnos_total.empty and "Litros" in df_turnos_total.columns else 1.0
        avg_consumo_total = (total_km_geral / total_litros_geral) if total_litros_geral > 0 else 1.0
        avg_km_total = safe_mean(df_turnos_total["Trip KM"]) if not df_turnos_total.empty and "Trip KM" in df_turnos_total.columns else 1.0

        current_avg_km = safe_mean(df_turnos["Trip KM"]) if not df_turnos.empty and "Trip KM" in df_turnos.columns else 0.0
        delta_km_pct = (((current_avg_km - avg_km_total) / avg_km_total) * 100) if avg_km_total > 0 else 0.0
        delta_consumo_pct = (((media_consumo - avg_consumo_total) / avg_consumo_total) * 100) if avg_consumo_total > 0 else 0.0

        score_geral = calcular_score_operacional(df_turnos, df_laudos, benchmark=benchmark_kmpl)
    except Exception:
        total_turnos = total_km = total_litros = total_laudos = ativos_count = n_crit_global = 0
        media_consumo = score_geral = delta_km_pct = delta_consumo_pct = 0.0

    # ── CABECALHO ──
    col_title, col_status, col_score_mini = st.columns([3.5, 1.2, 1.3])
    with col_title:
        st.markdown(
            f"""
            <div class="fade-in-content" style="display:flex;align-items:center;">
                <div style="background:{CORS['ford_blue']};padding:8px 14px;border-radius:6px;border:1px solid {CORS['accent_blue']};margin-right:14px;">
                    <span style="color:#ffffff;font-weight:800;font-size:1.3rem;letter-spacing:0.5px;">Ford</span>
                </div>
                <div>
                    <h1 style="margin:0;padding:0;color:{CORS['light_text']};font-weight:800;font-size:1.9rem;letter-spacing:-1px;">VEV CONTROL ROOM</h1>
                    <p style="margin:0;padding:0;color:{CORS['gray_text']};font-size:0.85rem;font-weight:500;">Monitoramento Integrado de Performance — Proving Ground</p>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with col_status:
        st.markdown(
            f"""
            <div style="background:{CORS['card_bg']};border-radius:8px;border:1px solid {CORS['border_gray']};padding:10px 12px;text-align:right;">
                <span style="font-size:0.65rem;color:{CORS['gray_text']};text-transform:uppercase;font-weight:700;letter-spacing:0.8px;">Conexao</span>
                <div style="font-size:0.95rem;color:{CORS['green']};font-weight:800;display:flex;align-items:center;justify-content:flex-end;margin-top:3px;">
                    <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:{CORS['green']};margin-right:6px;"></span>
                    FIREBASE LIVE
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    with col_score_mini:
        cor_score = score_cor(score_geral)
        st.markdown(
            f"""
            <div style="background:{CORS['card_bg']};border-radius:8px;border:1px solid {CORS['border_gray']};padding:10px 12px;text-align:center;">
                <span style="font-size:0.65rem;color:{CORS['gray_text']};text-transform:uppercase;font-weight:700;letter-spacing:0.8px;">Score Operacional</span>
                <div style="font-family:'Share Tech Mono',monospace;font-size:1.6rem;color:{cor_score};font-weight:bold;margin-top:2px;">
                    {score_geral}<span style="font-size:0.9rem;color:{CORS['gray_text']};">/100</span>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown("<br>", unsafe_allow_html=True)

    # ── ALERTAS CRITICOS — VISIVEIS ACIMA DA DOBRA ──
    alertas_criticos = []
    alertas_avisos = []
    try:
        if not df_laudos_raw.empty and all(c in df_laudos_raw.columns for c in ["Severidade", "Veiculo", "VIN", "Descricao", "Data", "Operador"]):
            crit_laudos = df_laudos_raw[df_laudos_raw["Severidade"].str.lower().str.contains("crit", na=False)]
            for _, l in crit_laudos.head(3).iterrows():
                alertas_criticos.append(f"Falha CRITICA em {l['Veiculo']} (VIN: {l['VIN']}): \"{l['Descricao']}\" — {l['Operador']} | {l['Data']}")
    except Exception:
        pass
    try:
        if not df_turnos_total.empty and all(c in df_turnos_total.columns for c in ["Consumo Médio (km/l)", "Veiculo", "Operador"]):
            low_eff = df_turnos_total[(df_turnos_total["Consumo Médio (km/l)"] > 0) & (df_turnos_total["Consumo Médio (km/l)"] < meta_min_kmpl)]
            for _, t in low_eff.head(2).iterrows():
                alertas_avisos.append(f"Consumo critico: {t['Veiculo']} com {t['Consumo Médio (km/l)']:.2f} km/l — Piloto: {t['Operador']}")
    except Exception:
        pass
    try:
        if not df_ativos.empty and all(c in df_ativos.columns for c in ["Qtd Laudos Pendentes", "Operador", "Veiculo"]):
            pending = df_ativos[df_ativos["Qtd Laudos Pendentes"] > 2]
            for _, a in pending.iterrows():
                alertas_avisos.append(f"Piloto {a['Operador']} com {a['Qtd Laudos Pendentes']} laudos pendentes — {a['Veiculo']}")
    except Exception:
        pass

    if alertas_criticos or alertas_avisos:
        for msg in alertas_criticos[:2]:
            st.markdown(
                f'<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.4);border-left:4px solid {CORS["red"]};border-radius:6px;'
                f'padding:10px 14px;margin-bottom:6px;font-size:0.84rem;color:{CORS["light_text"]};">'
                f'<span style="color:{CORS["red"]};font-weight:800;text-transform:uppercase;font-size:0.7rem;letter-spacing:1px;">CRITICO</span> &nbsp; {msg}</div>',
                unsafe_allow_html=True,
            )
        for msg in alertas_avisos[:2]:
            st.markdown(
                f'<div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.3);border-left:4px solid {CORS["orange"]};border-radius:6px;'
                f'padding:10px 14px;margin-bottom:6px;font-size:0.84rem;color:{CORS["light_text"]};">'
                f'<span style="color:{CORS["orange"]};font-weight:800;text-transform:uppercase;font-size:0.7rem;letter-spacing:1px;">AVISO</span> &nbsp; {msg}</div>',
                unsafe_allow_html=True,
            )
        st.markdown("<br>", unsafe_allow_html=True)

    # ── KPI CARDS COM SPARKLINES ──
    spark_km, spark_lit, spark_cons = [], [], []
    if not df_turnos.empty and "Data" in df_turnos.columns:
        grupo = df_turnos.groupby("Data")
        if "Trip KM" in df_turnos.columns:
            spark_km = grupo["Trip KM"].sum().tolist()
        if "Litros" in df_turnos.columns:
            spark_lit = grupo["Litros"].sum().tolist()
        if "Consumo Médio (km/l)" in df_turnos.columns:
            spark_cons = grupo["Consumo Médio (km/l)"].mean().tolist()

    kpis = [
        {"label": "Turnos Concluidos", "value": str(total_turnos), "color": CORS["ford_blue"], "delta": f'<div class="kpi-delta delta-neutral">Total no filtro</div>', "spark": []},
        {"label": "Distancia Rodada", "value": f"{total_km:,.0f} km", "color": CORS["accent_blue"], "delta": get_delta_html(delta_km_pct), "spark": spark_km},
        {"label": "Combustivel Total", "value": f"{total_litros:,.0f} L", "color": CORS["green"], "delta": f'<div class="kpi-delta delta-neutral">Litros abastecidos</div>', "spark": spark_lit},
        {"label": "Consumo Medio", "value": f"{media_consumo:.2f} km/l", "color": CORS["purple"], "delta": get_delta_html(delta_consumo_pct), "spark": spark_cons},
        {"label": "Ocorrencias Mec.", "value": str(total_laudos), "color": CORS["orange"], "delta": f'<div class="kpi-delta delta-neutral">Laudos registrados</div>', "spark": []},
        {"label": "Pilotos na Pista", "value": str(ativos_count), "color": CORS["neon_blue"], "delta": f'<div class="kpi-delta delta-neutral">Ativos agora</div>', "spark": []},
    ]

    cols = st.columns(len(kpis))
    for idx, card in enumerate(kpis):
        with cols[idx]:
            st.markdown(
                f'<div class="kpi-card" style="border-top-color:{card["color"]};">'
                f'<div><div class="kpi-label">{card["label"]}</div>'
                f'<div class="kpi-value">{card["value"]}</div></div>'
                f'{card["delta"]}'
                f'</div>',
                unsafe_allow_html=True,
            )
            if len(card["spark"]) >= 3:
                st.plotly_chart(sparkline_fig(card["spark"], card["color"]), use_container_width=True, config={"displayModeBar": False})

    st.markdown("<br>", unsafe_allow_html=True)

    # ── ABAS (7 abas otimizadas) ──
    TAB_LABELS = [
        "Centro de Comando",
        "Performance e Tendencias",
        "Monitoramento Ao Vivo",
        "Saude da Frota",
        "Combustivel",
        "Protocolos de Teste",
        "IA Advisor (Gemini)",
    ]
    tabs = st.tabs(TAB_LABELS)

    # ══════════════════════════════════════════════════════════════════
    # ABA 0: CENTRO DE COMANDO (EXECUTIVE SUMMARY)
    # Aplica: kpi-dashboard-design > Executive Summary Pattern
    #         data-storytelling > Hook / Conflict / Resolution
    #         grafana-dashboards > Critical Metrics -> Key Trends -> Details
    # ══════════════════════════════════════════════════════════════════
    with tabs[0]:
        st.markdown(f'<div class="section-header">Centro de Comando — Visao Executiva e Operacional</div>', unsafe_allow_html=True)

        # ── NORTE DA OPERACAO (North Star Metric) ──
        meta_km_semana = 60000.0
        n_pilotos_ativos_7d = 0
        km_semana = 0.0
        if not df_turnos_total.empty and "Data" in df_turnos_total.columns and "Trip KM" in df_turnos_total.columns:
            try:
                df_7d = df_turnos_total.copy()
                df_7d["Data_parsed"] = pd.to_datetime(df_7d["Data"], errors="coerce")
                limite = pd.Timestamp.now() - pd.Timedelta(days=7)
                df_7d = df_7d[df_7d["Data_parsed"] >= limite]
                km_semana = float(df_7d["Trip KM"].sum()) if not df_7d.empty else 0.0
                n_pilotos_ativos_7d = df_7d["Operador"].nunique() if "Operador" in df_7d.columns else 0
            except Exception:
                pass

        pct_meta = min((km_semana / meta_km_semana) * 100, 100) if meta_km_semana > 0 else 0
        cor_meta = CORS["green"] if pct_meta >= 80 else (CORS["orange"] if pct_meta >= 50 else CORS["red"])

        st.markdown(
            f"""
            <div style="background:{CORS['card_bg']};border:1px solid {CORS['border_gray']};border-top:3px solid {CORS['accent_blue']};
                border-radius:10px;padding:20px 24px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
                    <div>
                        <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:1.5px;color:{CORS['accent_blue']};font-weight:800;">
                            NORTE DA OPERACAO — KM RODADOS (ULTIMOS 7 DIAS)
                        </div>
                        <div style="font-family:'Share Tech Mono',monospace;font-size:2.6rem;font-weight:900;color:{cor_meta};margin-top:4px;line-height:1;">
                            {km_semana:,.0f} <span style="font-size:1rem;color:{CORS['gray_text']};font-weight:400;">km</span>
                        </div>
                        <div style="font-size:0.8rem;color:{CORS['gray_text']};margin-top:4px;">
                            Meta semanal: <b style="color:{CORS['light_text']};">{meta_km_semana:,.0f} km</b> &nbsp;|&nbsp; 
                            Pilotos ativos: <b style="color:{CORS['light_text']};">{n_pilotos_ativos_7d}</b>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.65rem;color:{CORS['gray_text']};text-transform:uppercase;font-weight:700;">Progresso vs Meta</div>
                        <div style="font-family:'Share Tech Mono',monospace;font-size:1.8rem;color:{cor_meta};font-weight:900;">{pct_meta:.0f}%</div>
                    </div>
                </div>
                <div style="background:{CORS['border_gray']};border-radius:4px;height:8px;overflow:hidden;">
                    <div style="width:{pct_meta:.0f}%;height:100%;background:{cor_meta};border-radius:4px;transition:width 0.5s;"></div>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        col_cmd1, col_cmd2, col_cmd3 = st.columns([1.3, 1.5, 2.2])

        # ── SCORE GAUGE ──
        with col_cmd1:
            st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Score da Operacao</div>', unsafe_allow_html=True)
            fig_gauge_score = go.Figure(go.Indicator(
                mode="gauge+number",
                value=score_geral,
                number={"font": {"family": "Share Tech Mono", "color": score_cor(score_geral), "size": 28}},
                gauge={
                    "axis": {"range": [0, 100], "tickcolor": CORS["gray_text"], "tickfont": {"size": 9}},
                    "bar": {"color": score_cor(score_geral), "thickness": 0.28},
                    "bgcolor": CORS["card_bg"],
                    "bordercolor": CORS["border_gray"],
                    "steps": [
                        {"range": [0, 50], "color": "rgba(239,68,68,0.1)"},
                        {"range": [50, 75], "color": "rgba(245,158,11,0.1)"},
                        {"range": [75, 100], "color": "rgba(16,185,129,0.1)"},
                    ],
                    "threshold": {"line": {"color": score_cor(score_geral), "width": 3}, "thickness": 0.75, "value": score_geral},
                },
                title={"text": "Score /100", "font": {"size": 11, "color": CORS["gray_text"], "family": "Outfit"}},
            ))
            fig_gauge_score.update_layout(
                paper_bgcolor="rgba(0,0,0,0)", font_color=CORS["light_text"],
                height=200, margin=dict(l=20, r=20, t=40, b=10),
            )
            st.plotly_chart(fig_gauge_score, use_container_width=True, config={"displayModeBar": False})
            desc_score = "Operacao saudavel" if score_geral >= 75 else ("Atencao necessaria" if score_geral >= 50 else "Intervencao critica")
            st.markdown(
                f'<div style="text-align:center;font-size:0.78rem;color:{score_cor(score_geral)};font-weight:700;margin-top:-10px;">{desc_score}</div>',
                unsafe_allow_html=True,
            )

        # ── SEMAFORO DE INDICADORES ──
        with col_cmd2:
            st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Status dos Indicadores</div>', unsafe_allow_html=True)

            if media_consumo >= benchmark_kmpl:
                cor_consumo, lbl_consumo = "verde", f"{media_consumo:.2f} km/l"
            elif media_consumo >= meta_min_kmpl:
                cor_consumo, lbl_consumo = "amarelo", f"{media_consumo:.2f} km/l"
            else:
                cor_consumo, lbl_consumo = "vermelho", f"{media_consumo:.2f} km/l — CRITICO"

            n_crit_f = 0
            if not df_laudos.empty and "Severidade" in df_laudos.columns:
                n_crit_f = int(df_laudos["Severidade"].str.lower().str.contains("crit", na=False).sum())
            cor_crit = "verde" if n_crit_f == 0 else ("amarelo" if n_crit_f <= 2 else "vermelho")
            cor_ativos = "verde" if ativos_count > 0 else "amarelo"

            indicadores = [
                ("verde" if total_turnos > 0 else "amarelo", "Turnos Concluidos", str(total_turnos)),
                (cor_consumo, "Eficiencia de Combustivel", lbl_consumo),
                (cor_crit, "Ocorrencias Criticas", str(n_crit_f)),
                (cor_ativos, "Pilotos na Pista", str(ativos_count)),
                ("verde" if pct_meta >= 80 else ("amarelo" if pct_meta >= 50 else "vermelho"), "Meta KM Semanal", f"{pct_meta:.0f}%"),
            ]
            for cor, label, valor in indicadores:
                st.markdown(semaforo_html(cor, label, valor), unsafe_allow_html=True)

        # ── FUNIL OPERACIONAL ──
        with col_cmd3:
            st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Funil Operacional da Frota</div>', unsafe_allow_html=True)

            n_turnos_total_bruto = len(df_turnos_total) if not df_turnos_total.empty else 0
            n_concluidos = total_turnos
            n_com_laudos = total_laudos
            n_criticos_funil = n_crit_global

            funil_stages = [
                ("Total de Turnos Registrados", n_turnos_total_bruto, CORS["ford_blue"]),
                ("Turnos no Periodo Filtrado", n_concluidos, CORS["accent_blue"]),
                ("Turnos com Laudos de Ocorrencia", n_com_laudos, CORS["orange"]),
                ("Ocorrencias de Severidade Critica", n_criticos_funil, CORS["red"]),
            ]

            base = max(n_turnos_total_bruto, 1)
            for i, (label, valor, cor) in enumerate(funil_stages):
                pct = (valor / base) * 100 if base > 0 else 0
                bar_w = max(pct, 3)
                pct_label = f"{pct:.0f}%" if i > 0 else "100%"
                st.markdown(
                    f'<div style="margin-bottom:10px;">'
                    f'<div style="display:flex;justify-content:space-between;font-size:0.72rem;color:{CORS["gray_text"]};margin-bottom:4px;">'
                    f'<span>{label}</span><span style="font-family:\'Share Tech Mono\',monospace;color:{CORS["light_text"]};font-weight:700;">{valor} &nbsp; ({pct_label})</span>'
                    f'</div>'
                    f'<div style="background:{CORS["border_gray"]};border-radius:4px;height:22px;overflow:hidden;">'
                    f'<div style="width:{bar_w:.0f}%;height:100%;background:{cor};border-radius:4px;display:flex;align-items:center;padding-left:8px;">'
                    f'</div></div></div>',
                    unsafe_allow_html=True,
                )

            if n_turnos_total_bruto > 0 and n_criticos_funil > 0:
                taxa_critica = (n_criticos_funil / n_turnos_total_bruto) * 100
                msg_funil = f"Taxa de ocorrencias criticas: <b style='color:{CORS['red']};'>{taxa_critica:.1f}%</b> dos turnos registraram falha critica."
                st.markdown(
                    f'<div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:6px;padding:8px 12px;margin-top:6px;font-size:0.78rem;color:{CORS["light_text"]};">'
                    f'{msg_funil}</div>',
                    unsafe_allow_html=True,
                )

        st.markdown("<br>", unsafe_allow_html=True)

        # ── DESTAQUES DE PERFORMANCE ──
        st.markdown(f'<div class="section-header">Destaques de Performance — Periodo Selecionado</div>', unsafe_allow_html=True)
        top_cols = st.columns(4)

        if not df_turnos.empty and "Operador" in df_turnos.columns and "Consumo Médio (km/l)" in df_turnos.columns:
            ef_grupo = df_turnos[df_turnos["Consumo Médio (km/l)"] > 0].groupby("Operador")["Consumo Médio (km/l)"].mean()
            if not ef_grupo.empty:
                best_op = ef_grupo.idxmax(); best_ef = ef_grupo.max()
                top_cols[0].markdown(
                    f'<div class="top-card"><div class="top-title">Piloto Mais Eficiente</div>'
                    f'<div class="top-value">{best_op}</div>'
                    f'<div class="top-sub">{best_ef:.2f} km/l</div></div>',
                    unsafe_allow_html=True,
                )

        if not df_turnos.empty and "Veiculo" in df_turnos.columns and "Trip KM" in df_turnos.columns:
            km_grupo = df_turnos.groupby("Veiculo")["Trip KM"].sum()
            if not km_grupo.empty:
                best_vei = km_grupo.idxmax(); best_km = km_grupo.max()
                top_cols[1].markdown(
                    f'<div class="top-card"><div class="top-title">Veiculo Mais Rodado</div>'
                    f'<div class="top-value">{best_vei}</div>'
                    f'<div class="top-sub">{best_km:,.0f} km</div></div>',
                    unsafe_allow_html=True,
                )

        if not df_sessoes.empty and "Projeto" in df_sessoes.columns:
            proj_cnt = df_sessoes["Projeto"].value_counts()
            if not proj_cnt.empty:
                best_proj = proj_cnt.idxmax(); best_proj_n = proj_cnt.max()
                top_cols[2].markdown(
                    f'<div class="top-card"><div class="top-title">Projeto Mais Ativo</div>'
                    f'<div class="top-value">{best_proj}</div>'
                    f'<div class="top-sub">{best_proj_n} sessoes</div></div>',
                    unsafe_allow_html=True,
                )

        total_gasto = df_turnos["Valor Pago (R$)"].sum() if not df_turnos.empty and "Valor Pago (R$)" in df_turnos.columns else 0
        top_cols[3].markdown(
            f'<div class="top-card"><div class="top-title">Custo Total Combustivel</div>'
            f'<div class="top-value">R$ {total_gasto:,.2f}</div>'
            f'<div class="top-sub">Periodo filtrado</div></div>',
            unsafe_allow_html=True,
        )

        st.markdown("<br>", unsafe_allow_html=True)

        # ── STORYTELLING NARRATIVO ──
        story_data = gerar_storytelling(df_turnos, df_laudos, df_ativos, benchmark_kmpl, meta_min_kmpl)
        st.markdown(
            f"""
            <div style="background:{CORS['card_bg2']}; border: 1px solid {CORS['border_gray']}; border-left: 4px solid {CORS['accent_blue']}; border-radius: 8px; padding: 1.2rem 1.5rem; margin-bottom: 16px;">
                <h4 style="margin:0 0 12px 0; font-size:1.0rem; color:{CORS['neon_blue']}; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">
                    Narrativa Operacional — Periodo Selecionado
                </h4>
                <div style="font-size:0.88rem; line-height:1.7; color:{CORS['light_text']};">
                    <p style="margin-bottom:10px;"><b style="color:{CORS['gray_text']};text-transform:uppercase;font-size:0.7rem;letter-spacing:0.8px;">Contexto:</b><br>{story_data['hook']}</p>
                    <p style="margin-bottom:10px;"><b style="color:{CORS['gray_text']};text-transform:uppercase;font-size:0.7rem;letter-spacing:0.8px;">Desvios Detectados:</b><br>{story_data['conflict']}</p>
                    <p style="margin-bottom:0;"><b style="color:{CORS['gray_text']};text-transform:uppercase;font-size:0.7rem;letter-spacing:0.8px;">Acoes Recomendadas:</b><br>{story_data['resolution']}</p>
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        # ── EVOLUCAO KM DIARIA + DONUT PROJETOS ──
        col_ger1, col_ger2 = st.columns([2.5, 1.5])
        with col_ger1:
            if not df_turnos.empty and "Data" in df_turnos.columns and "Trip KM" in df_turnos.columns:
                st.markdown(f'<div class="section-header">Evolucao de Quilometragem Diaria</div>', unsafe_allow_html=True)
                turnos_dia = df_turnos.groupby("Data").agg({"Trip KM": "sum", "Operador": "count"}).reset_index()
                turnos_dia.columns = ["Data", "KM Total", "Turnos"]
                fig_ger = go.Figure()
                fig_ger.add_trace(go.Bar(x=turnos_dia["Data"], y=turnos_dia["KM Total"], name="KM Rodado",
                    marker=dict(color=CORS["accent_blue"], opacity=0.8)))
                fig_ger.add_trace(go.Scatter(x=turnos_dia["Data"], y=turnos_dia["KM Total"].rolling(3, min_periods=1).mean(),
                    name="Media Movel 3d", line=dict(color=CORS["neon_blue"], width=2, dash="dot"), mode="lines"))
                fig_ger.add_hline(y=benchmark_kmpl * 10, line_dash="dash", line_color=CORS["green"],
                    annotation_text=f"Referencia", annotation_font_color=CORS["green"], annotation_position="top right")
                fig_ger.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    font_color=CORS["light_text"], legend=dict(bgcolor="rgba(0,0,0,0)", orientation="h", y=1.05),
                    xaxis=dict(gridcolor="#1e293b"), yaxis=dict(gridcolor="#1e293b", title="Quilometragem (km)"),
                    margin=dict(l=10, r=10, t=30, b=10), height=260)
                st.plotly_chart(fig_ger, use_container_width=True)

        with col_ger2:
            if not df_turnos.empty and "Projeto" in df_turnos.columns and "Trip KM" in df_turnos.columns:
                st.markdown(f'<div class="section-header">KM por Projeto</div>', unsafe_allow_html=True)
                proj_km = df_turnos.groupby("Projeto")["Trip KM"].sum().reset_index()
                proj_km = proj_km[proj_km["Projeto"].notna() & (proj_km["Projeto"] != "")]
                if not proj_km.empty:
                    cores_proj = [CORS["accent_blue"], CORS["green"], CORS["purple"], CORS["orange"], CORS["neon_blue"]]
                    fig_donut = go.Figure(go.Pie(
                        labels=proj_km["Projeto"], values=proj_km["Trip KM"], hole=0.55,
                        marker=dict(colors=cores_proj * (len(proj_km) // len(cores_proj) + 1)),
                        textinfo="label+percent", textfont=dict(size=10, family="Outfit"),
                        hovertemplate="<b>%{label}</b><br>%{value:,.0f} km<br>%{percent}<extra></extra>",
                    ))
                    fig_donut.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)", font_color=CORS["light_text"],
                        margin=dict(l=5, r=5, t=10, b=10), height=260, showlegend=False,
                        annotations=[dict(text=f"<b>{len(proj_km)}</b><br>projetos", x=0.5, y=0.5,
                            font_size=12, font_color=CORS["light_text"], showarrow=False, align="center")],
                    )
                    st.plotly_chart(fig_donut, use_container_width=True)

    # ══════════════════════════════════════════════════════════════════
    # ABA 1: PERFORMANCE E TENDENCIAS
    # Aplica: kpi-dashboard-design > KPI Hierarchy + Trend Analysis
    #         plotly > Heatmaps, Radar, Trend with annotation
    #         analytics-product > Cohort-style analysis
    # ══════════════════════════════════════════════════════════════════
    with tabs[1]:
        st.markdown(f'<div class="section-header">Performance e Tendencias — Analise Aprofundada</div>', unsafe_allow_html=True)

        # ── HEATMAP DE ATIVIDADE POR DIA DA SEMANA ──
        st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Heatmap de Atividade — Turnos por Dia da Semana x Semana do Ano</div>', unsafe_allow_html=True)
        if not df_turnos.empty and "Data" in df_turnos.columns:
            try:
                df_heat_act = df_turnos.copy()
                df_heat_act["Data_parsed"] = pd.to_datetime(df_heat_act["Data"], errors="coerce")
                df_heat_act = df_heat_act.dropna(subset=["Data_parsed"])
                df_heat_act["DiaSemana"] = df_heat_act["Data_parsed"].dt.day_name()
                df_heat_act["Semana"] = df_heat_act["Data_parsed"].dt.isocalendar().week.astype(str)
                dias_ordem = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                dias_br = {"Monday": "Seg", "Tuesday": "Ter", "Wednesday": "Qua", "Thursday": "Qui", "Friday": "Sex", "Saturday": "Sab", "Sunday": "Dom"}
                df_heat_act["DiaSemana"] = df_heat_act["DiaSemana"].map(dias_br)
                dias_br_ordem = [dias_br[d] for d in dias_ordem]
                heat_pivot = df_heat_act.groupby(["DiaSemana", "Semana"]).size().reset_index(name="Turnos")
                heat_pivot_wide = heat_pivot.pivot_table(index="DiaSemana", columns="Semana", values="Turnos", fill_value=0)
                heat_pivot_wide = heat_pivot_wide.reindex([d for d in dias_br_ordem if d in heat_pivot_wide.index])
                if not heat_pivot_wide.empty:
                    fig_heat_act = go.Figure(data=go.Heatmap(
                        z=heat_pivot_wide.values,
                        x=[f"Sem {s}" for s in heat_pivot_wide.columns],
                        y=heat_pivot_wide.index,
                        colorscale=[[0, "rgba(0,0,0,0)"], [0.01, CORS["ford_blue"]], [0.5, CORS["accent_blue"]], [1, CORS["neon_blue"]]],
                        text=heat_pivot_wide.values,
                        texttemplate="%{text}",
                        textfont={"size": 10, "color": "white", "family": "Share Tech Mono"},
                        hovertemplate="<b>%{y}</b> — %{x}<br>Turnos: <b>%{z}</b><extra></extra>",
                        colorbar=dict(title="Turnos", tickfont=dict(color=CORS["gray_text"], size=10)),
                    ))
                    fig_heat_act.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                        font_color=CORS["light_text"], margin=dict(l=10, r=10, t=10, b=10), height=240,
                        xaxis=dict(side="bottom", tickfont=dict(size=9)),
                        yaxis=dict(tickfont=dict(size=10)),
                    )
                    st.plotly_chart(fig_heat_act, use_container_width=True)
            except Exception:
                st.info("Dados insuficientes para o heatmap de atividade.")
        else:
            st.info("Sem dados de data para o heatmap.")

        col_p1, col_p2 = st.columns(2)

        # ── TENDENCIA DE CONSUMO COM REGRESSAO ──
        with col_p1:
            st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Tendencia de Consumo (Regressao Linear)</div>', unsafe_allow_html=True)
            if not df_turnos.empty and all(c in df_turnos.columns for c in ["Data", "Consumo Médio (km/l)"]):
                ct_data = df_turnos[df_turnos["Consumo Médio (km/l)"] > 0].copy()
                ct_data["Data_parsed"] = pd.to_datetime(ct_data["Data"], errors="coerce")
                ct_data = ct_data.dropna(subset=["Data_parsed"]).sort_values("Data_parsed")
                ct_grouped = ct_data.groupby("Data_parsed")["Consumo Médio (km/l)"].mean().reset_index()
                if len(ct_grouped) >= 3:
                    x_num = np.arange(len(ct_grouped))
                    y_vals = ct_grouped["Consumo Médio (km/l)"].values
                    slope, intercept, r2 = linear_trend(x_num, y_vals)
                    trend_line = intercept + slope * x_num
                    tendencia_dir = "crescente" if slope > 0.01 else ("decrescente" if slope < -0.01 else "estavel")
                    fig_trend = go.Figure()
                    fig_trend.add_trace(go.Scatter(
                        x=ct_grouped["Data_parsed"], y=ct_grouped["Consumo Médio (km/l)"],
                        mode="markers+lines", name="Consumo Diario",
                        line=dict(color=CORS["accent_blue"], width=1.5), marker=dict(size=5),
                    ))
                    fig_trend.add_trace(go.Scatter(
                        x=ct_grouped["Data_parsed"], y=trend_line,
                        mode="lines", name=f"Tendencia ({tendencia_dir})",
                        line=dict(color=CORS["orange"], width=2, dash="dash"),
                    ))
                    fig_trend.add_hline(y=benchmark_kmpl, line_dash="dot", line_color=CORS["green"],
                        annotation_text=f"Meta {benchmark_kmpl} km/l", annotation_font_color=CORS["green"],
                        annotation_position="top right")
                    fig_trend.add_hline(y=meta_min_kmpl, line_dash="dot", line_color=CORS["red"],
                        annotation_text=f"Critico {meta_min_kmpl} km/l", annotation_font_color=CORS["red"],
                        annotation_position="bottom right")
                    fig_trend.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                        font_color=CORS["light_text"], xaxis=dict(gridcolor="#1e293b"),
                        yaxis=dict(gridcolor="#1e293b", title="km/l"),
                        legend=dict(bgcolor="rgba(0,0,0,0)", orientation="h", y=1.1, font=dict(size=10)),
                        margin=dict(l=10, r=10, t=30, b=10), height=260,
                        annotations=[dict(x=0.02, y=0.95, xref="paper", yref="paper",
                            text=f"R² = {r2:.3f} | Tendencia: {tendencia_dir}",
                            showarrow=False, font=dict(size=10, color=CORS["gray_text"]), align="left")],
                    )
                    st.plotly_chart(fig_trend, use_container_width=True)
                else:
                    st.info("Dados insuficientes para calcular tendencia.")
            else:
                st.info("Sem dados de consumo para analise.")

        # ── MATRIZ HEATMAP: PILOTO x VEICULO ──
        with col_p2:
            st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Matriz de Rodagem — Piloto x Veiculo (KM)</div>', unsafe_allow_html=True)
            if not df_turnos.empty and all(c in df_turnos.columns for c in ["Operador", "Veiculo", "Trip KM"]):
                pivot_df = df_turnos.pivot_table(index="Operador", columns="Veiculo", values="Trip KM", aggfunc="sum").fillna(0)
                if not pivot_df.empty:
                    fig_heat = go.Figure(data=go.Heatmap(
                        z=pivot_df.values, x=pivot_df.columns, y=pivot_df.index,
                        colorscale=[[0, CORS["dark_bg"]], [0.5, CORS["ford_blue"]], [1, CORS["neon_blue"]]],
                        text=pivot_df.values, texttemplate="%{text:.0f} km",
                        textfont={"size": 10, "family": "Share Tech Mono"},
                        hovertemplate="<b>%{y}</b><br>%{x}: %{z:.0f} km<extra></extra>",
                    ))
                    fig_heat.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                        font_color=CORS["light_text"], margin=dict(l=10, r=10, t=10, b=10), height=260,
                    )
                    st.plotly_chart(fig_heat, use_container_width=True)
            else:
                st.info("Dados insuficientes para a matriz.")

        # ── RANKING DE PILOTOS COM PROGRESSBARS ──
        st.markdown(f'<div class="section-header">Ranking de Pilotos — Performance Comparativa</div>', unsafe_allow_html=True)
        if not df_turnos.empty and "Operador" in df_turnos.columns:
            pilotos_lista = df_turnos["Operador"].dropna().unique().tolist()
            ranking_rows = []
            for piloto in pilotos_lista:
                df_p = df_turnos[df_turnos["Operador"] == piloto]
                df_p_laudos = df_laudos[df_laudos["Operador"] == piloto] if not df_laudos.empty and "Operador" in df_laudos.columns else pd.DataFrame()
                sc = calcular_score_piloto(df_p, df_p_laudos, benchmark=benchmark_kmpl)
                km_total = df_p["Trip KM"].sum() if "Trip KM" in df_p.columns else 0
                consumo_medio = df_p[df_p["Consumo Médio (km/l)"] > 0]["Consumo Médio (km/l)"].mean() if "Consumo Médio (km/l)" in df_p.columns and (df_p["Consumo Médio (km/l)"] > 0).any() else 0
                ranking_rows.append({"Piloto": piloto, "Score": sc, "KM Total": round(km_total, 0), "Consumo Medio (km/l)": round(consumo_medio, 2), "Turnos": len(df_p), "Ocorrencias": len(df_p_laudos)})

            df_ranking = pd.DataFrame(ranking_rows).sort_values("Score", ascending=False).reset_index(drop=True)
            col_rank, col_radar = st.columns([1.5, 2])

            with col_rank:
                for idx, row in df_ranking.iterrows():
                    posicao = idx + 1
                    if posicao == 1: medal_html = f'<span style="color:{CORS["gold"]};font-weight:900;">1</span>'
                    elif posicao == 2: medal_html = f'<span style="color:{CORS["silver"]};font-weight:900;">2</span>'
                    elif posicao == 3: medal_html = f'<span style="color:{CORS["bronze"]};font-weight:900;">3</span>'
                    else: medal_html = f'<span style="color:{CORS["gray_text"]};">{posicao}</span>'
                    sc_color = score_cor(row["Score"])
                    bar_w = min(row["Score"], 100)
                    st.markdown(
                        f'<div class="rank-row">'
                        f'<div class="rank-medal">{medal_html}</div>'
                        f'<div style="flex:1;">'
                        f'<div style="display:flex;justify-content:space-between;margin-bottom:3px;">'
                        f'<span class="rank-name">{row["Piloto"]}</span>'
                        f'<span class="rank-score" style="color:{sc_color};">{row["Score"]}</span>'
                        f'</div>'
                        f'<div style="background:{CORS["border_gray"]};border-radius:3px;height:5px;">'
                        f'<div style="width:{bar_w}%;height:100%;background:{sc_color};border-radius:3px;"></div>'
                        f'</div>'
                        f'<div style="font-size:0.68rem;color:{CORS["gray_text"]};margin-top:2px;">'
                        f'{row["Turnos"]} turnos | {row["KM Total"]:.0f} km | {row["Consumo Medio (km/l)"]:.2f} km/l'
                        f'</div></div></div>',
                        unsafe_allow_html=True,
                    )

            with col_radar:
                df_top5 = df_ranking.head(5)
                if len(df_top5) >= 2:
                    categorias = ["Score", "KM Total", "Consumo Medio (km/l)", "Turnos"]
                    df_norm = df_top5[categorias].copy()
                    for col_r in categorias:
                        col_max = df_norm[col_r].max()
                        if col_max > 0:
                            df_norm[col_r] = (df_norm[col_r] / col_max) * 100
                    fig_radar = go.Figure()
                    colors_radar = [CORS["accent_blue"], CORS["green"], CORS["orange"], CORS["purple"], CORS["neon_blue"]]
                    for i, row in df_top5.iterrows():
                        vals = df_norm.loc[i, categorias].tolist()
                        vals += [vals[0]]
                        fig_radar.add_trace(go.Scatterpolar(
                            r=vals, theta=categorias + [categorias[0]], fill="toself",
                            fillcolor=f"rgba({int(colors_radar[i % 5][1:3],16)},{int(colors_radar[i % 5][3:5],16)},{int(colors_radar[i % 5][5:7],16)},0.1)",
                            line=dict(color=colors_radar[i % 5], width=2), name=row["Piloto"],
                        ))
                    fig_radar.update_layout(
                        polar=dict(bgcolor="rgba(0,0,0,0)",
                            radialaxis=dict(visible=True, range=[0, 100], gridcolor="#1e293b", tickfont=dict(size=8)),
                            angularaxis=dict(gridcolor="#1e293b")),
                        paper_bgcolor="rgba(0,0,0,0)", font_color=CORS["light_text"],
                        legend=dict(bgcolor="rgba(0,0,0,0)", orientation="h", y=-0.15, font=dict(size=10)),
                        margin=dict(l=40, r=40, t=20, b=40), height=340,
                    )
                    st.plotly_chart(fig_radar, use_container_width=True)

            st.markdown("<br>", unsafe_allow_html=True)

            # ── EFICIENCIA POR PILOTO (barras coloridas por threshold) ──
            st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Eficiencia de Combustivel por Piloto (km/l)</div>', unsafe_allow_html=True)
            if not df_turnos.empty and all(c in df_turnos.columns for c in ["Operador", "Consumo Médio (km/l)"]):
                ef_piloto = (df_turnos[df_turnos["Consumo Médio (km/l)"] > 0]
                    .groupby("Operador")["Consumo Médio (km/l)"].mean()
                    .reset_index().sort_values("Consumo Médio (km/l)", ascending=True))
                if not ef_piloto.empty:
                    colors_bar = [
                        CORS["green"] if v >= benchmark_kmpl else (CORS["orange"] if v >= meta_min_kmpl else CORS["red"])
                        for v in ef_piloto["Consumo Médio (km/l)"]
                    ]
                    fig_ef = go.Figure(go.Bar(
                        x=ef_piloto["Consumo Médio (km/l)"], y=ef_piloto["Operador"], orientation="h",
                        marker_color=colors_bar,
                        text=ef_piloto["Consumo Médio (km/l)"].round(2),
                        texttemplate="%{text} km/l", textfont=dict(size=10),
                    ))
                    fig_ef.add_vline(x=benchmark_kmpl, line_dash="dash", line_color=CORS["green"],
                        annotation_text=f"Meta: {benchmark_kmpl} km/l", annotation_font_color=CORS["green"],
                        annotation_position="top right")
                    fig_ef.add_vline(x=meta_min_kmpl, line_dash="dot", line_color=CORS["red"],
                        annotation_text=f"Critico: {meta_min_kmpl} km/l", annotation_font_color=CORS["red"],
                        annotation_position="bottom right")
                    fig_ef.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                        font_color=CORS["light_text"], xaxis=dict(gridcolor="#1e293b"),
                        margin=dict(l=10, r=10, t=10, b=10), height=max(200, len(ef_piloto) * 32),
                    )
                    st.plotly_chart(fig_ef, use_container_width=True)

            # ── CORRELACAO KM vs OCORRENCIAS ──
            st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Correlacao: KM Rodado vs Ocorrencias por Piloto</div>', unsafe_allow_html=True)
            if not df_turnos.empty and all(c in df_turnos.columns for c in ["Trip KM", "Total Ocorrencias", "Operador"]):
                corr_data = df_turnos[["Trip KM", "Total Ocorrencias", "Operador"]].dropna()
                corr_data = corr_data[(corr_data["Trip KM"] > 0) & (corr_data["Total Ocorrencias"] >= 0)]
                if len(corr_data) >= 2:
                    x_corr = corr_data["Trip KM"].values
                    y_corr = corr_data["Total Ocorrencias"].values
                    slope_c, intercept_c, _ = linear_trend(x_corr, y_corr)
                    x_line = np.linspace(x_corr.min(), x_corr.max(), 100)
                    y_line = intercept_c + slope_c * x_line
                    colors_corr = [CORS["accent_blue"], CORS["green"], CORS["orange"], CORS["purple"], CORS["neon_blue"]]
                    operadores_unicos = corr_data["Operador"].unique().tolist()
                    cor_map = {op: colors_corr[i % len(colors_corr)] for i, op in enumerate(operadores_unicos)}
                    fig_corr = go.Figure()
                    for op in operadores_unicos:
                        df_op = corr_data[corr_data["Operador"] == op]
                        fig_corr.add_trace(go.Scatter(
                            x=df_op["Trip KM"], y=df_op["Total Ocorrencias"],
                            mode="markers", name=op,
                            marker=dict(color=cor_map[op], size=8, opacity=0.85),
                        ))
                    dir_corr = "crescente" if slope_c > 0 else "decrescente"
                    fig_corr.add_trace(go.Scatter(
                        x=x_line, y=y_line, mode="lines",
                        name=f"Tendencia ({dir_corr})",
                        line=dict(color=CORS["orange"], width=2, dash="dash"),
                    ))
                    fig_corr.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                        font_color=CORS["light_text"],
                        xaxis=dict(gridcolor="#1e293b", title="KM Rodado no Turno"),
                        yaxis=dict(gridcolor="#1e293b", title="Ocorrencias"),
                        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(size=9)),
                        margin=dict(l=10, r=10, t=10, b=10), height=260,
                    )
                    st.plotly_chart(fig_corr, use_container_width=True)
        else:
            st.info("Dados insuficientes para analise de performance.")

        # ── DISTRIBUICAO DE DURACAO DOS TURNOS ──
        st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Distribuicao de Duracao dos Turnos</div>', unsafe_allow_html=True)
        if not df_turnos.empty and "Duração (min)" in df_turnos.columns:
            dur_vals = pd.to_numeric(df_turnos["Duração (min)"], errors="coerce").dropna()
            dur_vals = dur_vals[dur_vals > 0]
            if len(dur_vals) >= 3:
                fig_hist = px.histogram(dur_vals, nbins=20,
                    labels={"value": "Duracao (min)", "count": "Turnos"},
                    color_discrete_sequence=[CORS["purple"]])
                fig_hist.add_vline(x=dur_vals.mean(), line_dash="dash", line_color=CORS["neon_blue"],
                    annotation_text=f"Media: {dur_vals.mean():.0f} min",
                    annotation_font_color=CORS["neon_blue"])
                fig_hist.update_layout(
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    font_color=CORS["light_text"],
                    xaxis=dict(gridcolor="#1e293b"), yaxis=dict(gridcolor="#1e293b", title="Quantidade de Turnos"),
                    margin=dict(l=10, r=10, t=10, b=10), height=200, showlegend=False,
                )
                st.plotly_chart(fig_hist, use_container_width=True)
            else:
                st.info("Dados insuficientes para o histograma.")

    # ══════════════════════════════════════════════════════════════════
    # ABA 2: MONITORAMENTO AO VIVO
    # ══════════════════════════════════════════════════════════════════
    with tabs[2]:
        st.markdown(f'<div class="section-header">Monitoramento Ao Vivo — Pilotos em Atividade</div>', unsafe_allow_html=True)

        n_ativos = len(df_ativos) if not df_ativos.empty else 0
        col_live_s1, col_live_s2, col_live_s3 = st.columns(3)
        cor_n = CORS["green"] if n_ativos > 0 else CORS["gray_text"]
        col_live_s1.markdown(
            f'<div class="stat-box"><div class="stat-label">Pilotos Trabalhando Agora</div>'
            f'<div class="stat-val" style="color:{cor_n};">{n_ativos}</div></div>',
            unsafe_allow_html=True,
        )
        h_mais_recente = df_ativos["Hora Inicio"].iloc[-1] if not df_ativos.empty and "Hora Inicio" in df_ativos.columns and len(df_ativos) > 0 else "—"
        col_live_s2.markdown(
            f'<div class="stat-box"><div class="stat-label">Ultimo Inicio de Turno</div>'
            f'<div class="stat-val">{h_mais_recente}</div></div>',
            unsafe_allow_html=True,
        )
        total_litros_live = float(df_ativos["Total Litros"].sum()) if not df_ativos.empty and "Total Litros" in df_ativos.columns else 0.0
        col_live_s3.markdown(
            f'<div class="stat-box"><div class="stat-label">Litros Abastecidos (Turnos Ativos)</div>'
            f'<div class="stat-val">{total_litros_live:.1f} L</div></div>',
            unsafe_allow_html=True,
        )
        st.markdown("<br>", unsafe_allow_html=True)

        if df_ativos.empty or "Operador" not in df_ativos.columns:
            st.markdown(
                f'<div style="background:{CORS["card_bg"]};padding:30px;border-radius:8px;text-align:center;border:1px solid {CORS["border_gray"]};color:{CORS["gray_text"]};font-size:0.9rem;">'
                f'Nenhum piloto com turno iniciado no momento.</div>',
                unsafe_allow_html=True,
            )
        else:
            for _, row in df_ativos.iterrows():
                hora_ini = row.get("Hora Inicio", "—"); km_ini = row.get("KM Inicial", 0)
                veiculo = row.get("Veiculo", "—"); vin = row.get("VIN", "—"); cc = row.get("CC", "—"); eja = row.get("EJA", "—")
                tipo = row.get("Tipo Teste", "—"); proj = row.get("Projeto", "—")
                litros = float(row.get("Total Litros", 0) or 0)
                n_abs = int(row.get("Qtd Abastecimentos", 0) or 0)
                n_laud = int(row.get("Qtd Laudos Pendentes", 0) or 0)
                cor_laud = CORS["orange"] if n_laud > 0 else CORS["green"]
                st.markdown(
                    f'<div class="piloto-card">'
                    f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
                    f'<strong style="font-size:1.05rem;color:{CORS["light_text"]}">{row["Operador"]}</strong>'
                    f'<span class="live-badge"><span class="live-dot"></span>TRABALHANDO</span>'
                    f'</div>'
                    f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:0.8rem;color:{CORS["gray_text"]};line-height:1.7;">'
                    f'<div>Veiculo: <strong style="color:{CORS["light_text"]}">{veiculo}</strong></div>'
                    f'<div>VIN: <strong style="color:{CORS["light_text"]}">{vin}</strong></div>'
                    f'<div>CC: {cc} &nbsp;|&nbsp; EJA: {eja}</div>'
                    f'<div>Protocolo: {tipo}</div>'
                    f'<div>Projeto: <strong style="color:{CORS["neon_blue"]}">{proj}</strong></div>'
                    f'<div>Inicio: <strong style="color:{CORS["light_text"]}">{hora_ini}</strong></div>'
                    f'<div>KM Inicial: <strong style="color:{CORS["light_text"]}">{km_ini}</strong></div>'
                    f'<div>Abastecimentos: <strong style="color:{CORS["light_text"]}">{n_abs} ({litros:.1f}L)</strong></div>'
                    f'<div>Laudos Pendentes: <strong style="color:{cor_laud}">{n_laud}</strong></div>'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )

    # ══════════════════════════════════════════════════════════════════
    # ABA 3: SAUDE DA FROTA
    # Aplica: grafana-dashboards > RED Method (Rate / Errors / Duration)
    #         kpi-dashboard-design > Waterfall / Heatmap patterns
    # ══════════════════════════════════════════════════════════════════
    with tabs[3]:
        st.markdown(f'<div class="section-header">Saude da Frota — Diagnosticos e Ocorrencias</div>', unsafe_allow_html=True)

        if df_laudos.empty:
            st.info("Nenhum defeito ou laudo mecanico registrado.")
        else:
            col_l1, col_l2, col_l3 = st.columns(3)

            with col_l1:
                st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Ocorrencias por Criticidade</div>', unsafe_allow_html=True)
                if "Severidade" in df_laudos.columns:
                    scnt = df_laudos["Severidade"].value_counts().reset_index()
                    scnt.columns = ["Severidade", "Quantidade"]
                    fig = px.pie(scnt, values="Quantidade", names="Severidade",
                        color="Severidade",
                        color_discrete_map={
                            "Critico": CORS["red"], "critico": CORS["red"],
                            "Moderado": CORS["orange"], "moderado": CORS["orange"],
                            "Leve": CORS["green"], "leve": CORS["green"],
                            "Nao Informado": CORS["gray_text"],
                        }, hole=0.4)
                    fig.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)", font_color=CORS["light_text"],
                        margin=dict(l=10, r=10, t=10, b=10), height=240,
                        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(size=10)),
                    )
                    st.plotly_chart(fig, use_container_width=True)

            with col_l2:
                st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Areas de Falha Recorrentes</div>', unsafe_allow_html=True)
                if "Categoria" in df_laudos.columns:
                    ccnt = df_laudos["Categoria"].value_counts().reset_index()
                    ccnt.columns = ["Categoria", "Qtd"]
                    fig = px.bar(ccnt, x="Qtd", y="Categoria", orientation="h",
                        color_discrete_sequence=[CORS["purple"]], labels={"Qtd": "Ocorrencias"})
                    fig.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                        font_color=CORS["light_text"],
                        margin=dict(l=10, r=10, t=10, b=10), height=240,
                        yaxis=dict(autorange="reversed"),
                    )
                    st.plotly_chart(fig, use_container_width=True)

            with col_l3:
                st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Incidencias por Veiculo</div>', unsafe_allow_html=True)
                if "Veiculo" in df_laudos.columns:
                    vcnt = df_laudos["Veiculo"].value_counts().reset_index()
                    vcnt.columns = ["Veiculo", "Qtd"]
                    colors_vcnt = [CORS["red"] if i == 0 else CORS["orange"] if i < 3 else CORS["gray_text"] for i in range(len(vcnt))]
                    fig = go.Figure(go.Bar(
                        x=vcnt["Qtd"], y=vcnt["Veiculo"], orientation="h",
                        marker_color=colors_vcnt,
                        text=vcnt["Qtd"], textposition="outside",
                    ))
                    fig.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                        font_color=CORS["light_text"],
                        margin=dict(l=10, r=10, t=10, b=10), height=240,
                        yaxis=dict(autorange="reversed"),
                    )
                    st.plotly_chart(fig, use_container_width=True)

            # ── HEATMAP DE LAUDOS: VEICULO x SEMANA ──
            st.markdown(f'<div class="section-header">Heatmap de Ocorrencias — Veiculo x Semana</div>', unsafe_allow_html=True)
            if not df_laudos.empty and all(c in df_laudos.columns for c in ["Veiculo", "Data"]):
                try:
                    df_h_laudos = df_laudos.copy()
                    df_h_laudos["Data_parsed"] = pd.to_datetime(df_h_laudos["Data"], errors="coerce")
                    df_h_laudos = df_h_laudos.dropna(subset=["Data_parsed"])
                    df_h_laudos["Semana"] = df_h_laudos["Data_parsed"].dt.isocalendar().week.astype(str)
                    laudo_heat = df_h_laudos.groupby(["Veiculo", "Semana"]).size().reset_index(name="Laudos")
                    laudo_heat_wide = laudo_heat.pivot_table(index="Veiculo", columns="Semana", values="Laudos", fill_value=0)
                    if not laudo_heat_wide.empty:
                        fig_lh = go.Figure(data=go.Heatmap(
                            z=laudo_heat_wide.values,
                            x=[f"Sem {s}" for s in laudo_heat_wide.columns],
                            y=laudo_heat_wide.index,
                            colorscale=[[0, "rgba(0,0,0,0)"], [0.01, "rgba(245,158,11,0.2)"], [0.5, CORS["orange"]], [1, CORS["red"]]],
                            text=laudo_heat_wide.values,
                            texttemplate="%{text}",
                            textfont={"size": 10, "family": "Share Tech Mono"},
                            hovertemplate="<b>%{y}</b> — %{x}<br>Laudos: <b>%{z}</b><extra></extra>",
                            colorbar=dict(title="Laudos", tickfont=dict(color=CORS["gray_text"], size=10)),
                        ))
                        fig_lh.update_layout(
                            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                            font_color=CORS["light_text"],
                            margin=dict(l=10, r=10, t=10, b=10), height=max(200, len(laudo_heat_wide) * 36),
                        )
                        st.plotly_chart(fig_lh, use_container_width=True)
                except Exception:
                    st.info("Dados insuficientes para o heatmap de laudos.")
            
            # ── OUTLIERS DE CONSUMO ──
            st.markdown(f'<div class="section-header">Turnos com Consumo Anomalo (Outliers — Metodo IQR)</div>', unsafe_allow_html=True)
            if not df_turnos.empty and "Consumo Médio (km/l)" in df_turnos.columns:
                consumo_series = df_turnos[df_turnos["Consumo Médio (km/l)"] > 0]["Consumo Médio (km/l)"]
                if len(consumo_series) >= 4:
                    Q1 = consumo_series.quantile(0.25); Q3 = consumo_series.quantile(0.75); IQR = Q3 - Q1
                    lower_fence = Q1 - 1.5 * IQR; upper_fence = Q3 + 1.5 * IQR
                    df_outliers = df_turnos[(df_turnos["Consumo Médio (km/l)"] > 0) & ((df_turnos["Consumo Médio (km/l)"] < lower_fence) | (df_turnos["Consumo Médio (km/l)"] > upper_fence))].copy()
                    col_stat1, col_stat2, col_stat3, col_stat4 = st.columns(4)
                    col_stat1.markdown(f'<div class="stat-box"><div class="stat-label">Outliers Detectados</div><div class="stat-val">{len(df_outliers)}</div></div>', unsafe_allow_html=True)
                    col_stat2.markdown(f'<div class="stat-box"><div class="stat-label">Media Global</div><div class="stat-val">{consumo_series.mean():.2f} km/l</div></div>', unsafe_allow_html=True)
                    col_stat3.markdown(f'<div class="stat-box"><div class="stat-label">Limite Inferior (IQR)</div><div class="stat-val">{lower_fence:.2f} km/l</div></div>', unsafe_allow_html=True)
                    col_stat4.markdown(f'<div class="stat-box"><div class="stat-label">Limite Superior (IQR)</div><div class="stat-val">{upper_fence:.2f} km/l</div></div>', unsafe_allow_html=True)
                    st.markdown("<br>", unsafe_allow_html=True)
                    if not df_outliers.empty:
                        out_cols = [c for c in ["Data", "Operador", "Veiculo", "VIN", "Consumo Médio (km/l)", "Trip KM", "Litros"] if c in df_outliers.columns]
                        for _, row in df_outliers[out_cols].head(10).iterrows():
                            cons_val = row.get("Consumo Médio (km/l)", 0)
                            tipo = "acima" if cons_val > upper_fence else "abaixo"
                            cor = CORS["orange"] if tipo == "acima" else CORS["red"]
                            st.markdown(
                                f'<div class="outlier-row"><span style="color:{cor};font-weight:700;">{cons_val:.2f} km/l ({tipo} do limite)</span>'
                                f' — {row.get("Data", "—")} | Piloto: {row.get("Operador", "—")} | Veiculo: {row.get("Veiculo", "—")}</div>',
                                unsafe_allow_html=True,
                            )
                    else:
                        st.success("Nenhum outlier de consumo detectado no periodo filtrado.")
                else:
                    st.info("Dados insuficientes para analise de outliers (minimo 4 registros).")

            # ── HISTORICO DE LAUDOS ──
            st.markdown(f'<div class="section-header">Historico de Laudos</div>', unsafe_allow_html=True)
            sev_filtro = st.selectbox("Filtrar por severidade:", ["Todos", "Critico", "Moderado", "Leve"], key="sev_filtro_laudos")
            df_laudos_show = df_laudos.copy()
            if sev_filtro != "Todos":
                df_laudos_show = df_laudos_show[df_laudos_show["Severidade"].str.lower().str.contains(sev_filtro.lower()[:4], na=False)]
            show_cols = [c for c in ["Data", "Veiculo", "VIN", "Operador", "Severidade", "Categoria", "Descricao"] if c in df_laudos_show.columns]
            df_laudos_show_sorted = df_laudos_show[show_cols].sort_values("Data", ascending=False) if "Data" in df_laudos_show.columns else df_laudos_show[show_cols]
            for _, l in df_laudos_show_sorted.head(30).iterrows():
                sev_val = str(l.get("Severidade", "")).lower()
                ticket_class = "critico" if "crit" in sev_val else ("moderado" if "mod" in sev_val else "leve")
                badge_html = fmt_badge(l.get("Severidade", "—"))
                st.markdown(
                    f'<div class="laudo-ticket {ticket_class}">'
                    f'<div class="laudo-meta">{l.get("Data", "—")} — {l.get("Veiculo", "—")} — VIN: {l.get("VIN", "—")} — Piloto: {l.get("Operador", "—")}</div>'
                    f'<div class="laudo-desc">{l.get("Descricao", "—")}</div>'
                    f'<div style="display:flex;gap:8px;align-items:center;">{badge_html}'
                    f'<span style="font-size:0.72rem;color:{CORS["gray_text"]};">Categoria: {l.get("Categoria", "—")}</span>'
                    f'</div></div>',
                    unsafe_allow_html=True,
                )
            if len(df_laudos_show_sorted) > 30:
                st.caption(f"Mostrando 30 de {len(df_laudos_show_sorted)} registros.")

        # ── CARDS DE VEICULOS ──
        st.markdown("<br>", unsafe_allow_html=True)
        st.markdown(f'<div class="section-header">Visao por Veiculo — Cards de Saude da Frota</div>', unsafe_allow_html=True)

        if not df_veiculos_db.empty:
            if filtro_veiculo != "Todos":
                veiculos_lista = df_veiculos_db[df_veiculos_db["nome"] == filtro_veiculo]["nome"].dropna().unique()
            else:
                veiculos_lista = df_veiculos_db["nome"].dropna().unique()
            if filtro_projeto != "Todos" and not df_projetos_db.empty:
                proj_id_sel = ""
                p_match = df_projetos_db[df_projetos_db["nome"] == filtro_projeto]
                if not p_match.empty:
                    proj_id_sel = p_match["id"].iloc[0]
                if proj_id_sel:
                    veiculos_filtrados = []
                    for _, v in df_veiculos_db.iterrows():
                        v_projs = v.get("projetosVinculados") or []
                        if proj_id_sel in v_projs:
                            veiculos_filtrados.append(v["nome"])
                        elif not df_turnos.empty and "Veiculo" in df_turnos.columns and "Projeto" in df_turnos.columns:
                            has_turns = not df_turnos[(df_turnos["Veiculo"] == v["nome"]) & (df_turnos["Projeto"] == filtro_projeto)].empty
                            if has_turns:
                                veiculos_filtrados.append(v["nome"])
                    veiculos_lista = list(set(veiculos_filtrados))
        else:
            if not df_turnos.empty and "Veiculo" in df_turnos.columns:
                veiculos_lista = df_turnos["Veiculo"].dropna().unique()
            else:
                veiculos_lista = []

        if len(veiculos_lista) == 0:
            st.info("Nenhum dado de veiculo disponivel para o filtro atual.")
        else:
            km_total_frota = df_turnos["Trip KM"].sum() if not df_turnos.empty and "Trip KM" in df_turnos.columns else 0
            col_ctrl1, col_ctrl2 = st.columns([2, 1.5])
            with col_ctrl1:
                search_vei = st.text_input("", placeholder="Buscar veiculo por nome ou VIN...", key="vei_search").strip().lower()
            with col_ctrl2:
                order_by = st.selectbox("Ordenar:", ["Nome (A-Z)", "KM (maior)", "Consumo (melhor)", "Ocorrencias (mais)"], key="vei_order")

            vei_data = []
            for veiculo in veiculos_lista:
                try:
                    df_v = df_turnos[df_turnos["Veiculo"] == veiculo] if not df_turnos.empty else pd.DataFrame()
                    v_db = df_veiculos_db[df_veiculos_db["nome"] == veiculo] if not df_veiculos_db.empty else pd.DataFrame()
                    if not v_db.empty:
                        vin = str(v_db["vin"].iloc[0]) if v_db["vin"].iloc[0] else ""
                        cc = str(v_db["cc"].iloc[0]) if v_db["cc"].iloc[0] else ""
                        eja = str(v_db["eja"].iloc[0]) if v_db["eja"].iloc[0] else ""
                        proj_ids = v_db["projetosVinculados"].iloc[0] or []
                        projetos = []
                        if not df_projetos_db.empty:
                            for pid in proj_ids:
                                p_nome = df_projetos_db[df_projetos_db["id"] == pid]["nome"].iloc[0] if not df_projetos_db[df_projetos_db["id"] == pid].empty else pid
                                projetos.append(p_nome)
                        else:
                            projetos = sorted(df_v["Projeto"].dropna().unique().tolist()) if not df_v.empty and "Projeto" in df_v.columns else []
                    else:
                        vin = str(df_v["VIN"].iloc[0]) if not df_v.empty and "VIN" in df_v.columns and not df_v["VIN"].isna().all() else ""
                        cc = str(df_v["CC"].iloc[0]) if not df_v.empty and "CC" in df_v.columns and not df_v["CC"].isna().all() else ""
                        eja = str(df_v["EJA"].iloc[0]) if not df_v.empty and "EJA" in df_v.columns and not df_v["EJA"].isna().all() else ""
                        projetos = sorted(df_v["Projeto"].dropna().unique().tolist()) if not df_v.empty and "Projeto" in df_v.columns else []

                    km_v = float(df_v["Trip KM"].sum()) if not df_v.empty and "Trip KM" in df_v.columns else 0
                    litros_v = float(df_v["Litros"].sum()) if not df_v.empty and "Litros" in df_v.columns else 0
                    consumo_v = (km_v / litros_v) if litros_v > 0 else 0.0
                    n_trips = len(df_v) if not df_v.empty else 0
                    pilotos_v = sorted(df_v["Operador"].dropna().unique().tolist()) if not df_v.empty and "Operador" in df_v.columns else []
                    tipo_teste = df_v["Tipo Teste"].mode().iloc[0] if not df_v.empty and "Tipo Teste" in df_v.columns and not df_v["Tipo Teste"].mode().empty else ""
                    tipo_comb_v = df_v["Tipo Combustivel"].mode().iloc[0] if not df_v.empty and "Tipo Combustivel" in df_v.columns and not df_v["Tipo Combustivel"].mode().empty else "—"
                    ultimo_turno = str(df_v["Data"].max()) if not df_v.empty and "Data" in df_v.columns else "Sem turnos"
                    data_min = str(df_v["Data"].min()) if not df_v.empty and "Data" in df_v.columns else "—"
                    data_max = str(df_v["Data"].max()) if not df_v.empty and "Data" in df_v.columns else "—"
                    n_laudos_v = 0; n_crit_v = 0; n_mod_v = 0; n_leve_v = 0
                    if not df_laudos.empty and "Veiculo" in df_laudos.columns:
                        df_lv = df_laudos[df_laudos["Veiculo"] == veiculo]
                        n_laudos_v = len(df_lv)
                        if "Severidade" in df_lv.columns:
                            n_crit_v = int(df_lv["Severidade"].str.lower().str.contains("crit", na=False).sum())
                            n_mod_v = int(df_lv["Severidade"].str.lower().str.contains("mod", na=False).sum())
                            n_leve_v = int(df_lv["Severidade"].str.lower().str.contains("lev", na=False).sum())
                    valor_gasto = float(df_v["Valor Pago (R$)"].sum()) if not df_v.empty and "Valor Pago (R$)" in df_v.columns else 0
                    spark_v = df_v.groupby("Data")["Trip KM"].sum().tolist() if not df_v.empty and "Data" in df_v.columns and "Trip KM" in df_v.columns else []
                    bench = st.session_state.get("benchmark_slider", 8.0)
                    meta_min = st.session_state.get("meta_min_slider", 5.0)
                    score_saude = 100.0
                    if n_trips > 0:
                        if consumo_v >= bench: score_saude -= 0
                        elif consumo_v >= meta_min: score_saude -= 20
                        else: score_saude -= 40
                        score_saude -= min(n_crit_v * 12, 36)
                        if km_v > 0 and n_trips > 0:
                            avg_km_trip = km_v / n_trips
                            if avg_km_trip < 10: score_saude -= 10
                    score_saude = max(0, min(100, score_saude))
                    vei_data.append({"nome": veiculo, "vin": vin, "km": km_v, "litros": litros_v, "consumo": consumo_v, "trips": n_trips, "pilotos": pilotos_v, "n_pilotos": len(pilotos_v), "cc": cc, "eja": eja, "projetos": projetos, "tipo_teste": tipo_teste, "tipo_comb": tipo_comb_v, "ultimo_turno": ultimo_turno, "n_projetos": len(projetos), "n_laudos": n_laudos_v, "n_crit": n_crit_v, "n_mod": n_mod_v, "n_leve": n_leve_v, "data_min": data_min, "data_max": data_max, "valor_gasto": valor_gasto, "spark": spark_v, "score": round(score_saude, 1)})
                except Exception:
                    pass

            if search_vei:
                vei_data = [v for v in vei_data if search_vei in v["nome"].lower() or search_vei in v["vin"].lower()]
            sort_map = {"Nome (A-Z)": ("nome", False), "KM (maior)": ("km", True), "Consumo (melhor)": ("consumo", True), "Ocorrencias (mais)": ("n_laudos", True)}
            sk, srev = sort_map.get(order_by, ("nome", False))
            vei_data.sort(key=lambda x: x.get(sk, 0) if isinstance(x.get(sk), (int, float)) else str(x.get(sk, "")), reverse=srev)

            for v in vei_data:
                try:
                    sc = v["score"]
                    if sc >= 70: hlth_cls, hlth_lbl = "ok", "Saudavel " + str(sc)
                    elif sc >= 40: hlth_cls, hlth_lbl = "warn", "Atencao " + str(sc)
                    else: hlth_cls, hlth_lbl = "crit", "Critico " + str(sc)
                    consumo_pct = min(v["consumo"] / 10.0 * 100, 100)
                    consumo_cls = "good" if v["consumo"] >= bench else ("warn" if v["consumo"] >= meta_min else "bad")
                    km_vs_avg = (v["km"] / max(km_total_frota / max(len(vei_data), 1), 1)) * 100
                    km_cls = "good" if km_vs_avg >= 100 else "warn" if km_vs_avg >= 50 else "bad"
                    km_w = min(km_vs_avg, 100); cons_w = min(consumo_pct, 100)
                    laudo_cls = "bad" if v["n_crit"] > 0 else "good"
                    prog_color = CORS["green"] if v["consumo"] >= bench else CORS["orange"]
                    pilot_html = ""
                    for p in v["pilotos"][:4]:
                        pilot_html += f'<span class="pilot-avatar"><span class="pilot-initial">{p[0].upper()}</span>{p}</span>'
                    if len(v["pilotos"]) > 4:
                        pilot_html += f'<span style="color:{CORS["gray_text"]};font-size:0.7rem;margin-left:4px;">+{len(v["pilotos"]) - 4}</span>'
                    proj_html = ""
                    for p in v["projetos"][:3]:
                        disp = p[:25] + ("..." if len(p) > 25 else "")
                        proj_html += f'<span class="project-tag" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle;">{disp}</span>'
                    if len(v["projetos"]) > 3:
                        proj_html += f'<span style="color:{CORS["gray_text"]};font-size:0.7rem;">+{len(v["projetos"]) - 3}</span>'
                    card_html = (
                        '<div class="veiculo-card">'
                        + '<div class="veiculo-card-header">'
                        + '<div class="veiculo-nome">'
                        + f'<span class="veiculo-icon">{v["nome"][0].upper()}</span>'
                        + v["nome"]
                        + f'<span class="veiculo-vin">{v["vin"]}</span>'
                        + '</div>'
                        + '<div style="display:flex;align-items:center;gap:10px;">'
                        + f'<span class="health-badge {hlth_cls}">{hlth_lbl}</span>'
                        + f'<div class="veiculo-periodo">{v["data_min"]}<br>→ {v["data_max"]}</div>'
                        + '</div></div>'
                        + '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px;">'
                        + f'<div><div class="stat-circle {km_cls}"><span class="stat-circle-value">{v["km"]:,.0f}</span><span class="stat-circle-label">KM</span></div></div>'
                        + f'<div><div class="stat-circle neutral"><span class="stat-circle-value">{v["litros"]:,.0f}</span><span class="stat-circle-label">Litros</span></div></div>'
                        + f'<div><div class="stat-circle {consumo_cls}"><span class="stat-circle-value">{v["consumo"]:.1f}</span><span class="stat-circle-label">km/l</span></div></div>'
                        + f'<div><div class="stat-circle neutral"><span class="stat-circle-value">{v["trips"]}</span><span class="stat-circle-label">Turnos</span></div></div>'
                        + f'<div><div class="stat-circle {laudo_cls}"><span class="stat-circle-value">{v["n_laudos"]}</span><span class="stat-circle-label">Laudos</span></div></div>'
                        + f'<div><div class="stat-circle neutral"><span class="stat-circle-value">{v.get("n_projetos", 0)}</span><span class="stat-circle-label">Proj.</span></div></div>'
                        + '</div>'
                        + f'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;font-size:0.7rem;">'
                        + f'<span style="color:{CORS["gray_text"]};">Combustivel:</span> <span style="color:{CORS["neon_blue"]};font-weight:700;">{v.get("tipo_comb", "—")}</span>'
                        + f'&nbsp;|&nbsp;<span style="color:{CORS["gray_text"]};">Tipo Teste:</span> <span style="color:{CORS["light_text"]};font-weight:600;">{v.get("tipo_teste", "—")}</span>'
                        + f'&nbsp;|&nbsp;<span style="color:{CORS["gray_text"]};">Ultimo Turno:</span> <span style="color:{CORS["light_text"]};font-weight:600;">{v.get("ultimo_turno", "—")}</span>'
                        + '</div>'
                        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">'
                        + f'<div><div class="v-progress-label"><span>KM relativo a frota</span><span>{km_vs_avg:.0f}%</span></div>'
                        + f'<div class="v-progress"><div class="v-progress-bar" style="width:{km_w:.0f}%;background:{CORS["accent_blue"]};"></div></div></div>'
                        + f'<div><div class="v-progress-label"><span>Consumo vs benchmark</span><span>{consumo_pct:.0f}%</span></div>'
                        + f'<div class="v-progress"><div class="v-progress-bar" style="width:{cons_w:.0f}%;background:{prog_color};"></div></div></div>'
                        + '</div>'
                        + f'<div style="display:flex;flex-wrap:wrap;gap:8px 16px;margin-bottom:2px;">'
                        + f'<div style="font-size:0.78rem;color:{CORS["gray_text"]};flex:1;min-width:200px;"><span style="font-weight:700;color:{CORS["light_text"]};">Pilotos ({v["n_pilotos"]}):</span>{pilot_html}</div>'
                        + f'<div style="font-size:0.78rem;color:{CORS["gray_text"]};flex:1;min-width:200px;overflow:hidden;"><span style="font-weight:700;color:{CORS["light_text"]};">Projetos:</span>{proj_html}</div>'
                        + '</div></div>'
                    )
                    st.markdown(card_html, unsafe_allow_html=True)
                    if len(v["spark"]) >= 3:
                        st.plotly_chart(sparkline_fig(v["spark"], CORS["accent_blue"]), use_container_width=True, config={"displayModeBar": False})
                    with st.expander(f"Detalhes — {v['nome']}"):
                        col_d1, col_d2 = st.columns(2)
                        with col_d1:
                            st.markdown(f"""
                            <div class="detail-grid">
                                <span class="label">Veiculo</span><span class="value">{v['nome']}</span>
                                <span class="label">VIN</span><span class="value">{v['vin']}</span>
                                <span class="label">CC</span><span class="value">{v['cc'] or '—'}</span>
                                <span class="label">EJA</span><span class="value">{v['eja'] or '—'}</span>
                                <span class="label">Tipo Teste</span><span class="value">{v['tipo_teste'] or '—'}</span>
                                <span class="label">Combustivel</span><span class="value">{v['tipo_comb'] or '—'}</span>
                            </div>
                            """, unsafe_allow_html=True)
                        with col_d2:
                            st.markdown(f"""
                            <div class="detail-grid">
                                <span class="label">KM Total</span><span class="value">{v['km']:,.0f} km</span>
                                <span class="label">Litros</span><span class="value">{v['litros']:,.1f} L</span>
                                <span class="label">Consumo Medio</span><span class="value">{v['consumo']:.2f} km/l</span>
                                <span class="label">Valor Gasto</span><span class="value">R$ {v['valor_gasto']:,.2f}</span>
                                <span class="label">Laudos (C/M/L)</span><span class="value">{v['n_crit']}/{v['n_mod']}/{v['n_leve']}</span>
                            </div>
                            """, unsafe_allow_html=True)
                        if v["n_laudos"] > 0 and not df_laudos.empty and "Veiculo" in df_laudos.columns:
                            df_lv = df_laudos[df_laudos["Veiculo"] == v["nome"]]
                            if not df_lv.empty:
                                cols_show = [c for c in ["Data", "Severidade", "Categoria", "Descricao", "Operador"] if c in df_lv.columns]
                                st.dataframe(df_lv[cols_show].sort_values("Data", ascending=False).head(10), use_container_width=True, hide_index=True)
                        else:
                            st.success("Nenhum laudo registrado para este veiculo.")
                except Exception:
                    st.markdown(f'<div class="veiculo-card" style="border-left-color:{CORS["gray_text"]};"><span class="veiculo-nome">{v["nome"]}</span><br><span style="color:{CORS["gray_text"]};">Dados parciais disponiveis</span></div>', unsafe_allow_html=True)

            if not vei_data:
                st.warning("Nenhum veiculo encontrado para os filtros selecionados.")

    # ══════════════════════════════════════════════════════════════════
    # ABA 4: COMBUSTIVEL
    # ══════════════════════════════════════════════════════════════════
    with tabs[4]:
        st.markdown(f'<div class="section-header">Eficiencia Energetica e Gestao de Abastecimentos</div>', unsafe_allow_html=True)

        if df_abast.empty and df_turnos.empty:
            st.info("Nenhum dado de combustivel encontrado.")
        else:
            col_g1, col_g2 = st.columns([1.2, 1])
            with col_g1:
                st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Eficiencia Media Global</div>', unsafe_allow_html=True)
                fig_gauge = gauge_fig(round(media_consumo, 2), max(15, benchmark_kmpl * 2), "Consumo Medio (km/l)", CORS["green"])
                st.plotly_chart(fig_gauge, use_container_width=True)
            with col_g2:
                st.markdown(f'<div class="section-header" style="font-size:0.8rem;">km/l Medio por Veiculo</div>', unsafe_allow_html=True)
                if not df_turnos.empty and all(c in df_turnos.columns for c in ["Consumo Médio (km/l)", "Veiculo"]):
                    vei_eff = (df_turnos[df_turnos["Consumo Médio (km/l)"] > 0]
                        .groupby("Veiculo")["Consumo Médio (km/l)"].mean()
                        .reset_index().sort_values("Consumo Médio (km/l)", ascending=True))
                    fig = px.bar(vei_eff, x="Consumo Médio (km/l)", y="Veiculo", orientation="h",
                        color="Consumo Médio (km/l)",
                        color_continuous_scale=["#EF4444", "#F59E0B", "#10B981"],
                        labels={"Consumo Médio (km/l)": "Eficiencia (km/l)"})
                    fig.update_layout(
                        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                        font_color=CORS["light_text"], coloraxis_showscale=False,
                        margin=dict(l=10, r=10, t=20, b=10), height=220,
                    )
                    st.plotly_chart(fig, use_container_width=True)

            col_c1, col_c2, col_c3 = st.columns(3)
            with col_c1:
                st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Volume por Posto</div>', unsafe_allow_html=True)
                if not df_abast.empty and all(c in df_abast.columns for c in ["Posto", "Litros"]):
                    litros_posto = df_abast.groupby("Posto")["Litros"].sum().reset_index().sort_values("Litros", ascending=False)
                    fig = px.bar(litros_posto, x="Posto", y="Litros", color_discrete_sequence=[CORS["green"]])
                    fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color=CORS["light_text"], margin=dict(l=10, r=10, t=10, b=10), height=220, xaxis=dict(gridcolor="#1e293b"), yaxis=dict(gridcolor="#1e293b"))
                    st.plotly_chart(fig, use_container_width=True)
            with col_c2:
                st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Tipo de Combustivel</div>', unsafe_allow_html=True)
                if not df_abast.empty and "Tipo Combustivel" in df_abast.columns:
                    comb_val = df_abast["Tipo Combustivel"].value_counts().reset_index()
                    comb_val.columns = ["Combustivel", "Frequencia"]
                    fig = px.pie(comb_val, values="Frequencia", names="Combustivel",
                        color_discrete_sequence=[CORS["accent_blue"], CORS["purple"], CORS["green"], CORS["orange"]], hole=0.45)
                    fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", font_color=CORS["light_text"], margin=dict(l=10, r=10, t=10, b=10), height=220, legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(size=10)))
                    st.plotly_chart(fig, use_container_width=True)
            with col_c3:
                st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Evolucao do Consumo</div>', unsafe_allow_html=True)
                if not df_turnos.empty and all(c in df_turnos.columns for c in ["Consumo Médio (km/l)", "Data"]):
                    fuel_time = df_turnos[df_turnos["Consumo Médio (km/l)"] > 0].groupby("Data")["Consumo Médio (km/l)"].mean().reset_index()
                    fig = px.line(fuel_time, x="Data", y="Consumo Médio (km/l)", markers=True, color_discrete_sequence=[CORS["neon_blue"]])
                    fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color=CORS["light_text"], margin=dict(l=10, r=10, t=10, b=10), height=220, xaxis=dict(gridcolor="#1e293b"), yaxis=dict(gridcolor="#1e293b"))
                    st.plotly_chart(fig, use_container_width=True)

            with st.expander("Registros Detalhados de Abastecimento"):
                show_cols = [c for c in ["Data", "Operador", "Veiculo", "VIN", "Posto", "Tipo Combustivel", "Litros", "KM Atual"] if c in df_abast.columns]
                st.dataframe(df_abast[show_cols].sort_values("Data", ascending=False) if show_cols and not df_abast.empty else df_abast, use_container_width=True, hide_index=True)

    # ══════════════════════════════════════════════════════════════════
    # ABA 5: PROTOCOLOS DE TESTE
    # ══════════════════════════════════════════════════════════════════
    with tabs[5]:
        st.markdown(f'<div class="section-header">Analise de Protocolos de Rodagem de Pista</div>', unsafe_allow_html=True)

        if df_sessoes.empty:
            st.info("Nenhuma sessao de teste registrada.")
        else:
            if "Projeto" in df_sessoes.columns and "KM Rodado" in df_sessoes.columns:
                projetos_resumo = df_sessoes.groupby("Projeto").agg({"KM Rodado": "sum", "ID": "count"}).reset_index()
                projetos_resumo.columns = ["Projeto", "KM Total", "Sessoes"]
                n_proj_cols = min(len(projetos_resumo), 4)
                if n_proj_cols > 0:
                    pcols = st.columns(n_proj_cols)
                    cores_proj = [CORS["accent_blue"], CORS["green"], CORS["purple"], CORS["orange"]]
                    for i, (_, prow) in enumerate(projetos_resumo.iterrows()):
                        cor = cores_proj[i % len(cores_proj)]
                        pcols[i % n_proj_cols].markdown(
                            f'<div class="kpi-card" style="border-top-color:{cor};">'
                            f'<div class="kpi-label">{prow["Projeto"]}</div>'
                            f'<div class="kpi-value">{prow["KM Total"]:,.0f} km</div>'
                            f'<div class="kpi-delta delta-neutral">{prow["Sessoes"]} sessoes</div>'
                            f'</div>',
                            unsafe_allow_html=True,
                        )
                    st.markdown("<br>", unsafe_allow_html=True)

            col_s1, col_s2 = st.columns(2)
            with col_s1:
                st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Distancia por Projeto (km)</div>', unsafe_allow_html=True)
                if all(c in df_sessoes.columns for c in ["Projeto", "KM Rodado"]):
                    pkm = df_sessoes.groupby("Projeto")["KM Rodado"].sum().reset_index().sort_values("KM Rodado", ascending=False)
                    fig = px.bar(pkm, x="Projeto", y="KM Rodado", color_discrete_sequence=[CORS["accent_blue"]])
                    fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color=CORS["light_text"], margin=dict(l=10, r=10, t=10, b=10), xaxis=dict(gridcolor="#1e293b"), yaxis=dict(gridcolor="#1e293b"))
                    st.plotly_chart(fig, use_container_width=True)
            with col_s2:
                st.markdown(f'<div class="section-header" style="font-size:0.8rem;">Ciclos R389 por Projeto</div>', unsafe_allow_html=True)
                if all(c in df_sessoes.columns for c in ["Projeto", "Ciclos R389"]):
                    pcic = df_sessoes.groupby("Projeto")["Ciclos R389"].sum().reset_index().sort_values("Ciclos R389", ascending=False)
                    fig = px.bar(pcic, x="Projeto", y="Ciclos R389", color_discrete_sequence=[CORS["purple"]])
                    fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font_color=CORS["light_text"], margin=dict(l=10, r=10, t=10, b=10), xaxis=dict(gridcolor="#1e293b"), yaxis=dict(gridcolor="#1e293b"))
                    st.plotly_chart(fig, use_container_width=True)

            st.markdown(f'<div class="section-header">Detalhamento das Sessoes de Teste</div>', unsafe_allow_html=True)
            show_s_cols = [c for c in ["Data", "Projeto", "Tipo Teste", "Veiculo", "VIN", "KM Rodado", "Ciclos R389", "Laps Frenagem", "Status", "Problemas"] if c in df_sessoes.columns]
            st.dataframe(df_sessoes[show_s_cols].sort_values("Data", ascending=False) if "Data" in df_sessoes.columns else df_sessoes[show_s_cols], use_container_width=True, hide_index=True)

            # ── EXPLORADOR DE DADOS ──
            st.markdown("<br>", unsafe_allow_html=True)
            st.markdown(f'<div class="section-header">Explorador de Dados Brutos</div>', unsafe_allow_html=True)
            t_option = st.selectbox("Selecione a base de dados:", ["Turnos Encerrados", "Sessoes de Teste", "Abastecimentos", "Laudos e Defeitos"])
            selected_df = pd.DataFrame()
            if t_option == "Turnos Encerrados": selected_df = df_turnos
            elif t_option == "Sessoes de Teste": selected_df = df_sessoes
            elif t_option == "Abastecimentos": selected_df = df_abast
            elif t_option == "Laudos e Defeitos": selected_df = df_laudos
            if not selected_df.empty:
                st.markdown(f"**{len(selected_df)} registros carregados.**")
                search_query = st.text_input("Filtro rapido (qualquer termo):")
                if search_query:
                    mask = selected_df.astype(str).apply(lambda x: x.str.contains(search_query, case=False, na=False)).any(axis=1)
                    export_df = selected_df[mask]
                else:
                    export_df = selected_df
                st.dataframe(export_df, use_container_width=True)
                col_exp1, col_exp2 = st.columns(2)
                with col_exp1:
                    csv_data = export_df.to_csv(index=False).encode("utf-8")
                    st.download_button(label="Exportar CSV", data=csv_data, file_name=f"ford_vev_{t_option.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv", mime="text/csv", use_container_width=True)
                with col_exp2:
                    xlsx_data = exportar_excel({t_option[:31]: export_df})
                    st.download_button(label="Exportar Excel (.xlsx)", data=xlsx_data, file_name=f"ford_vev_{t_option.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx", mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", use_container_width=True)
            else:
                st.warning("Sem dados nesta tabela.")

    # ══════════════════════════════════════════════════════════════════
    # ABA 6: IA ADVISOR (GEMINI)
    # ══════════════════════════════════════════════════════════════════
    with tabs[6]:
        st.markdown(f'<div class="section-header">Assistente Virtual — IA Advisor (Gemini)</div>', unsafe_allow_html=True)

        gemini_key = st.session_state.get("gemini_api_key", "").strip()

        if not gemini_key:
            st.markdown(
                f"""
                <div style="background:{CORS['card_bg']}; border: 1px solid {CORS['border_gray']}; border-left: 4px solid {CORS['orange']}; border-radius: 8px; padding: 1.5rem; margin-bottom: 20px;">
                    <h4 style="margin:0 0 10px 0; color:{CORS['orange']}; font-weight:700; font-size:1.1rem;">IA Advisor Desativado</h4>
                    <p style="font-size:0.9rem; line-height:1.6; color:{CORS['light_text']}; margin-bottom: 12px;">
                        Para ativar o relatorio analitico gerado por Inteligencia Artificial (Gemini), insira a sua <b>Chave de API do Gemini</b> na barra lateral.
                    </p>
                    <div style="font-size:0.82rem; color:{CORS['gray_text']}; line-height:1.5;">
                        <b>Como obter uma chave de API:</b><br>
                        1. Acesse o <a href="https://aistudio.google.com/" target="_blank" style="color:{CORS['neon_blue']}; text-decoration:none;">Google AI Studio</a>.<br>
                        2. Crie uma chave de API gratuita.<br>
                        3. Cole a chave no campo "Chave API do Gemini" na barra lateral deste painel.
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            st.markdown(f'<div class="section-header" style="font-size:0.85rem;color:{CORS["accent_blue"]};">Advisor Local (Analise Deterministica)</div>', unsafe_allow_html=True)
            story_data = gerar_storytelling(df_turnos, df_laudos, df_ativos, benchmark_kmpl, meta_min_kmpl)
            st.markdown(
                f"""
                <div style="background:{CORS['card_bg']}; border: 1px solid {CORS['border_gray']}; border-radius: 8px; padding: 1.5rem;">
                    <h5 style="margin:0 0 8px 0; color:{CORS['neon_blue']}; font-size:1rem; font-weight:700;">Relatorio de Desempenho Operacional</h5>
                    <p style="font-size:0.75rem; color:{CORS['gray_text']}; margin-bottom:16px;">Analise local baseada nas regras de negocios do Proving Ground.</p>
                    <div style="margin-bottom:16px; font-size:0.9rem; line-height:1.6;">
                        <h6 style="color:{CORS['light_text']}; font-weight:600; margin-bottom:6px;">Diagnostico Inicial (Hook):</h6>
                        <p>{story_data['hook']}</p>
                    </div>
                    <div style="margin-bottom:16px; font-size:0.9rem; line-height:1.6;">
                        <h6 style="color:{CORS['light_text']}; font-weight:600; margin-bottom:6px;">Desvios Identificados:</h6>
                        <p>{story_data['conflict']}</p>
                    </div>
                    <div style="font-size:0.9rem; line-height:1.6;">
                        <h6 style="color:{CORS['light_text']}; font-weight:600; margin-bottom:6px;">Acoes Recomendadas:</h6>
                        <p>{story_data['resolution']}</p>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        else:
            st.info("Analisando dados em tempo real com o Gemini...")
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel("gemini-1.5-flash")
                tot_km = df_turnos["Trip KM"].sum() if not df_turnos.empty and "Trip KM" in df_turnos.columns else 0.0
                tot_litros = df_turnos["Litros"].sum() if not df_turnos.empty and "Litros" in df_turnos.columns else 0.0
                med_cons = tot_km / tot_litros if tot_litros > 0 else 0.0
                veiculos_resumo = []
                if not df_turnos.empty and "Veiculo" in df_turnos.columns:
                    for v in df_turnos["Veiculo"].unique():
                        df_v = df_turnos[df_turnos["Veiculo"] == v]
                        km_v = df_v["Trip KM"].sum(); lit_v = df_v["Litros"].sum()
                        cons_v = km_v / lit_v if lit_v > 0 else 0.0
                        laudos_v = len(df_laudos[df_laudos["Veiculo"] == v]) if not df_laudos.empty else 0
                        veiculos_resumo.append(f"- Veiculo: {v} | KM: {km_v:.1f} | Consumo: {cons_v:.2f} km/l | Laudos: {laudos_v}")
                laudos_resumo = []
                if not df_laudos.empty:
                    df_l_recent = df_laudos.sort_values("Data", ascending=False).head(5)
                    for _, row in df_l_recent.iterrows():
                        laudos_resumo.append(f"- Data: {row.get('Data')} | Veiculo: {row.get('Veiculo')} | Severidade: {row.get('Severidade')} | Descricao: {row.get('Descricao')}")
                prompt = f"""
Voce e um consultor senior de engenharia de testes especializado no Proving Ground de Veiculos da Ford (VEV).
Analise os seguintes dados operacionais da frota para o periodo selecionado:

Metricas Globais:
- Quilometragem Acumulada: {tot_km:,.1f} km
- Litros de Combustivel Consumidos: {tot_litros:,.1f} L
- Consumo Medio Geral: {med_cons:.2f} km/l
- Benchmark de Consumo: {benchmark_kmpl:.2f} km/l
- Limite Critico: {meta_min_kmpl:.2f} km/l

Desempenho de Veiculos:
{chr(10).join(veiculos_resumo[:10])}

Laudos Mecanicos Recentes:
{chr(10).join(laudos_resumo)}

Escreva um relatorio executivo de performance para a gerencia da Ford com os seguintes topicos:
1. CONTEXTO GERAL: Resumo de alto nivel sobre a saude e rodagem da frota.
2. ANALISE DE EFICIENCIA: Avalie o consumo medio em relacao ao benchmark.
3. DIAGNOSTICO MECANICO: Analise os laudos e riscos para os veiculos e pilotos.
4. PLANO DE ACAO: Liste 3-4 acoes praticas imediatas.

Escreva em portugues (Brasil), use formatacao Markdown elegante. Seja conciso e tecnico.
"""
                response = model.generate_content(prompt)
                report_text = response.text
                st.markdown(
                    f"""
                    <div style="background:{CORS['card_bg']}; border: 1px solid {CORS['border_gray']}; border-left: 4px solid {CORS['green']}; border-radius: 8px; padding: 1.2rem 1.5rem; margin-bottom: 20px;">
                        <span style="color:{CORS['green']}; font-weight:700; font-size:0.9rem;">IA Advisor Ativo — Gemini 1.5 Flash</span>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
                st.markdown(report_text)
            except Exception as e:
                st.error(f"Erro ao gerar insights com o Gemini: {e}")
                st.info("Exibindo o Advisor Local como fallback.")
                story_data = gerar_storytelling(df_turnos, df_laudos, df_ativos, benchmark_kmpl, meta_min_kmpl)
                st.markdown(
                    f"""
                    <div style="background:{CORS['card_bg']}; border: 1px solid {CORS['border_gray']}; border-radius: 8px; padding: 1.5rem;">
                        <h5 style="margin:0 0 8px 0; color:{CORS['neon_blue']}; font-size:1rem; font-weight:700;">Relatorio de Desempenho Operacional (Fallback)</h5>
                        <div style="font-size:0.9rem; line-height:1.6;">{story_data['hook']}<br><br>{story_data['conflict']}<br><br>{story_data['resolution']}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

    # ── RODAPE ──
    ts_footer = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    st.markdown(
        f'<div class="footer-bar">'
        f'<span>Ford VEV Control Room — Sistema de Monitoramento de Proving Ground</span>'
        f'<span>Atualizado em: {ts_footer} | Dados: Firebase RTDB | Auto-refresh: {refresh_interval}s</span>'
        f'</div>',
        unsafe_allow_html=True,
    )


# Executar o fragmento principal
render_dashboard(filtro_projeto, filtro_operador, filtro_veiculo, datas)
