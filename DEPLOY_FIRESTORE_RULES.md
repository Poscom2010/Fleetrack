# Deploy Updated Firestore Rules

## Issue Fixed
Users were getting "missing or insufficient permissions" error when saving vehicles.

## What Was Changed
Updated `firestore.rules` to:
- ✅ Remove strict `hasRequiredFields()` check that was blocking optional fields
- ✅ Allow `make`, `model`, `nextServiceMileage`, `licenseExpiryDate` and other optional fields
- ✅ Only validate truly required fields: `userId`, `name`, `registrationNumber`, `year`
- ✅ Improved update and delete permissions

## Deploy to Firebase

### Option 1: Using Firebase CLI (Recommended)

```bash
# Make sure you're in the project directory
cd c:\Users\pedzi\OneDrive\Desktop\AI Specialization\FleetTrack\fleettrack

# Deploy the rules
firebase deploy --only firestore:rules
```

### Option 2: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your FleetTrack project
3. Click **Firestore Database** in left menu
4. Click **Rules** tab at the top
5. Copy the entire content from `firestore.rules` file
6. Paste it into the editor
7. Click **Publish**

## Verify It Works

After deploying:

1. Go to your app: `http://localhost:5173/vehicles`
2. Click "Add Vehicle"
3. Fill in required fields:
   - Vehicle Name ✅
   - Registration Number ✅
   - Make ✅
   - Model ✅
   - Year ✅
4. Leave optional fields empty:
   - Next Service Mileage (optional)
   - Disc License Expiry (optional)
5. Click "Add Vehicle"
6. Should save successfully! ✅

## What the New Rules Allow

### Vehicle Creation ✅
- Required: `userId`, `name`, `registrationNumber`, `year`
- Optional: `make`, `model`, `nextServiceMileage`, `licenseExpiryDate`, etc.
- User must be authenticated
- User must own the vehicle (userId matches)
- If company exists, user must have access

### Vehicle Updates ✅
- User must own vehicle OR have company access
- Cannot change userId or companyId
- Can update all other fields

### Vehicle Deletion ✅
- User must own vehicle OR have company access

## Security Maintained ✅

- ✅ Users can only create vehicles for themselves
- ✅ Users can only access their own vehicles or company vehicles
- ✅ Company admins can manage all company vehicles
- ✅ System admins have full access
- ✅ All operations require authentication

## Test After Deployment

```bash
# Test vehicle creation
1. Add vehicle with all fields → Should work ✅
2. Add vehicle without service mileage → Should work ✅
3. Add vehicle without disc expiry → Should work ✅
4. Update vehicle → Should work ✅
5. Delete vehicle → Should work ✅
```

## Troubleshooting

If still getting permission errors:

1. **Check Firebase Console:**
   - Go to Firestore Database → Rules
   - Verify rules are published
   - Check "Simulator" tab to test rules

2. **Check User Authentication:**
   - Make sure user is logged in
   - Check browser console for auth errors

3. **Check Data Structure:**
   - Verify `userId` matches authenticated user
   - Verify `companyId` is correct (or null)

4. **Clear Browser Cache:**
   - Hard refresh: Ctrl + Shift + R
   - Or use incognito mode

## Need Help?

If issues persist:
1. Check Firebase Console → Firestore → Usage tab for errors
2. Check browser console for detailed error messages
3. Verify Firebase project is active and not suspended
