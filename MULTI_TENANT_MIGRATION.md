# Multi-Tenant Migration Guide

## Completed Steps ✅

1. **Database Schema & Types**
   - Created `src/types/company.js` with type definitions
   - Defined `SubscriptionStatus` and `UserRole` enums

2. **Services Created**
   - `src/services/companyService.js` - Company CRUD, subscription management
   - `src/services/userService.js` - User profile and role management

3. **Auth Context Updated**
   - Enhanced `src/hooks/useAuth.jsx` to load user profile and company
   - Added `refreshUserData()` method
   - Exposed `userProfile` and `company` in auth context

4. **Pages Created**
   - `src/pages/CompanySetupPage.jsx` - Company registration with 14-day trial
   - `src/pages/AdminDashboardPage.jsx` - Admin panel to manage companies

5. **Firestore Security Rules**
   - Updated `firestore.rules` with multi-tenant access control
   - Added `isAdmin()` and `hasCompanyAccess()` helpers
   - All collections now require `companyId` field

6. **Services Updated**
   - `src/services/vehicleService.js` - Added `companyId` parameter

## Remaining Steps 🚧

### Critical Updates Needed

1. **Update Entry Service**
   - File: `src/services/entryService.js`
   - Add `companyId` parameter to all functions
   - Update queries to filter by `companyId`

2. **Update Hooks**
   - `src/hooks/useVehicles.js` - Pass `companyId` from auth context
   - `src/hooks/useEntries.js` - Pass `companyId` from auth context
   - `src/hooks/useAnalytics.js` - Pass `companyId` from auth context

3. **Add Routing**
   - Update `src/App.jsx` or router file
   - Add routes for:
     - `/company/setup` - Company setup page
     - `/admin` - Admin dashboard (protected)
   - Add route protection based on user role

4. **Create Route Protection Components**
   - `src/components/auth/ProtectedRoute.jsx` - Require authentication
   - `src/components/auth/AdminRoute.jsx` - Require admin role
   - `src/components/auth/CompanyRoute.jsx` - Require company membership

5. **Create Subscription Components**
   - `src/components/subscription/SubscriptionBanner.jsx` - Trial/expiry warnings
   - `src/components/subscription/SubscriptionStatus.jsx` - Display current status

6. **Update Existing Components**
   - All components using `useVehicles`, `useEntries`, etc. need to handle company context
   - Add subscription status checks before allowing actions

7. **Create Admin Company Creation Page**
   - `src/pages/AdminCreateCompanyPage.jsx` - Admin form to create companies

8. **Add Navigation Updates**
   - Update navbar to show admin link for admins
   - Add company settings link
   - Show subscription status in UI

## Testing Checklist

- [ ] Create first admin user manually in Firestore
- [ ] Admin can access admin dashboard
- [ ] Admin can create companies
- [ ] New user can set up company and get 14-day trial
- [ ] Company users can only see their company's data
- [ ] Subscription expiry is enforced
- [ ] Firestore rules prevent cross-company data access

## Manual Setup Required

### Create First Admin User

After deployment, manually create an admin user in Firestore:

```
Collection: users
Document ID: <your-firebase-auth-uid>
Fields:
  - email: "admin@example.com"
  - role: "admin"
  - companyId: null
  - createdAt: <timestamp>
  - updatedAt: <timestamp>
```

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### Create Firestore Indexes

The following composite indexes are required:

1. **dailyEntries**
   - companyId (Ascending)
   - userId (Ascending)
   - vehicleId (Ascending)
   - date (Ascending)

2. **expenses**
   - companyId (Ascending)
   - userId (Ascending)
   - vehicleId (Ascending)
   - date (Ascending)

3. **vehicles**
   - companyId (Ascending)
   - createdAt (Descending)

Create these via Firebase Console or wait for error messages with auto-generated links.

## Migration Path for Existing Data

If you have existing data without `companyId`:

1. Create a migration script to add `companyId` to all existing documents
2. Or start fresh with new collections
3. Or manually update documents in Firebase Console

## Key Changes Summary

- All data operations now scoped to `companyId`
- User authentication includes role and company membership
- Admin users have access to all companies
- 14-day free trial automatically applied on company creation
- Subscription status checked before data operations
- Firestore rules enforce multi-tenant isolation
