#!/bin/bash

# FleetTrack Firestore Deployment Script
# This script deploys Firestore security rules and indexes to Firebase

echo "🚀 FleetTrack Firestore Deployment"
echo "=================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI is not installed."
    echo "📦 Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""

# Check if user is logged in
if ! firebase projects:list &> /dev/null
then
    echo "🔐 You need to login to Firebase"
    firebase login
fi

echo "📋 Available Firebase projects:"
firebase projects:list
echo ""

# Prompt for project selection
read -p "Enter your Firebase project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID cannot be empty"
    exit 1
fi

# Set the project
firebase use "$PROJECT_ID"

echo ""
echo "📤 Deploying Firestore security rules and indexes..."
echo ""

# Deploy Firestore rules and indexes
firebase deploy --only firestore

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🔍 Verify your deployment:"
    echo "   1. Go to Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/firestore"
    echo "   2. Check the 'Rules' tab to see deployed security rules"
    echo "   3. Check the 'Indexes' tab to see composite indexes"
    echo ""
    echo "🎉 Your Firestore is now secured and optimized!"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
