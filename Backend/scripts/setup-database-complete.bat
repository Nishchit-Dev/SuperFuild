@echo off
echo Setting up AISecure database...

echo.
echo Step 1: Creating database...
psql -U postgres -c "CREATE DATABASE AISecure_auth;" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Database created successfully
) else (
    echo ⚠️  Database might already exist or there was an error
)

echo.
echo Step 2: Creating tables...
psql -U postgres -d AISecure_auth -f "database\schema.sql"
if %errorlevel% equ 0 (
    echo ✅ Basic tables created successfully
) else (
    echo ❌ Error creating basic tables
)

echo.
echo Step 3: Creating GitHub integration tables...
psql -U postgres -d AISecure_auth -f "database\github-schema.sql"
if %errorlevel% equ 0 (
    echo ✅ GitHub tables created successfully
) else (
    echo ❌ Error creating GitHub tables
)

echo.
echo Step 4: Testing database connection...
node scripts\test-db-connection.js
if %errorlevel% equ 0 (
    echo ✅ Database connection test passed
) else (
    echo ❌ Database connection test failed
)

echo.
echo Database setup complete!
echo.
echo Next steps:
echo 1. Update your .env file with correct database credentials
echo 2. Run: npm start
echo 3. Test the application
pause











