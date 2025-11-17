# Firebase Setup Guide for FleetTrack

Follow these steps to set up Firebase for your FleetTrack application.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `FleetTrack` (or your preferred name)
4. Click **Continue**
5. Disable Google Analytics (optional, not needed for this app)
6. Click **Create project**
7. Wait for project creation, then click **Continue**

## Step 2: Enable Authentication

1. In the Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Go to the **"Sign-in method"** tab
4. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle **Enable** to ON
   - Click **Save**
5. Enable **Google** (optional but recommended):
   - Click on "Google"
   - Toggle **Enable** to ON
   - Select a support email from dropdown
   - Click **Save**

## Step 3: Create Firestore Database

1. In the Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Select **"Start in production mode"** (we'll update rules next)
4. Click **Next**
5. Choose your Cloud Firestore location (select closest to your users)
   - Recommended: `us-central` or your region
6. Click **Enable**
7. Wait for database creation

## Step 4: Set Up Firestore Security Rules

1. In Firestore Database, click the **"Rules"** tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Vehicles collection
    match /vehicles/{vehicleId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isOwner(resource.data.userId);
    }

    // Daily entries collection
    match /dailyEntries/{entryId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isOwner(resource.data.userId);
    }

    // Expenses collection
    match /expenses/{expenseId} {
      allow read: if isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isOwner(resource.data.userId);
    }
  }
}
```

3. Click **Publish**

## Step 5: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** (⚙️) next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** (`</>`) to add a web app
5. Enter app nickname: `FleetTrack Web`
6. **Do NOT** check "Also set up Firebase Hosting"
7. Click **"Register app"**
8. Copy the `firebaseConfig` object values

You'll see something like:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

## Step 6: Update Environment Variables

1. Open the file `fleettrack/.env.local`
2. Replace the placeholder values with your actual Firebase config:

```env
VITE_FIREBASE_API_KEY=your-actual-apiKey-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

3. Save the file

## Step 7: Restart Development Server

1. Stop the current dev server (Ctrl+C in terminal)
2. Start it again: `npm run dev`
3. Open http://localhost:5173/

## Step 8: Test the Application

1. Go to http://localhost:5173/
2. You should see the login page without errors
3. Click **"Sign in with Google"** or enter email/password
4. Create a new account or sign in
5. You should be redirected to the dashboard

## Troubleshooting

### Error: "Firebase: Error (auth/unauthorized-domain)"

**Solution:**

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add `localhost` if not already there

### Error: "Missing or insufficient permissions"

**Solution:**

1. Check that Firestore rules are published correctly
2. Make sure you're signed in
3. Verify the rules match the ones in Step 4

### Error: "Firebase: Error (auth/popup-blocked)"

**Solution:**

- Allow popups for localhost in your browser
- Or use email/password authentication instead

## Optional: Create Firestore Indexes

For better query performance, create these indexes:

1. Go to Firestore Database → **Indexes** tab
2. Click **"Create index"**
3. Create the following composite indexes:

**Index 1: Daily Entries by User and Date**

- Collection ID: `dailyEntries`
- Fields:
  - `userId` (Ascending)
  - `date` (Descending)
- Query scope: Collection

**Index 2: Expenses by User and Date**

- Collection ID: `expenses`
- Fields:
  - `userId` (Ascending)
  - `date` (Descending)
- Query scope: Collection

**Index 3: Vehicles by User and Creation Date**

- Collection ID: `vehicles`
- Fields:
  - `userId` (Ascending)
  - `createdAt` (Descending)
- Query scope: Collection

## Security Best Practices

1. **Never commit `.env.local` to Git** - It's already in `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Keep Firebase rules restrictive** - Only allow authenticated users to access their own data
4. **Enable App Check** (optional) - For production, add Firebase App Check for additional security

## Next Steps

Once Firebase is set up:

1. ✅ Create a test account
2. ✅ Add some vehicles
3. ✅ Create daily entries
4. ✅ Add expenses
5. ✅ View analytics

Your FleetTrack app is now fully functional with Firebase backend!
