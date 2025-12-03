@echo off
echo ========================================
echo  Deploying Firestore Rules to Firebase
echo ========================================
echo.

echo Checking Firebase CLI...
firebase --version
if errorlevel 1 (
    echo ERROR: Firebase CLI not found!
    echo Please install: npm install -g firebase-tools
    pause
    exit /b 1
)

echo.
echo Deploying rules...
firebase deploy --only firestore:rules

if errorlevel 1 (
    echo.
    echo ERROR: Deployment failed!
    echo.
    echo Troubleshooting:
    echo 1. Make sure you're logged in: firebase login
    echo 2. Check if project is initialized: firebase init
    echo 3. Verify firestore.rules file exists
    pause
    exit /b 1
)

echo.
echo ========================================
echo  SUCCESS! Rules deployed successfully
echo ========================================
echo.
echo The following collections are now secured:
echo - vehicles
echo - loadEvents
echo - offloadEvents
echo - tankDiscrepancyAlerts
echo - userProfiles
echo - and more...
echo.
pause
