@echo off
echo ========================================
echo AISecure Repository Watching Setup
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install nodemailer
if %errorlevel% neq 0 (
    echo Error installing nodemailer
    pause
    exit /b 1
)

echo.
echo [2/4] Applying database schema...
call node scripts/apply-repository-watching-schema.js
if %errorlevel% neq 0 (
    echo Error applying database schema
    pause
    exit /b 1
)

echo.
echo [3/4] Setting up email configuration...
call node scripts/setup-email-config.js
if %errorlevel% neq 0 (
    echo Error setting up email configuration
    pause
    exit /b 1
)

echo.
echo [4/4] Testing email service...
echo Testing email service initialization...

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start the backend server: npm start
echo 2. The email processor will start automatically
echo 3. Use the API endpoints to manage repository watches
echo.
echo API Endpoints:
echo - GET  /api/watching/watches - Get watched repositories
echo - POST /api/watching/watches - Add repository to watch
echo - DELETE /api/watching/watches/:id - Remove repository from watch
echo - POST /api/watching/test-email - Test email configuration
echo.
pause
