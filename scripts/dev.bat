@echo off
setlocal
pushd "%~dp0.."
if /I "%~1"=="all" (call pnpm dev:all & goto end)
if /I "%~1"=="blog" (call pnpm dev:blog & goto end)
if /I "%~1"=="blog-full" (call pnpm dev:blog:full & goto end)
if /I "%~1"=="server" (call pnpm dev:server & goto end)
if /I "%~1"=="client" (call pnpm dev:client & goto end)
echo Usage: scripts\dev.bat [all^|blog^|blog-full^|server^|client]
echo Blog: http://localhost:3002
echo Client: http://localhost:5173
echo Server: http://localhost:4000
:end
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
