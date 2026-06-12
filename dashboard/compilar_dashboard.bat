@echo off
title Compilando Ford VEV Dashboard...
echo ====================================================
echo Iniciando o processo de compilação com PyInstaller...
echo ====================================================

:: Entra na pasta do script
cd /d "%~dp0"

:: Ativa o ambiente virtual (.venv) se ele existir
if exist .venv\Scripts\activate.bat (
    echo Ativando ambiente virtual (.venv)...
    call .venv\Scripts\activate.bat
) else (
    echo AVISO: Ambiente virtual .venv não encontrado. Usando Python global.
)

echo Instalando/Atualizando PyInstaller e dependências...
python -m pip install --upgrade pip
python -m pip install pyinstaller

echo Compilando com PyInstaller (Isso pode levar alguns minutos)...
pyinstaller --onefile --clean --copy-metadata streamlit --collect-all streamlit --collect-all streamlit_folium --collect-all streamlit_autorefresh run_dashboard.py

echo ====================================================
echo PROCESSO CONCLUÍDO!
echo O executável está na pasta: %~dp0dist\run_dashboard.exe
echo ====================================================
pause
