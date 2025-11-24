# Deploy Firestore Rules for Acknowledged Gaps

## Issue
Managers getting "Missing or insufficient permissions" when trying to note/acknowledge mileage gaps.

## Solution
The Firestore rules have been updated to allow company admins and managers to create acknowledged gap records.

## Deploy Instructions

### Option 1: Firebase Console (Recommended)
1. Go to https://console.firebase.google.com/
2. Select your FleetTrack project
3. Click "Firestore Database" in the left menu
4. Click the "Rules" tab
5. Copy the entire content from `firestore.rules` file
6. Paste it into the Firebase console
7. Click "Publish"

### Option 2: Firebase CLI
```bash
firebase deploy --only firestore:rules
```

## What Was Added

Added rules for the `acknowledgedGaps` collection:

```javascript
// Acknowledged Gaps collection rules
// Managers can acknowledge/note mileage gaps to mark them as reviewed
match /acknowledgedGaps/{gapId} {
  // Anyone authenticated can read acknowledged gaps
  allow read: if isAuthenticated();
  
  // Company admins and managers can create acknowledged gaps
  allow create: if isAuthenticated() && 
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'company_admin' ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'company_manager' ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'system_admin') &&
    request.resource.data.gapId is string &&
    request.resource.data.acknowledgedBy is string &&
    request.resource.data.acknowledgedBy == request.auth.uid;
  
  // Only system admins can delete acknowledged gaps
  allow delete: if isAuthenticated() && 
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'system_admin';
}
```

## Permissions Summary

**Who can create (acknowledge gaps):**
- ✅ Company Admins
- ✅ Company Managers
- ✅ System Admins

**Who can read:**
- ✅ All authenticated users

**Who can delete:**
- ✅ System Admins only

## Testing After Deploy

1. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)
2. Go to Analytics page
3. Click on unaccounted mileage alert
4. Click "Note as Reviewed (Manager)" button
5. Should see "Gap noted successfully" ✓

## Troubleshooting

If still getting permission errors:
1. Verify rules are published in Firebase Console
2. Check that your user has role = 'company_manager' or 'company_admin'
3. Hard refresh browser (Ctrl+F5)
4. Clear browser cache
5. Check Firebase Console > Firestore > Rules tab to verify deployment time
