# Company Name Change System

## ⚠️ CRITICAL WARNING SYSTEM

When an admin attempts to change the company name, they will face a **TWO-STEP CONFIRMATION** process with stern warnings about the repercussions.

---

## 🔒 Two-Step Confirmation Process

### Step 1: Initial Warning Dialog

```
⚠️ WARNING: CHANGING COMPANY NAME

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are about to change the company name from:
"ABC Transport" → "XYZ Logistics"

CRITICAL IMPACTS:

❌ ALL pending invitations will show the NEW name
❌ ALL invitation links will reference the NEW name
❌ Company branding will change everywhere
❌ Reports and documents will show NEW name
❌ Email notifications will use NEW name

⚠️ THIS CHANGE IS IMMEDIATE AND AFFECTS:
   • All team members
   • All pending invitations
   • All system references

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Are you ABSOLUTELY SURE you want to proceed?

Type "YES" in the next prompt to confirm.

[Cancel]  [OK]
```

### Step 2: Typed Confirmation

```
FINAL CONFIRMATION

Type "YES" (in capital letters) to confirm company name change:

[Input box: ___________]

[Cancel]  [OK]
```

**User must type exactly "YES" (capital letters) to proceed.**

If user types anything else or cancels:
```
Company name change cancelled. No changes were made.
```

---

## 🔄 What Happens When Name Changes

### 1. ✅ **Company Document Updated**
```javascript
companies/{companyId}
  name: "XYZ Logistics"  // ← Updated
  logoUrl: "..."
  address: {...}
  contact: {...}
```

### 2. ✅ **All Pending Invitations Updated**
```javascript
// Before:
{
  token: "base64_encoded_data",
  decodedData: {
    companyName: "ABC Transport",  // ← Old name
    email: "driver@example.com",
    ...
  }
}

// After:
{
  token: "base64_encoded_data_updated",
  decodedData: {
    companyName: "XYZ Logistics",  // ← New name
    email: "driver@example.com",
    ...
  }
}
```

### 3. ✅ **System-Wide Updates**
- Navbar shows new name
- Dashboard shows new name
- Reports show new name
- Invitation emails reference new name
- All UI components reflect new name

---

## 📊 What Gets Updated

### Automatically Updated:
1. ✅ Company document in Firestore
2. ✅ All pending invitation tokens
3. ✅ Navbar display
4. ✅ Dashboard header
5. ✅ Company settings modal
6. ✅ All real-time UI components

### NOT Updated (Historical Data):
1. ⚠️ Accepted invitations (already used)
2. ⚠️ Historical logs/audit trails
3. ⚠️ Exported reports (already generated)
4. ⚠️ Email notifications (already sent)

---

## 🎯 Use Cases

### Use Case 1: Company Rebranding
```
Scenario: Company changes name from "ABC Transport" to "ABC Logistics"

Step 1: Admin goes to Company Settings
Step 2: Changes name to "ABC Logistics"
Step 3: Sees warning dialog
Step 4: Confirms by clicking OK
Step 5: Types "YES" in confirmation
Step 6: System updates:
  ✅ Company name in database
  ✅ All pending invitations
  ✅ All UI references
Step 7: Success message shown
Step 8: All users see new name immediately
```

### Use Case 2: Merger/Acquisition
```
Scenario: Company A merges with Company B, becomes "AB Group"

Step 1: Admin changes name to "AB Group"
Step 2: Confirms change with warnings
Step 3: System updates everything
Step 4: All pending invitations now show "AB Group"
Step 5: New invitations sent with "AB Group"
Step 6: All team members see "AB Group" in system
```

### Use Case 3: Typo Correction
```
Scenario: Company name was "ABC Transprt" (typo), should be "ABC Transport"

Step 1: Admin fixes typo
Step 2: Confirms change
Step 3: System updates immediately
Step 4: All references corrected
```

---

## 🔒 Security & Validation

### Who Can Change Company Name?
- ✅ Company Admin
- ✅ System Admin
- ❌ Company Manager (cannot access settings)
- ❌ Company User/Driver (cannot access settings)

