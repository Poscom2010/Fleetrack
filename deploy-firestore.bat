@echo off
REM FleetTrack Firestore Deployment Script for Windows
REM This script deploys Firestore security rules and indexes to Firebase

echo.
echo 🚀 FleetTrack Firestore Deployment
echo ==================================
echo.

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Firebase CLI is not installed.
    echo 📦 Install it with: npm install -g firebase-tools
    exit /b 1
)

echo ✅ Firebase CLI found
echo.

REM Check if user is logged in
firebase projects:list >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 🔐 You need to login to Firebase
    firebase login
)

echo 📋 Available Firebase projects:
firebase projects:list
echo.

REM Prompt for project selection
set /p PROJECT_ID="Enter your Firebase project ID: "

if "%PROJECT_ID%"=="" (
    echo ❌ Project ID cannot be empty
    exit /b 1
)

REM Set the project
firebase use %PROJECT_ID%

echo.
echo 📤 Deploying Firestore security rules and indexes...
echo.

REM Deploy Firestore rules and indexes
firebase deploy --only firestore

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Deployment successful!
    echo.
    echo 🔍 Verify your deployment:
    echo    1. Go to Firebase Console: https://console.firebase.google.com/project/%PROJECT_ID%/firestore
    echo    2. Check the 'Rules' tab to see deployed security rules
    echo    3. Check the 'Indexes' tab to see composite indexes
    echo.
    echo 🎉 Your Firestore is now secured and optimized!
) else (
    echo.
    echo ❌ Deployment failed. Please check the error messages above.
    exit /b 1
)
