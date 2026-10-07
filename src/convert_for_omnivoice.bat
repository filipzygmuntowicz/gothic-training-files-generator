@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
set "FFMPEG_EXE=%ROOT%ffmpeg.exe"
set "DRY_RUN=0"
set "OVERWRITE=0"
set /a TOTAL_FILES=0
set /a TOTAL_TOCONVERT=0
set /a TOTAL_CONVERTED=0
set /a TOTAL_SKIPPED=0
set /a TOTAL_FAILED=0

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--dry-run" (
    set "DRY_RUN=1"
    shift
    goto parse_args
)
if /I "%~1"=="--overwrite" (
    set "OVERWRITE=1"
    shift
    goto parse_args
)
if /I "%~1"=="/?" goto usage
if /I "%~1"=="-h" goto usage
if /I "%~1"=="--help" goto usage
echo Unknown option: %~1
goto usage

:args_done
if not exist "%FFMPEG_EXE%" set "FFMPEG_EXE=ffmpeg.exe"
"%FFMPEG_EXE%" -version >nul 2>nul
if errorlevel 1 (
    echo ERROR: ffmpeg.exe was not found. Put ffmpeg.exe next to this script or add ffmpeg to PATH.
    exit /b 1
)

echo Target format: 24000 Hz, mono, signed 16-bit PCM WAV.
if "%DRY_RUN%"=="1" echo Mode: dry run; no audio will be converted.
if "%OVERWRITE%"=="1" echo Existing files in converted folders will be overwritten.

rem Source signatures were checked per game with ffprobe before writing this script.
call :ConvertGame "g1" "sampled as 44100 Hz mono IMA ADPCM WAV"
call :ConvertGame "g2" "sampled as 44100 Hz mono IMA ADPCM WAV"
call :ConvertGame "km" "sampled as 44100 Hz mono IMA ADPCM WAV"
call :ConvertGame "nk" "sampled as mixed 44100/22050 Hz mono IMA ADPCM WAV"

echo.
echo ==== Summary ====
echo Source WAVs found: %TOTAL_FILES%
if "%DRY_RUN%"=="1" (
    echo Would convert: %TOTAL_TOCONVERT%
) else (
    echo Converted: %TOTAL_CONVERTED%
)
echo Skipped existing: %TOTAL_SKIPPED%
echo Failed: %TOTAL_FAILED%

if %TOTAL_FAILED% GTR 0 exit /b 1
exit /b 0

:ConvertGame
set "GAME=%~1"
set "NOTE=%~2"
set "SRC=%ROOT%%GAME%"
set "DST=%SRC%\converted"
set /a GAME_FILES=0
set /a GAME_TOCONVERT=0
set /a GAME_CONVERTED=0
set /a GAME_SKIPPED=0
set /a GAME_FAILED=0

echo.
echo ==== %GAME% ====
echo Source: %NOTE%

if not exist "%SRC%\" (
    echo ERROR: Source folder not found: %SRC%
    set /a TOTAL_FAILED+=1
    exit /b 0
)

if "%DRY_RUN%"=="0" if not exist "%DST%\" mkdir "%DST%"
echo Output: %DST%

for %%F in ("%SRC%\*.wav") do (
    if exist "%%~fF" (
        set /a GAME_FILES+=1
        set /a TOTAL_FILES+=1
        set "OUT=%DST%\%%~nxF"
        set "TMP=%DST%\%%~nF.__omnivoice_tmp__.wav"

        if exist "!OUT!" (
            if "%OVERWRITE%"=="0" (
                set /a GAME_SKIPPED+=1
                set /a TOTAL_SKIPPED+=1
            ) else (
                call :ConvertOne "%%~fF" "!OUT!" "!TMP!"
            )
        ) else (
            call :ConvertOne "%%~fF" "!OUT!" "!TMP!"
        )

        set /a MODULO=!GAME_FILES! %% 1000
        if !MODULO! EQU 0 echo Processed !GAME_FILES! files in %GAME%...
    )
)

echo Found: !GAME_FILES!, To convert: !GAME_TOCONVERT!, Converted: !GAME_CONVERTED!, Skipped: !GAME_SKIPPED!, Failed: !GAME_FAILED!
exit /b 0

:ConvertOne
set "IN_FILE=%~1"
set "OUT_FILE=%~2"
set "TMP_FILE=%~3"
set /a GAME_TOCONVERT+=1
set /a TOTAL_TOCONVERT+=1

if "%DRY_RUN%"=="1" exit /b 0

if exist "%TMP_FILE%" del /f /q "%TMP_FILE%" >nul 2>nul
"%FFMPEG_EXE%" -hide_banner -nostdin -loglevel error -y -i "%IN_FILE%" -vn -map_metadata -1 -ac 1 -ar 24000 -c:a pcm_s16le "%TMP_FILE%"
if errorlevel 1 (
    echo ERROR: Failed to convert "%IN_FILE%"
    if exist "%TMP_FILE%" del /f /q "%TMP_FILE%" >nul 2>nul
    set /a GAME_FAILED+=1
    set /a TOTAL_FAILED+=1
    exit /b 0
)

move /y "%TMP_FILE%" "%OUT_FILE%" >nul
if errorlevel 1 (
    echo ERROR: Failed to write "%OUT_FILE%"
    if exist "%TMP_FILE%" del /f /q "%TMP_FILE%" >nul 2>nul
    set /a GAME_FAILED+=1
    set /a TOTAL_FAILED+=1
    exit /b 0
)

set /a GAME_CONVERTED+=1
set /a TOTAL_CONVERTED+=1
exit /b 0

:usage
echo Usage: %~nx0 [--dry-run] [--overwrite]
echo.
echo Converts WAV files in g1, g2, km, and nk into per-folder converted directories.
echo Output files keep the original file names and are written as 24000 Hz mono PCM WAV.
echo Existing converted files are skipped unless --overwrite is provided.
exit /b 2