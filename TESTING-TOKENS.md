# Frontend Token Testing Guide

> Quick reference for testing API token creation and management in Docnine UI

## Test Environment Setup

### Start Both Servers

```bash
# Terminal 1: Backend
cd docnine-server
npm run dev

# Terminal 2: Frontend
cd docnine-ui
npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API Base: http://localhost:8000/api

---

## Test 1: Create API Token via UI

### Steps

1. **Navigate to Settings**
   - URL: http://localhost:5173/projects/{PROJECT_ID}/settings
   - Click **API Tokens** tab

2. **Create Token**
   - Click **+ New Token** button
   - **Name:** `Test Token`
   - **Description:** `Testing token authentication`
   - **Scopes:** Check `api`, `mcp`, `cli`
   - **Expiration:** Leave empty
   - Click **Create Token**

### Expected UI Behavior

✅ **Modal appears** with:
- Green header: "Token Created Successfully!"
- Token value displayed (starts with `docnine_`)
- Copy button works (shows checkmark)
- Token metadata (name, scopes, last chars)
- MCP note if `mcp` scope selected
- "I've saved my token" button

✅ **Token appears in list** with:
- Token name
- Description
- Scopes badges: `api`, `mcp`, `cli`
- Creation date
- Trash icon for revocation
- Stats updated

### Check Console

Open **DevTools** (F12) → **Console** tab:

```javascript
// You should NOT see error messages
// Look for successful API responses

// Network tab (F12 → Network)
// POST /auth/tokens → Status 201 ✅
// GET /auth/tokens → Status 200 ✅
```

---

## Test 2: Copy Token Button

### Steps

1. **Create token** (see Test 1)
2. **Click copy button** (icon at top-right of token display)
3. **Paste in terminal:**
   ```bash
   # Paste token
   export TOKEN="<paste here>"
   echo $TOKEN
   # Should show: docnine_abc123xyz...
   ```

### Expected Behavior

✅ Button shows checkmark for 2 seconds after click  
✅ Token copied to clipboard  
✅ Token is full value (not truncated)

---

## Test 3: Verify Token in List

### Steps

1. **Create token**
2. **Close modal** ("I've saved my token")
3. **Check token list**

### Expected UI

Token row shows:
- ✅ Token name
- ✅ Description
- ✅ Last 6 characters (e.g., `...abc123`)
- ✅ Scopes: `api`, `mcp`, `cli`
- ✅ Creation date
- ✅ Trash icon (active, not disabled)

### Stats Box

Should show:
- ✅ **Total:** 1+
- ✅ **Active:** 1+
- ✅ **Revoked:** 0 (unless you revoked one)
- ✅ **Expiring Soon:** 0 (unless setting future expiry)

---

## Test 4: Revoke Token

### Steps

1. **Create token** (see Test 1)
2. **Click trash icon** on token row
3. **Confirm dialog:** "Revoke this token?..."
4. **Verify token revoked**

### Expected Behavior

✅ Confirmation dialog appears  
✅ Token now shows **"Revoked"** badge (red)  
✅ Revoke button disabled (greyed out)  
✅ Stats updated: Active -1, Revoked +1  
✅ Last used and revoked date show

---

## Test 5: Multiple Tokens

### Steps

1. **Create Token 1:** Name = "Claude MCP"
2. **Create Token 2:** Name = "CI Pipeline"
3. **Create Token 3:** Name = "Local Dev"
4. **Verify list**

### Expected Behavior

✅ All 3 tokens listed  
✅ Stats show: Total = 3, Active = 3  
✅ Each token has unique last 6 chars  
✅ Can revoke individual tokens  
✅ Others unaffected

---

## Test 6: Token Scopes

### Test Case 1: MCP Scope

```javascript
// Create token with ONLY "mcp" scope
// Scopes: [unchecked api] [checked mcp] [unchecked cli]
```

Expected in list:
```
Token Name: "MCP Only"
Scopes: mcp  ← Only one badge
```

### Test Case 2: All Scopes

```javascript
// Create token with ALL scopes
// Scopes: [checked api] [checked mcp] [checked cli]
```

Expected in list:
```
Token Name: "Full Access"
Scopes: api, mcp, cli  ← Three badges
```

### Test Case 3: API Only

```javascript
// Create token with ONLY "api" scope
```

Expected:
```
Scopes: api  ← Only API
// MCP note should NOT appear
```

---

## Test 7: Token Expiration

### Test Case 1: No Expiration

```javascript
// Leave "Expiration (optional)" empty
// Click Create
```

Expected:
- Token created successfully
- List shows: No "Expires" date
- Stats: Expiring Soon = 0

### Test Case 2: Future Date

```javascript
// Set expiration to: 2025-12-31
// Click Create
```

Expected:
- Token created successfully
- List shows: `Expires Dec 31, 2025`
- Stats: Expiring Soon = 0 (unless within 30 days)

### Test Case 3: Past Date (Can't happen - input disabled)

```javascript
// Input should only allow future dates
// Current: March 14, 2025
// Can select: March 15+
```

---

## Test 8: Error Handling

### Missing Token Name

**Steps:**
1. Click **+ New Token**
2. Leave **Name** empty
3. Click **Create Token**

**Expected:**
```
Error: "Token name is required"
Modal stays open
Form data preserved
```

### Network Error

**Steps:**
1. Stop backend server
2. Create token (button appears to work)
3. Observe result

**Expected:**
```
Error message appears
Modal shows error box
"Create Token" button still clickable
Can retry after server restarts
```

---

## Test 9: Copy Token from List

### Steps

1. **Create token**
2. **Close modal**
3. **On token row**, right-click or use context menu
4. **Copy full token value** (future feature)

**Note:** Currently, only the creation modal shows full token. Once created, only last 6 chars shown (for security).

---

## Test 10: Dark Mode

### Steps

1. **Create token**
2. **Toggle dark mode** (bottom-left theme button)
3. **Observe styling**

### Expected

✅ Modal readable in both light and dark  
✅ Colors appropriate to theme  
✅ Copy button visible  
✅ Success/error messages styled correctly  
✅ Token code block readable

---

## Browser DevTools Debugging

### Check Network Requests

**F12** → **Network** tab:

```
POST /auth/tokens
  Status: 201 Created ✅
  Request body: { name, description, scope, expiresAt }
  Response: { id, plainToken, name, scope, lastChars, expiresAt }
