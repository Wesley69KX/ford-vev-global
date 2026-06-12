"""
============================================================
 FORD VEV DASHBOARD — Google Colab
 Copie e cole cada bloco (célula) no Colab
============================================================

CÉLULA 1 — Instalar dependências
------------------------------------------------------------"""
# !pip install -q gspread pandas plotly folium google-auth

"""
CÉLULA 2 — Autenticar e conectar planilha
------------------------------------------------------------"""
from google.colab import auth
auth.authenticate_user()

import gspread
from google.auth import default

creds, _ = default()
client = gspread.authorize(creds)

NOME_PLANILHA = ""  # ← COLE O NOME DA SUA PLANILHA AQUI
if not NOME_PLANILHA:
    NOME_PLANILHA = input("Digite o nome da planilha: ")

sheet = client.open(NOME_PLANILHA)
print(f"Conectado! Abas: {[ws.title for ws in sheet.worksheets()]}")

"""
CÉLULA 3 — Carregar dados de todas as abas
------------------------------------------------------------"""
import pandas as pd

def carregar_aba(aba_nome):
    try:
        ws = sheet.worksheet(aba_nome)
        data = ws.get_all_values()
        if len(data) <= 1: return pd.DataFrame()
        return pd.DataFrame(data[1:], columns=data[0])
    except: return pd.DataFrame()

df_turnos = carregar_aba("Turnos_Encerrados")
df_abast = carregar_aba("Abastecimentos")
df_laudos = carregar_aba("Laudos")
df_sessoes = carregar_aba("Sessoes_Teste")
df_gps = carregar_aba("GPS_Batch")
df_ativos = carregar_aba("Turnos_Ativos")

print(f"Turnos: {len(df_turnos)} | Abast: {len(df_abast)} | Laudos: {len(df_laudos)} | Sessoes: {len(df_sessoes)} | GPS: {len(df_gps)} | Ativos: {len(df_ativos)}")

"""
CÉLULA 4 — Tratar dados e definir cores
------------------------------------------------------------"""
import plotly.express as px
import plotly.graph_objects as go
import folium
from IPython.display import display, HTML
from datetime import datetime

CORS = {
    "ford_blue": "#004899", "neon_blue": "#38bdf8",
    "green": "#10b981", "orange": "#f59e0b",
    "red": "#ef4444", "purple": "#7c3aed", "gray": "#64748b",
}

def tratar_turnos(df):
    if df.empty: return df
    for c in ["Trip KM", "Litros", "KM Rodagem", "Ciclos R389",
              "Laps Frenagem", "Total Ocorrências", "Críticas",
              "Consumo Médio (km/l)"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors='coerce').fillna(0)
    if 'Data' in df.columns:
        df['Data'] = pd.to_datetime(df['Data'], dayfirst=True, errors='coerce')
    return df

df_turnos = tratar_turnos(df_turnos)

total_turnos = len(df_turnos)
total_km = df_turnos['Trip KM'].sum() if not df_turnos.empty else 0
total_litros = df_turnos['Litros'].sum() if not df_turnos.empty else 0
total_ocorrencias = df_turnos['Total Ocorrências'].sum() if not df_turnos.empty else 0
media_consumo = total_km / total_litros if total_litros > 0 else 0

html_kpis = f"""
<div style="display:flex;gap:12px;flex-wrap:wrap;margin:20px 0;">
  <div style="background:white;border-radius:12px;padding:16px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid #004899;flex:1;min-width:140px;">
    <div style="font-size:0.75rem;color:#64748b;">📋 Total Turnos</div>
    <div style="font-size:1.8rem;font-weight:700;color:#0f172a;">{total_turnos}</div>
  </div>
  <div style="background:white;border-radius:12px;padding:16px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid #38bdf8;flex:1;min-width:140px;">
    <div style="font-size:0.75rem;color:#64748b;">📏 KM Percorridos</div>
    <div style="font-size:1.8rem;font-weight:700;color:#0f172a;">{total_km:,.0f} km</div>
  </div>
  <div style="background:white;border-radius:12px;padding:16px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid #10b981;flex:1;min-width:140px;">
    <div style="font-size:0.75rem;color:#64748b;">⛽ Litros</div>
    <div style="font-size:1.8rem;font-weight:700;color:#0f172a;">{total_litros:,.1f} L</div>
  </div>
  <div style="background:white;border-radius:12px;padding:16px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid #7c3aed;flex:1;min-width:140px;">
    <div style="font-size:0.75rem;color:#64748b;">📊 Consumo Médio</div>
    <div style="font-size:1.8rem;font-weight:700;color:#0f172a;">{media_consumo:.2f} km/l</div>
  </div>
  <div style="background:white;border-radius:12px;padding:16px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid #ef4444;flex:1;min-width:140px;">
    <div style="font-size:0.75rem;color:#64748b;">⚠️ Ocorrências</div>
    <div style="font-size:1.8rem;font-weight:700;color:#0f172a;">{total_ocorrencias:,.0f}</div>
  </div>
</div>
"""
display(HTML(html_kpis))

