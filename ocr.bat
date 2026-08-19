@echo off
title OCR Veicular - Ford VEV
cd /d "%~dp0"
mode con cols=100 lines=50
color 0A
echo ============================================
echo   OCR VEICULAR - FORD VEV
echo   Leitura de Nota Fiscal + Painel
echo ============================================
echo.
echo   Voce pode:
echo     1. Arrastar as FOTOS para esta janela
echo     2. Digitar os caminhos manualmente
echo     3. So Enter para modo manual
echo.
echo   EXEMPLO: C:\Users\engen\Downloads\nota.jpg
echo.
set /p NOTA="Foto da NOTA FISCAL (Enter p/ pular): "
if "%NOTA%"=="" set NOTA=
set /p PAINEL="Foto do PAINEL (Enter p/ pular): "
if "%PAINEL%"=="" set PAINEL=
cls
echo Processando...
echo.
node ocr-cli.cjs %NOTA% %PAINEL%
echo.
if %errorlevel% neq 0 (
    echo.
    echo =========== ATENCAO ===========
    echo Ocorreu um erro. Verifique:
    echo   - Os caminhos das fotos estao corretos?
    echo   - Voce instalou as dependencias? (npm install)
    echo   - As fotos sao .jpg ou .png?
    echo ================================
    echo.
)
pause