```

### Check Local Storage

**F12** → **Application** → **Local Storage**:

```javascript
// Token should NOT be stored here
// Only auth JWT should be stored
// Check: auth_token, refresh_token present
```

### Check Cookies

**F12** → **Application** → **Cookies**:

```javascript
// Should have httpOnly refresh token (not visible in JS)
// Can see in Network tab response headers instead
```

### Console Errors

**F12** → **Console**:

```javascript
// Should be clean (no red errors)
// Might see warnings (yellow) - ok
// No "Cannot find module" errors
// No " is not defined" errors
```

---

## API Testing (Curl)

### Get JWT Token First

```bash
# Login to get auth JWT
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "your-password"}' \
  | jq '.data.accessToken' -r
```

### Use JWT to Create API Token

```bash
JWT="<paste jwt here>"
PROJECT_ID="<paste project id here>"

curl -X POST http://localhost:8000/auth/tokens \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Token",
    "description": "For testing",
    "scope": ["api", "mcp", "cli"],
    "expiresAt": "2026-12-31T23:59:59Z"
  }' | jq .
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "id": "66f7c3a1b2d4e5f6...",
    "plainToken": "docnine_abc123xyz...",
    "name": "Test Token",
    "lastChars": "...xyz789",
    "scope": ["api", "mcp", "cli"],
    "expiresAt": "2026-12-31T23:59:59Z",
    "createdAt": "2025-03-14T10:30:00Z"
  },
  "message": "Token created. Save it now — you won't see it again!"
}
```

---

## UI Component Testing Checklist

### APITokensCard Component

- [ ] Renders without errors
- [ ] Stats box displays (or skeleton while loading)
- [ ] "+ New Token" button visible
- [ ] Create dialog opens on button click
- [ ] Form fields render: name, description, scopes, expiration
- [ ] Checkboxes work for scope selection
- [ ] Date picker works for expiration
- [ ] Create button triggers API call
- [ ] Loading state shows while creating
- [ ] Error message displays on failure
- [ ] Success modal shows with token
- [ ] Copy button in modal works
- [ ] Token list updates after creation
- [ ] Token row shows all info
- [ ] Trash button revokes token
- [ ] Revoke confirmation dialog
- [ ] Stats accurately updated
- [ ] Pagination works (if many tokens)
- [ ] No console errors

### Dialog Components

- [ ] Create Token Dialog
  - [ ] Open/close animation smooth
  - [ ] Can close with X button or Cancel
  - [ ] Form resets after create
  - [ ] Responds to keyboard (Escape closes)

- [ ] New Token Display Dialog
  - [ ] Shows only after successful create
  - [ ] Close button works
  - [ ] Copy button changes icon on click
  - [ ] Token value readable (monospace font)
  - [ ] Warning: "You won't see it again"

---

## Performance Testing

### Load Multiple Tokens

**Steps:**
1. Create 20+ tokens
2. Navigate back to API Tokens page
3. Observe rendering speed

**Expected:**
- [ ] List loads within 2 seconds
- [ ] No UI lag
- [ ] Stats calculated correctly
- [ ] Virtualization/pagination if implemented

### Search/Filter (Future)

```javascript
// Once implemented, test:
// - Type token name
// - Filter by scope
// - Filter by expiration
// - Filter by unused/used
```

---

## Accessibility Testing

- [ ] Form labels associated with inputs (`<label htmlFor="...">`)
- [ ] Buttons have proper `aria` attributes
- [ ] Keyboard navigation works (Tab key)
- [ ] Focus management works
- [ ] Error messages announced
- [ ] Copy success feedback visible
- [ ] Color not only indicator (also text/icon)
- [ ] Contrast ratios meet WCAG AA

---

## Test Summary Template

```markdown
## Test Results - March 14, 2025

