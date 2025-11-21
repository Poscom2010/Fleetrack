# ✅ Team Page - Show Uninvited Drivers with Trip Data

## 🎯 **The Problem:**

Company admins/managers could not see drivers who had trip data captured for them but hadn't been invited yet. Only registered/invited users were showing on the team page.

**User reported:** "I have more than 2 drivers i captured data for but not showing. So for these drivers not invited yet show their full data and then on Last system login say not yet invited or something"

---

## ✅ **The Solution:**

Modified the Team Management page to:
1. Include driver profiles (uninvited drivers) who have trip data
2. Show their full information (name, email, km travelled)
3. Display "Not yet invited" in the Last Login column
4. Show "⏳ Pending Invitation" badge in Role column
5. Provide "Invite Driver" button instead of "Reset Password"

---

## 🔧 **Changes Made:**

### **File:** `src/pages/TeamPage.jsx`

#### **1. Modified teamMembers to include driver profiles with data:**

**Before:**
```javascript
const teamMembers = users;
```

**After:**
```javascript
const teamMembers = React.useMemo(() => {
  const members = [...users];
  
  // Add uninvited driver profiles who have trip data
  driverProfiles.forEach(profile => {
    // Check if this profile has any trip data
    if (driverStats[profile.id] && driverStats[profile.id].totalKm > 0) {
      // Add as a pseudo-user with special flag
      members.push({
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email || 'Not provided',
        phoneNumber: profile.phoneNumber,
        role: 'driver_profile', // Special role to identify uninvited drivers
        isDriverProfile: true,
        lastLoginAt: null, // Not invited yet
      });
    }
  });
  
  return members;
}, [users, driverProfiles, driverStats]);
```

**What this does:**
- ✅ Keeps all registered users
- ✅ Adds driver profiles who have trip data (totalKm > 0)
- ✅ Marks them with `isDriverProfile: true` flag
- ✅ Sets `lastLoginAt: null` since they haven't been invited

---

#### **2. Updated Last Login display:**

