@echo off
echo Setting up AISecure database...
echo.

REM Check if psql is available
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: psql command not found. Please make sure PostgreSQL is installed and in your PATH.
    echo.
    echo You can also run this manually:
    echo 1. Open pgAdmin
    echo 2. Right-click on "Databases"
    echo 3. Select "Create" - "Database"
    echo 4. Name it: AISecure_auth
    echo 5. Click "Save"
    echo.
    pause
    exit /b 1
)

echo Running database setup...
psql -U postgres -f "%~dp0create-database.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Database setup completed successfully!
    echo You can now start the backend server.
) else (
    echo.
    echo ❌ Database setup failed. Please check the error messages above.
    echo.
    echo Common solutions:
    echo 1. Make sure PostgreSQL is running
    echo 2. Check your PostgreSQL password
    echo 3. Make sure you have permission to create databases
)

echo.
pause