| Test | Result | Notes |
|------|--------|-------|
| Create token | ✅ Pass | Token created, copied, verified |
| Token in list | ✅ Pass | All metadata shown correctly |
| Revoke token | ✅ Pass | Confirmation dialog works |
| Error handling | ✅ Pass | Missing name error caught |
| Copy button | ✅ Pass | Clipboard works, icon updates |
| Scopes | ✅ Pass | All combinations tested |
| Dark mode | ✅ Pass | Styling correct in both themes |
| API integration | ✅ Pass | Backend calls succeed |

**Issues Found:**
- None

**Deployment Ready:** YES ✅
```

---

## Common Issues & Fixes

### Issue: Copy button doesn't work

**Cause:** Browser clipboard API not available  
**Fix:** Use HTTPS (or localhost), allow clipboard permission

### Issue: Token not appearing in list

**Cause:** GET /auth/tokens returns empty  
**Fix:** 
- Check JWT token valid (not expired)
- Verify user owns project
- Check MongoDB connection

### Issue: Form won't submit

**Cause:** Missing required fields  
**Fix:**
- Fill in token name (required)
- All other fields optional

### Issue: Modal won't close

**Cause:** CloseButton event not fired  
**Fix:**
- Hard refresh (Ctrl+Shift+R)
- Check for JS errors in console
- Restart frontend dev server

---

## Next Steps

After passing all tests:

1. ✅ Manual testing complete
2. 📝 Write automated test suite (Jest)
3. 🚀 Deploy to staging
4. 🧪 Run integration tests with backend
5. 📊 Monitor production usage
6. 🐛 Fix any reported issues

---

**Last Updated:** March 14, 2025  
**Test Coverage:** Frontend UI + API integration  
**Status:** Ready for QA