**Mobile & Desktop View:**
```javascript
const lastLoginText = driver.isDriverProfile
  ? 'Not yet invited'
  : lastLogin
  ? `${lastLogin.toLocaleDateString()} ${lastLogin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  : 'Never';
```

**Status indicator:**
```javascript
let loginStatus = 'active';
if (driver.isDriverProfile) {
  loginStatus = 'pending'; // yellow - uninvited driver
} else if (lastLogin) {
  // ... existing logic
}
```

**Status colors:**
```javascript
<div className={`h-2 w-2 rounded-full ${
  loginStatus === 'active' ? 'bg-green-500' :
  loginStatus === 'warning' ? 'bg-orange-500' :
  loginStatus === 'inactive' ? 'bg-red-500' :
  loginStatus === 'pending' ? 'bg-yellow-500' :  // ✨ NEW
  'bg-slate-500'
}`} />
```

---

#### **3. Updated Role column:**

**Mobile View:**
```javascript
{driver.isDriverProfile ? (
  <div className="mt-1">
    <span className="inline-block px-3 py-1.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
      ⏳ Pending Invitation
    </span>
    <p className="text-xs text-slate-500 mt-1">Driver has trip data but hasn't been invited yet</p>
  </div>
) : // ... existing role logic
}
```

**Desktop View:**
```javascript
{driver.isDriverProfile ? (
  <span className="px-3 py-1.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
    ⏳ Pending Invitation
  </span>
) : // ... existing role logic
}
```

---

#### **4. Updated Actions column:**

**Mobile View:**
```javascript
{driver.isDriverProfile ? (
  <button
    onClick={() => setShowInviteModal(true)}
    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
  >
    Invite Driver
  </button>
) : (
  <button
    onClick={() => handleResetPassword(driver.id, driver.email)}
    className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition"
  >
    Reset Password
  </button>
)}
```

**Desktop View:**
```javascript
{driver.isDriverProfile ? (
  <button
    onClick={() => setShowInviteModal(true)}
    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition"
    title="Invite Driver"
  >
    Invite Driver
  </button>
) : (
  <button
    onClick={() => handleResetPassword(driver.id, driver.email)}
    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs transition"
    title="Reset Password"
  >
    Reset Password
  </button>
)}
```

---

## 📊 **How It Works:**

### **Data Flow:**

```
1. Page loads → loadData() called
   ↓
2. Loads:
   - users (registered/invited)
   - driverProfiles (uninvited)
   - driverStats (km data)
   ↓
3. teamMembers useMemo runs:
   - Starts with all users
   - Checks each driverProfile
   - If profile has totalKm > 0:
     → Add to teamMembers with isDriverProfile flag
   ↓
4. Table renders:
   - Shows all users
   - Shows uninvited drivers with trip data
   - Different UI for uninvited drivers
```

---

## 🎨 **UI Display:**

### **Uninvited Driver Row (Desktop):**

| Driver | Assigned Vehicle | Total km travelled | Last system login | Role | Actions |
|--------|------------------|-------------------|-------------------|------|---------|
| John Doe<br>john@example.com | No vehicle | 150.50 km | 🟡 Not yet invited | ⏳ Pending Invitation | [Invite Driver] |

### **Invited/Registered Driver Row (Desktop):**

| Driver | Assigned Vehicle | Total km travelled | Last system login | Role | Actions |
|--------|------------------|-------------------|-------------------|------|---------|
| Jane Smith<br>jane@example.com | Vehicle A (ABC-123) | 250.75 km | 🟢 11/21/2025 08:37 PM | Driver | [Reset Password] |

---

## 🎨 **Status Indicators:**

| Status | Color | Meaning |
|--------|-------|---------|
| 🟢 Green | Active | Logged in recently (< 14 days) |
| 🟠 Orange | Warning | Logged in 14-30 days ago |
| 🔴 Red | Inactive | Logged in > 30 days ago |
| 🟡 Yellow | Pending | Not yet invited (driver profile) |
| ⚪ Gray | Never | Never logged in |

---

## 🧪 **Testing:**

### **Test 1: Uninvited Driver with Trip Data**
1. Create a driver profile (don't invite)
2. Capture trip data for that driver
3. Go to `/team`
4. ✅ Should see driver in the list
5. ✅ Last Login: "Not yet invited" (yellow dot)
6. ✅ Role: "⏳ Pending Invitation"
7. ✅ Total km: Shows actual km from trips
8. ✅ Actions: "Invite Driver" button

### **Test 2: Uninvited Driver without Trip Data**
1. Create a driver profile (don't invite)
2. Don't capture any trips
3. Go to `/team`
4. ❌ Should NOT see driver in the list
5. ✅ Only drivers with trip data appear

### **Test 3: Invited Driver**
1. Invite a driver
2. Driver registers
3. Go to `/team`
4. ✅ Shows with normal status
5. ✅ Last Login: Actual date/time or "Never"
6. ✅ Role: "Driver" (can be changed)
7. ✅ Actions: "Reset Password" button

### **Test 4: Mixed List**
1. Have 2 uninvited drivers with data
2. Have 3 invited/registered drivers
3. Go to `/team`
4. ✅ Should see all 5 drivers
5. ✅ Uninvited ones marked with yellow status
6. ✅ Invited ones with normal status

---

## 📋 **Driver Types on Team Page:**

### **Type 1: Registered Users (Invited & Accepted)**
```javascript
{
  id: "user_123",
  fullName: "Jane Smith",
  email: "jane@example.com",
  role: "company_user",
  lastLoginAt: Timestamp,
  isDriverProfile: undefined  // Not set
}
```
**Display:**
- ✅ Shows actual last login time
- ✅ Can reset password
- ✅ Can assign vehicles
- ✅ Can change role (if admin)

---

### **Type 2: Driver Profiles (Not Invited)**
```javascript
{
  id: "profile_456",
  fullName: "John Doe",
  email: "john@example.com",
  role: "driver_profile",
  lastLoginAt: null,
  isDriverProfile: true  // ✨ Special flag
}
```
**Display:**
- ✅ Shows "Not yet invited"
- ✅ Shows "⏳ Pending Invitation" badge
- ✅ Shows actual km from trips
- ✅ Can invite driver
- ✅ Yellow status indicator

---

### **Type 3: Driver Profiles (No Trip Data)**
```javascript
{
  id: "profile_789",
  fullName: "Bob Johnson",
  email: "bob@example.com",
  // No trips captured
}
```
**Display:**
- ❌ **NOT SHOWN** on team page
- ❌ No trip data = not included
- ✅ Will appear once trips are captured

---

## 💡 **Business Logic:**

### **Why only show uninvited drivers with trip data?**

1. **Relevance:** If a driver has no trips, they're not actively working
2. **Clarity:** Admins see only drivers who are actually driving
3. **Action:** Drivers with data need to be invited to access the system
4. **Clean UI:** Avoids cluttering the list with inactive profiles

### **When to invite:**

- ✅ Driver has trip data → Invite them so they can log in
- ✅ Driver needs to see their own trips
- ✅ Driver needs to capture their own data
- ❌ Driver has no trips → Wait until they start driving

---

## 🔄 **Workflow:**

### **Scenario: New Driver Starts Work**

1. **Admin creates driver profile**
   - Name: John Doe
   - Email: john@example.com
   - Status: Uninvited

2. **Admin captures trips for John**
   - Trip 1: 50 km
   - Trip 2: 100 km
   - Total: 150 km

3. **John appears on Team page**
   - ✅ Shows in list
   - ✅ Total km: 150 km
   - ✅ Status: "Not yet invited"
   - ✅ Action: "Invite Driver" button

4. **Admin clicks "Invite Driver"**
   - Opens invite modal
   - Can send invitation
   - John receives email/link

5. **John accepts invitation**
   - Registers account
   - Status changes to normal user
   - Can now log in and see own trips

---

## ✅ **Summary:**

### **What Was Fixed:**
- ✅ Uninvited drivers with trip data now appear on team page
- ✅ Shows their full information (name, email, km)
- ✅ Displays "Not yet invited" status
- ✅ Shows "⏳ Pending Invitation" badge
- ✅ Provides "Invite Driver" action button
- ✅ Yellow status indicator for easy identification

### **Who Sees What:**
- ✅ **Company Admin/Manager:** Sees ALL drivers (invited + uninvited with data)
- ✅ **System Admin:** Sees ALL drivers across all companies
- ✅ **Drivers:** Cannot access team page

### **Data Visibility:**
- ✅ Uninvited drivers WITH trip data: **VISIBLE**
- ❌ Uninvited drivers WITHOUT trip data: **HIDDEN**
- ✅ Invited/registered drivers: **ALWAYS VISIBLE**

---

**Company admins can now see and manage all drivers who have trip data, even if they haven't been invited yet!** 👥✅📊
