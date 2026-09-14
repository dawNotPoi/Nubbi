@echo off
setlocal

set ROOT=%~dp0
set SERVER_PORT=4000
set CLIENT_PORT=5173

echo.
echo ============================================
echo   Nubbi Dev Launcher
echo ============================================
echo.

if "%1"=="" goto help
if /I "%1"=="all" goto all
if /I "%1"=="server" goto server
if /I "%1"=="client" goto client
goto help

:all
echo [1/2] Starting server (port %SERVER_PORT%)...
start "Nubbi Server" cmd /c "cd /d "%ROOT%server" && title Nubbi Server ^(port %SERVER_PORT%^) && pnpm dev"
echo [2/2] Starting client (port %CLIENT_PORT%)...
start "Nubbi Client" cmd /c "cd /d "%ROOT%client" && title Nubbi Client ^(port %CLIENT_PORT%^) && pnpm dev"
echo.
echo Both services started in separate windows.
echo   Server: http://localhost:%SERVER_PORT%
echo   Client: http://localhost:%CLIENT_PORT%
goto end

:server
echo Starting server only (port %SERVER_PORT%)...
start "Nubbi Server" cmd /c "cd /d "%ROOT%server" && title Nubbi Server ^(port %SERVER_PORT%^) && pnpm dev"
echo.
echo Server started: http://localhost:%SERVER_PORT%
goto end

:client
echo Starting client only (port %CLIENT_PORT%)...
start "Nubbi Client" cmd /c "cd /d "%ROOT%client" && title Nubbi Client ^(port %CLIENT_PORT%^) && pnpm dev"
echo.
echo Client started: http://localhost:%CLIENT_PORT%
goto end

:help
echo Usage: dev [command]
echo.
echo Commands:
echo   all      Start both frontend and backend in separate windows
echo   server   Start backend server only
echo   client   Start frontend client only
echo.
echo Examples:
echo   dev all          -  Launch full dev environment
echo   dev server       -  Launch server only
echo   dev client       -  Launch client only
goto end

:end
endlocal
