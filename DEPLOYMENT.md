# FleetTrack Deployment Guide

This guide covers deploying FleetTrack to production, including Firebase configuration and Vercel hosting.

## Prerequisites

- Firebase account with a project created
- Vercel account (free tier works)
- Firebase CLI installed: `npm install -g firebase-tools`
- Git repository connected to Vercel

## Step 1: Firebase Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password"
   - Enable "Google" sign-in
4. Create Firestore Database:
   - Go to Firestore Database
   - Click "Create database"
   - Start in production mode (we'll deploy security rules next)
   - Choose a location close to your users

### 1.2 Deploy Firestore Security Rules

1. Login to Firebase CLI:

   ```bash
   firebase login
   ```

2. Initialize Firebase in your project:

   ```bash
   cd fleettrack
   firebase init firestore
   ```

   - Select your Firebase project
   - Accept default file names (firestore.rules and firestore.indexes.json)

3. Deploy security rules and indexes:

   ```bash
   firebase deploy --only firestore
   ```

4. Verify deployment:
   - Go to Firebase Console > Firestore Database > Rules
   - You should see the deployed rules
   - Go to Indexes tab to see composite indexes

### 1.3 Get Firebase Configuration

1. Go to Project Settings in Firebase Console
2. Under "Your apps", click the web icon (</>)
3. Register your app (name it "FleetTrack Web")
4. Copy the Firebase configuration object

## Step 2: Vercel Deployment

### 2.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository
4. Select the `fleettrack` directory as the root

### 2.2 Configure Build Settings

Vercel should auto-detect Vite. Verify these settings:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2.3 Add Environment Variables

In Vercel project settings, add these environment variables:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Important**: Use the values from your Firebase configuration (Step 1.3)

### 2.4 Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit your deployment URL

## Step 3: Post-Deployment Verification

### 3.1 Test Authentication

1. Visit your deployed app
2. Try signing up with email/password
3. Try signing in with Google
4. Verify you can access the dashboard

### 3.2 Test Data Operations

1. Add a vehicle
2. Create a daily entry
3. Add an expense
4. Check analytics dashboard
5. Verify all data is saved and retrieved correctly

### 3.3 Verify Security Rules

Test that security rules are working:

1. Open browser DevTools > Console
2. Try to access another user's data (should fail)
3. Try to create invalid data (should fail)
4. Check Firestore Console for any security rule violations

## Step 4: Configure Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Firebase Auth domain:
   - Go to Firebase Console > Authentication > Settings
   - Add your custom domain to "Authorized domains"

## Continuous Deployment

Vercel automatically deploys when you push to your main branch:

- **Production**: Pushes to `main` branch
- **Preview**: Pull requests get preview URLs
- **Instant Rollback**: Revert to previous deployment anytime

## Monitoring and Maintenance

### Firebase Console

Monitor your app in Firebase Console:

- **Authentication**: User sign-ups and activity
- **Firestore**: Database usage and queries
- **Usage**: Check quotas and limits

### Vercel Dashboard

Monitor deployments in Vercel:

- **Analytics**: Page views and performance
- **Logs**: Build and runtime logs
- **Performance**: Core Web Vitals

## Troubleshooting

### Build Fails

- Check environment variables are set correctly
- Verify all dependencies are in package.json
- Check build logs in Vercel dashboard

### Authentication Issues

- Verify Firebase Auth domain includes your Vercel domain
- Check environment variables match Firebase config
- Ensure Google OAuth is configured with correct redirect URIs

### Firestore Permission Errors

- Verify security rules are deployed
- Check that userId is being set correctly in all documents
- Review Firestore Console for rule evaluation logs

### Data Not Loading

- Check browser console for errors
- Verify Firestore indexes are deployed
- Check Firebase Console for quota limits

## Security Best Practices

1. **Never commit** `.env.local` to Git
2. **Rotate API keys** if accidentally exposed
3. **Monitor** Firebase Console for unusual activity
4. **Enable** Firebase App Check for additional security
5. **Review** security rules regularly
6. **Set up** budget alerts in Firebase Console

## Updating Security Rules

When you need to update security rules:

1. Edit `firestore.rules` file
2. Test locally if possible (use Firebase Emulator)
3. Deploy to Firebase:
   ```bash
   firebase deploy --only firestore:rules
   ```
4. Verify in Firebase Console
5. Test in production

## Backup Strategy

Firebase automatically backs up your data, but consider:

1. **Export data** regularly using Firebase CLI
2. **Version control** your security rules
3. **Document** any manual data migrations
4. **Test restore** procedures periodically

## Support

- Firebase Documentation: https://firebase.google.com/docs
- Vercel Documentation: https://vercel.com/docs
- React Documentation: https://react.dev
