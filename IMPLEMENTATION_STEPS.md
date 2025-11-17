# Multi-Tenant Implementation - Remaining Steps

## ✅ What's Been Completed

1. **Core Services**
   - ✅ `src/services/companyService.js` - Company management
   - ✅ `src/services/userService.js` - User profiles and roles
   - ✅ `src/types/company.js` - Type definitions

2. **Auth System**
   - ✅ Updated `src/hooks/useAuth.jsx` with user profile and company loading
   - ✅ Created `src/components/auth/AdminRoute.jsx`
   - ✅ Created `src/components/auth/CompanyRoute.jsx`

3. **Pages**
   - ✅ `src/pages/CompanySetupPage.jsx` - Company registration
   - ✅ `src/pages/AdminDashboardPage.jsx` - Admin panel

4. **Components**
   - ✅ `src/components/subscription/SubscriptionBanner.jsx` - Trial warnings

5. **Security**
   - ✅ Updated `firestore.rules` with multi-tenant rules
   - ✅ Partially updated `src/services/vehicleService.js`

## 🚧 Critical Steps YOU Need to Complete

### Step 1: Update Entry Service (CRITICAL)

File: `src/services/entryService.js`

**Changes needed:**
1. Add `companyId` parameter to `createDailyEntry`:
   ```javascript
   export const createDailyEntry = async (companyId, entryData) => {
     // Add companyId to the document
     const docRef = await addDoc(collection(db, "dailyEntries"), {
       userId,
       companyId, // ADD THIS
       vehicleId,
       // ... rest of fields
     });
   }
   ```

2. Update `getDailyEntries` to filter by `companyId`:
   ```javascript
   export const getDailyEntries = async (companyId, filters = {}) => {
     const q = query(
       collection(db, "dailyEntries"),
       where("companyId", "==", companyId), // CHANGE FROM userId
       // ... rest of query
     );
   }
   ```

3. Update `createExpense` similarly:
   ```javascript
   export const createExpense = async (companyId, expenseData) => {
     const docRef = await addDoc(collection(db, "expenses"), {
       userId,
       companyId, // ADD THIS
       // ... rest
     });
   }
   ```

4. Update `getExpenses` to filter by `companyId`:
   ```javascript
   export const getExpenses = async (companyId, filters = {}) => {
     const q = query(
       collection(db, "expenses"),
       where("companyId", "==", companyId), // CHANGE FROM userId
       // ... rest
     );
   }
   ```

### Step 2: Update Hooks

#### File: `src/hooks/useVehicles.js`

```javascript
import { useAuth } from "./useAuth";

export const useVehicles = () => {
  const { user, company } = useAuth(); // ADD company
  
  const addVehicle = async (vehicleData) => {
    if (!company) throw new Error("No company selected");
    await createVehicle(user.uid, company.id, vehicleData); // ADD company.id
  };
  
  const loadVehicles = async () => {
    if (!company) return;
    const data = await getVehicles(company.id); // CHANGE FROM user.uid
    setVehicles(data);
  };
  
  // ... rest
};
```

#### File: `src/hooks/useEntries.js`

```javascript
import { useAuth } from "./useAuth";

export const useEntries = () => {
  const { user, company } = useAuth(); // ADD company
  
  const addEntry = async (entryData) => {
    if (!company) throw new Error("No company selected");
    await createDailyEntry(company.id, entryData); // ADD company.id
  };
  
  const loadEntries = async () => {
    if (!company) return;
    const data = await getDailyEntries(company.id); // CHANGE FROM user.uid
    setEntries(data);
  };
  
  // ... rest
};
```

#### File: `src/hooks/useAnalytics.js`

```javascript
// Change all service calls to use companyId instead of userId
const fetchAnalytics = async () => {
  if (!company) return;
  
  const [analytics, mileage, alerts] = await Promise.all([
    getAnalyticsData(company.id, filters), // CHANGE FROM userId
    getMileageTrends(company.id, filters),
    getServiceAlerts(company.id),
  ]);
};
```

### Step 3: Update Analytics Service

File: `src/services/analyticsService.js`

Change all functions to accept `companyId` instead of `userId`:

```javascript
export const getAnalyticsData = async (companyId, filters = {}) => {
  const [vehicles, dailyEntries, expenses] = await Promise.all([
    getVehicles(companyId), // CHANGE FROM userId
    getDailyEntries(companyId, filters),
    getExpenses(companyId, filters),
  ]);
  // ... rest
};
```