"""
CÉLULA 5 — GRÁFICOS: Turnos
------------------------------------------------------------"""
if not df_turnos.empty:
    turnos_dia = df_turnos.groupby(df_turnos['Data'].dt.date).size().reset_index(name='Qtd')
    turnos_dia.columns = ['Data', 'Turnos']
    fig = px.bar(turnos_dia, x='Data', y='Turnos', title='Turnos por Dia',
                 color_discrete_sequence=['#004899'])
    fig.update_layout(height=350)
    fig.show()

    km_op = df_turnos.groupby('Operador')['Trip KM'].sum().sort_values(ascending=False).head(15)
    fig = px.bar(km_op, title='Top Operadores por KM',
                 color_discrete_sequence=['#38bdf8'],
                 labels={'value': 'KM', 'index': 'Operador'})
    fig.update_layout(height=350, showlegend=False)
    fig.show()

    occ_op = df_turnos.groupby('Operador')['Total Ocorrências'].sum().sort_values(ascending=False).head(15)
    fig = px.bar(occ_op, title='Ocorrências por Operador',
                 color_discrete_sequence=['#ef4444'],
                 labels={'value': 'Ocorrências', 'index': 'Operador'})
    fig.update_layout(height=350, showlegend=False)
    fig.show()

    consumo = df_turnos[df_turnos['Consumo Médio (km/l)'] > 0]['Consumo Médio (km/l)']
    if not consumo.empty:
        fig = px.histogram(consumo, title='Distribuição Consumo (km/l)',
                          color_discrete_sequence=['#10b981'], nbins=20)
        fig.update_layout(height=350, showlegend=False)
        fig.show()

"""
CÉLULA 6 — GRÁFICOS: Abastecimentos
------------------------------------------------------------"""
if not df_abast.empty:
    posto_count = df_abast['Posto'].value_counts().head(10)
    fig = px.pie(values=posto_count.values, names=posto_count.index,
                 title='Postos Mais Utilizados',
                 color_discrete_sequence=px.colors.qualitative.Set3)
    fig.update_layout(height=400)
    fig.show()

"""
CÉLULA 7 — GRÁFICOS: Laudos / Issues
------------------------------------------------------------"""
if not df_laudos.empty:
    sev = df_laudos['Severidade'].value_counts()
    fig = px.pie(values=sev.values, names=sev.index, title='Por Severidade',
                 color_discrete_map={
                     'Crítico': '#ef4444', 'critico': '#ef4444',
                     'Moderado': '#f59e0b', 'moderado': '#f59e0b',
                     'Leve': '#10b981', 'leve': '#10b981',
                 })
    fig.update_layout(height=400)
    fig.show()

"""
CÉLULA 8 — GRÁFICOS: Performance (R389 vs Frenagem)
------------------------------------------------------------"""
if not df_turnos.empty:
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=df_turnos['Data'], y=df_turnos['Ciclos R389'],
        mode='markers', name='Ciclos R389',
        marker=dict(color='#004899', size=6, opacity=0.6)))
    fig.add_trace(go.Scatter(
        x=df_turnos['Data'], y=df_turnos['Laps Frenagem'],
        mode='markers', name='Laps Frenagem',
        marker=dict(color='#ef4444', size=6, opacity=0.6)))
    fig.update_layout(title='Ciclos R389 vs Frenagens por Turno', height=400)
    fig.show()

"""
CÉLULA 9 — MAPA GPS
------------------------------------------------------------"""
if not df_gps.empty:
    df_gps['Latitude'] = pd.to_numeric(df_gps['Latitude'], errors='coerce')
    df_gps['Longitude'] = pd.to_numeric(df_gps['Longitude'], errors='coerce')
    df_gps['Velocidade (km/h)'] = pd.to_numeric(df_gps['Velocidade (km/h)'], errors='coerce').fillna(0)
    gps = df_gps.dropna(subset=['Latitude', 'Longitude'])

    centro = [gps['Latitude'].mean(), gps['Longitude'].mean()]
    m = folium.Map(location=centro, zoom_start=14, tiles='CartoDB dark')

    for _, row in gps.iterrows():
        v = row['Velocidade (km/h)']
        cor = '#10b981' if v < 60 else '#f59e0b' if v < 120 else '#ef4444'
        folium.CircleMarker(
            location=[row['Latitude'], row['Longitude']],
            radius=3, color=cor, fill=True, fillOpacity=0.7,
            popup=f"{v:.0f} km/h",
        ).add_to(m)

    display(m)
else:
    print("Sem dados de GPS.")