### Validation Rules:
1. **Required** - Name cannot be empty
2. **Minimum Length** - At least 2 characters
3. **Maximum Length** - Up to 100 characters
4. **Two-Step Confirmation** - Must confirm twice
5. **Typed Confirmation** - Must type "YES" exactly

---

## 📝 Technical Implementation

### Change Detection:
```javascript
const isNameChanged = profileForm.name !== company.name;

if (isNameChanged) {
  // Show warnings
  // Require confirmations
  // Update invitations
}
```

### Invitation Token Update:
```javascript
const updatePendingInvitations = async (companyId, newCompanyName) => {
  // 1. Get all pending invitations
  // 2. Decode each token
  // 3. Update companyName in decoded data
  // 4. Re-encode token
  // 5. Save updated invitations
};
```

### Success Confirmation:
```
✅ Company name updated successfully!

The new name is now active across the entire system.
All pending invitations have been updated.
```

---

## ⚠️ Important Warnings

### What Admins MUST Know:

1. **Immediate Effect**
   - Change takes effect instantly
   - No undo button
   - All users see new name immediately

2. **Pending Invitations**
   - All pending invitation links updated
   - Recipients will see new company name
   - Already-sent emails still show old name

3. **Historical Data**
   - Accepted invitations not changed
   - Historical records keep old name
   - Audit logs show name change event

4. **Team Communication**
   - Inform team before changing
   - Update external branding
   - Update email signatures
   - Update business cards

---

## 🎨 UI Flow

### Company Settings Modal:

```
┌─────────────────────────────────────┐
│ Company Settings                    │
├─────────────────────────────────────┤
│ Company Profile                     │
│                                     │
│ Company Name *                      │
│ ┌─────────────────────────────────┐ │
│ │ ABC Transport                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Other fields...]                   │
│                                     │
│                    [Save Profile]   │
└─────────────────────────────────────┘
```

### When Name Changed:

```
1. User changes name
2. Clicks "Save Profile"
3. ⚠️ Warning dialog appears
4. User clicks OK
5. 📝 Typed confirmation prompt
6. User types "YES"
7. ⏳ Saving...
8. ✅ Success message
9. Modal closes
10. New name everywhere
```

---

## 📋 Checklist for Admins

Before changing company name:

- [ ] Inform all team members
- [ ] Check pending invitations
- [ ] Update external branding
- [ ] Update email signatures
- [ ] Update business documents
- [ ] Update social media
- [ ] Update website
- [ ] Notify clients/partners
- [ ] Backup important data
- [ ] Plan communication strategy

After changing company name:

- [ ] Verify new name in system
- [ ] Check pending invitations
- [ ] Test new invitation links
- [ ] Inform team of completion
- [ ] Update external systems
- [ ] Monitor for issues
- [ ] Document the change

---

## 🚨 Troubleshooting

### Issue: Name change cancelled
**Cause:** User didn't type "YES" exactly
**Solution:** Try again, type "YES" in capital letters

### Issue: Invitations not updated
**Cause:** Error during update process
**Solution:** Check console logs, contact support

### Issue: Old name still showing
**Cause:** Browser cache
**Solution:** Refresh page (Ctrl+F5)

### Issue: Want to undo change
**Cause:** Changed name by mistake
**Solution:** Change it back (same process)

---

## 🎯 Summary

### What Happens:
1. ✅ Two-step confirmation required
2. ✅ Stern warnings shown
3. ✅ Company name updated
4. ✅ All pending invitations updated
5. ✅ All UI references updated
6. ✅ Success confirmation shown

### What Doesn't Happen:
1. ❌ Historical data not changed
2. ❌ Accepted invitations not changed
3. ❌ Already-sent emails not changed
4. ❌ External systems not changed

### Key Takeaways:
- **Serious Decision** - Requires two confirmations
- **Immediate Effect** - Changes apply instantly
- **System-Wide** - Updates everywhere in app
- **Pending Invitations** - All tokens updated
- **No Undo** - Must change back manually

**Use with caution!** ⚠️🔒