### Step 4: Update App Routing

File: `src/App.jsx` (or wherever your routes are defined)

```javascript
import AdminRoute from "./components/auth/AdminRoute";
import CompanyRoute from "./components/auth/CompanyRoute";
import CompanySetupPage from "./pages/CompanySetupPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

// Add these routes:
<Routes>
  {/* Public routes */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />
  
  {/* Company setup (authenticated but no company yet) */}
  <Route
    path="/company/setup"
    element={
      <ProtectedRoute>
        <CompanySetupPage />
      </ProtectedRoute>
    }
  />
  
  {/* Admin routes */}
  <Route
    path="/admin"
    element={
      <AdminRoute>
        <AdminDashboardPage />
      </AdminRoute>
    }
  />
  
  {/* Company routes (require company membership) */}
  <Route
    path="/dashboard"
    element={
      <CompanyRoute>
        <DashboardPage />
      </CompanyRoute>
    }
  />
  
  <Route
    path="/vehicles"
    element={
      <CompanyRoute>
        <VehiclesPage />
      </CompanyRoute>
    }
  />
  
  {/* ... all other app routes wrapped in CompanyRoute */}
</Routes>
```

### Step 5: Add Subscription Banner to Layout

File: `src/components/layout/AppShell.jsx`

```javascript
import SubscriptionBanner from "../subscription/SubscriptionBanner";

export const AppShell = ({ children }) => {
  return (
    <div>
      <header>
        <Navbar />
      </header>
      
      {/* ADD THIS */}
      <SubscriptionBanner />
      
      <main>{children}</main>
    </div>
  );
};
```

### Step 6: Update Navbar for Admin Link

File: `src/components/layout/Navbar.jsx`

```javascript
import { useAuth } from "../../hooks/useAuth";
import { isAdmin } from "../../services/userService";

const Navbar = () => {
  const { userProfile } = useAuth();
  
  return (
    <nav>
      {/* ... existing links */}
      
      {/* ADD THIS */}
      {isAdmin(userProfile) && (
        <Link to="/admin" className="...">
          Admin Panel
        </Link>
      )}
    </nav>
  );
};
```

### Step 7: Deploy Firestore Rules

```bash
cd c:\Users\pedzi\OneDrive\Desktop\AI Specialization\FleetTrack\fleettrack
firebase deploy --only firestore:rules
```

### Step 8: Create First Admin User

1. Sign up a new user in your app
2. Go to Firebase Console → Firestore Database
3. Find the `users` collection
4. Find your user document (ID = your Firebase Auth UID)
5. Edit the document and set:
   ```
   role: "admin"
   companyId: null
   ```

### Step 9: Test the Flow

1. **As Admin:**
   - Login with admin account
   - Navigate to `/admin`
   - You should see the admin dashboard
   - Try creating a company (you'll need to create that page or do it manually in Firestore)

2. **As New User:**
   - Sign up a new account
   - You should be redirected to `/company/setup`
   - Fill out company form
   - After creation, you should see "14-day trial" banner
   - You should be able to add vehicles, entries, etc.

3. **Test Multi-Tenancy:**
   - Create 2 companies with different users
   - Verify each company can only see their own data
   - Verify admin can see all companies

## 🔥 Quick Start Commands

```bash
# 1. Deploy rules
firebase deploy --only firestore:rules

# 2. Start dev server
npm run dev

# 3. Open browser
# http://localhost:5173
```

## 📝 Important Notes

1. **All existing data will NOT work** until you add `companyId` to documents
2. **Start fresh** or manually migrate existing data
3. **Create composite indexes** when Firebase prompts you (click the links in error messages)
4. **Test thoroughly** before deploying to production

## 🆘 Troubleshooting

### "Missing or insufficient permissions"
- Check Firestore rules are deployed
- Verify user has `companyId` in their profile
- Check that documents have `companyId` field

### "No company found"
- User needs to complete company setup
- Check `users` collection has correct `companyId`
- Verify company document exists in `companies` collection

### "Index required"
- Click the link in the error message
- Firebase will auto-generate the index
- Wait 1-2 minutes for index to build

## 🎯 Next Steps After Implementation

1. Add payment integration for subscriptions
2. Add company settings page
3. Add user invitation system
4. Add company logo upload
5. Add subscription renewal flow
6. Add usage analytics for admin

Good luck! 🚀
