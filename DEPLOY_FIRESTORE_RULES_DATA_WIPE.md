# 🔥 Deploy Updated Firestore Rules for Data Wipe Functionality

## ⚠️ **CRITICAL: Deploy These Rules to Fix Data Wipe Permissions**

The system admin data wipe functionality requires updated Firestore security rules.

---

## 📋 **What Changed:**

### **Daily Entries Delete Rule:**
**Before:**
```javascript
allow delete: if isAuthenticated() && (
  hasCompanyAccess(resource.data.companyId) || 
  isOwner(resource.data.userId)
);
```

**After:**
```javascript
allow delete: if isAuthenticated() && (
  hasCompanyAccess(resource.data.companyId) || 
  isOwner(resource.data.userId) ||
  isAdmin()  // ← ADDED: System admins can delete any entry
);
```

### **Expenses Delete Rule:**
**Before:**
```javascript
allow delete: if isAuthenticated() && 
  hasCompanyAccess(resource.data.companyId) &&
  exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
  (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'company_admin' ||
   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'company_manager' ||
   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'system_admin');
```

**After:**
```javascript
allow delete: if isAuthenticated() && (
  isAdmin() ||  // ← ADDED: System admins can delete any expense
  (hasCompanyAccess(resource.data.companyId) &&
   exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
   (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'company_admin' ||
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'company_manager'))
);
```

---

## 🚀 **Deployment Steps:**

### **Option 1: Firebase Console (Recommended)**

1. **Go to Firebase Console:**
   ```
   https://console.firebase.google.com/
   ```

2. **Select Your Project:**
   - Click on "FleetTrack" project

3. **Navigate to Firestore Rules:**
   - Click "Firestore Database" in left sidebar
   - Click "Rules" tab at the top

4. **Update Rules:**
   - Copy the entire content from `firestore.rules` file
   - Paste into the Firebase Console editor
   - Click "Publish"

5. **Verify:**
   - Rules should deploy within seconds
   - Check for any syntax errors

---

### **Option 2: Firebase CLI**

1. **Install Firebase CLI (if not installed):**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**
   ```bash
   firebase login
   ```

3. **Deploy Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Verify Deployment:**
   ```
   ✔ Deploy complete!
   ```

---

## ✅ **After Deployment:**

### **Test Data Wipe:**

1. **Login as System Admin**
2. **Go to System Admin Dashboard**
3. **Find a company**
4. **Click "Reset Data" button**
5. **Select data types to wipe**
6. **Click "Wipe Data"**

**Expected Result:**
```
✅ Successfully wiped company data
- Daily Entries: X deleted
- Expenses: Y deleted
- Total: Z deleted
```

---

## 🔒 **Security Notes:**

### **Who Can Delete:**

**Daily Entries:**
- ✅ System Admins (any entry)
- ✅ Company Admins/Managers (their company's entries)
- ✅ Drivers (their own entries)

**Expenses:**
- ✅ System Admins (any expense)
- ✅ Company Admins/Managers (their company's expenses)
- ❌ Drivers (cannot delete expenses)

### **Protection:**
- System admin role is verified in Firestore rules
- Company data isolation maintained
- Regular users cannot delete other companies' data

---

## 🐛 **Troubleshooting:**

### **Error: "Missing or insufficient permissions"**
**Solution:** Deploy the updated rules using steps above

### **Error: "Invalid rule syntax"**
**Solution:** 
1. Check for syntax errors in Firebase Console
2. Ensure all brackets are balanced
3. Verify helper functions are defined

### **Rules Not Taking Effect:**
**Solution:**
1. Wait 30 seconds after deployment
2. Clear browser cache
3. Re-login to the application
4. Try again

---

## 📝 **Verification Checklist:**

- [ ] Firestore rules deployed successfully
- [ ] No syntax errors in Firebase Console
- [ ] System admin can wipe company data
- [ ] Company admins cannot wipe other companies' data
- [ ] Drivers cannot access data wipe functionality
- [ ] Data wipe statistics are accurate

---

## ⚡ **Quick Deploy Command:**

```bash
# From project root
firebase deploy --only firestore:rules
```

---

**Deploy these rules immediately to enable the data wipe functionality!** 🚀
