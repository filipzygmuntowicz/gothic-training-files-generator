@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
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
set "FFMPEG_EXE=%ROOT%src\ffmpeg.exe"
if not exist "%FFMPEG_EXE%" set "FFMPEG_EXE=%ROOT%ffmpeg.exe"
if not exist "%FFMPEG_EXE%" set "FFMPEG_EXE=ffmpeg.exe"
"%FFMPEG_EXE%" -version >nul 2>nul
if errorlevel 1 (
    echo ERROR: ffmpeg.exe was not found. Put ffmpeg.exe next to this script, in src, or add ffmpeg to PATH.
    exit /b 1
)

set "REMAKE_ROOT=%ROOT%remake"
if not exist "%REMAKE_ROOT%\speech_ogg\" set "REMAKE_ROOT=%ROOT%src\remake"
set "SRC=%REMAKE_ROOT%\speech_ogg"
set "DST=%REMAKE_ROOT%\speech"

echo Target format: 24000 Hz, mono, signed 16-bit PCM WAV.
if "%DRY_RUN%"=="1" echo Mode: dry run; no audio will be converted.
if "%OVERWRITE%"=="1" echo Existing files in speech folder will be overwritten.

echo.
echo ==== remake ====
echo Source: Ogg Vorbis files from %SRC%
echo Output: %DST%

if not exist "%SRC%\" (
    echo ERROR: Source folder not found: %SRC%
    exit /b 1
)

if "%DRY_RUN%"=="0" if not exist "%DST%\" mkdir "%DST%"

for %%F in ("%SRC%\*.ogg") do (
    if exist "%%~fF" (
        set /a TOTAL_FILES+=1
        set "OUT=%DST%\%%~nF.wav"
        set "TMP=%DST%\%%~nF.__omnivoice_tmp__.wav"

        if exist "!OUT!" (
            if "%OVERWRITE%"=="0" (
                set /a TOTAL_SKIPPED+=1
            ) else (
                call :ConvertOne "%%~fF" "!OUT!" "!TMP!"
            )
        ) else (
            call :ConvertOne "%%~fF" "!OUT!" "!TMP!"
        )

        set /a MODULO=!TOTAL_FILES! %% 1000
        if !MODULO! EQU 0 echo Processed !TOTAL_FILES! files...
    )
)

echo.
echo ==== Summary ====
echo Source OGGs found: %TOTAL_FILES%
if "%DRY_RUN%"=="1" (
    echo Would convert: %TOTAL_TOCONVERT%
) else (
    echo Converted: %TOTAL_CONVERTED%
)
echo Skipped existing: %TOTAL_SKIPPED%
echo Failed: %TOTAL_FAILED%

if %TOTAL_FAILED% GTR 0 exit /b 1
exit /b 0

:ConvertOne
set "IN_FILE=%~1"
set "OUT_FILE=%~2"
set "TMP_FILE=%~3"
set /a TOTAL_TOCONVERT+=1

if "%DRY_RUN%"=="1" exit /b 0

if exist "%TMP_FILE%" del /f /q "%TMP_FILE%" >nul 2>nul
"%FFMPEG_EXE%" -hide_banner -nostdin -loglevel error -y -i "%IN_FILE%" -vn -map_metadata -1 -ac 1 -ar 24000 -c:a pcm_s16le "%TMP_FILE%"
if errorlevel 1 (
    echo ERROR: Failed to convert "%IN_FILE%"
    if exist "%TMP_FILE%" del /f /q "%TMP_FILE%" >nul 2>nul
    set /a TOTAL_FAILED+=1
    exit /b 0
)

move /y "%TMP_FILE%" "%OUT_FILE%" >nul
if errorlevel 1 (
    echo ERROR: Failed to write "%OUT_FILE%"
    if exist "%TMP_FILE%" del /f /q "%TMP_FILE%" >nul 2>nul
    set /a TOTAL_FAILED+=1
    exit /b 0
)

set /a TOTAL_CONVERTED+=1
exit /b 0

:usage
echo Usage: %~nx0 [--dry-run] [--overwrite]
echo.
echo Converts OGG files from remake\speech_ogg into WAV files in remake\speech.
echo Output files keep the original base names and are written as 24000 Hz mono PCM WAV.
echo Existing converted files are skipped unless --overwrite is provided.
exit /b 2