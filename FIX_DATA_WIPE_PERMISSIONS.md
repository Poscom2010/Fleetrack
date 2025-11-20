# 🔧 Fix Data Wipe Permissions Issue

## ⚠️ **Steps to Fix the Permission Error**

The data wipe is failing because of cached authentication tokens. Follow these steps:

---

## 🔄 **Step 1: Re-Login to Refresh Permissions**

1. **Logout** from the application
2. **Close the browser tab completely**
3. **Clear browser cache** (Ctrl + Shift + Delete)
   - Select "Cached images and files"
   - Click "Clear data"
4. **Re-login** as system admin

---

## 🔍 **Step 2: Verify Your Role**

Open browser console (F12) and check the logs when you try to wipe data:

**Expected logs:**
```
🔍 Verifying user permissions for data wipe...
User ID: your-user-id
✅ Token refreshed
User role: system_admin
✅ User verified as system admin
🗑️ Starting data wipe for company: company-id
```

**If you see:**
```
User role: company_admin  ← WRONG!
```

**Then your user role needs to be updated in Firestore.**

---

## 🔥 **Step 3: Update User Role in Firestore (If Needed)**

1. **Go to Firebase Console:**
   ```
   https://console.firebase.google.com/
   ```

2. **Navigate to Firestore Database:**
   - Click "Firestore Database"
   - Click "users" collection
   - Find your user document

3. **Check/Update Role:**
   - Click on your user document
   - Find the "role" field
   - It should be: `system_admin` or `admin`
   - If it's not, click "Edit field" and change it

4. **Save and Re-login**

---

## 🧪 **Step 4: Test Data Wipe**

1. **Login as system admin**
2. **Open browser console (F12)**
3. **Go to System Admin Dashboard**
4. **Click "Reset Data" on a test company**
5. **Watch the console logs**
6. **Click "Wipe Data"**

**Expected console output:**
```
🔍 Verifying user permissions for data wipe...
User ID: abc123
✅ Token refreshed
User role: system_admin
User data: {role: 'system_admin', ...}
✅ User verified as system admin
🗑️ Starting data wipe for company: company-xyz
Selections: {dailyEntries: true, expenses: true}
📋 Fetching daily entries...
Found 150 daily entries
Committing 1 batch(es) for daily entries...
✅ Deleted 150 daily entries
```

---

## 🐛 **Common Issues:**

### **Issue 1: "User role: company_admin"**
**Solution:** Update role to `system_admin` in Firestore

### **Issue 2: "Permission verification failed"**
**Solution:** 
1. Logout completely
2. Clear browser cache
3. Re-login

### **Issue 3: "Missing or insufficient permissions" (after role is correct)**
**Solution:**
1. Wait 5 minutes for Firestore rules to propagate
2. Clear browser cache
3. Re-login
4. Try again

### **Issue 4: Still failing after all steps**
**Solution:** Check browser console for detailed error logs and share them

---

## ✅ **Verification Checklist:**

- [ ] Firestore rules deployed successfully
- [ ] User role is `system_admin` in Firestore
- [ ] Logged out and cleared cache
- [ ] Re-logged in
- [ ] Browser console shows correct role
- [ ] Token refreshed successfully
- [ ] Data wipe works without errors

---

## 📞 **Still Not Working?**

Share the **complete console output** when attempting data wipe, including:
- User ID
- User role
- Any error messages
- Full error stack trace

---

**Follow these steps in order and the data wipe should work!** 🚀
