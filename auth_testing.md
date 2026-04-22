# Raku Auth Testing Playbook

Raku uses Emergent-managed Google Auth. In a test environment where real
Google sign-in isn't practical, bypass it by planting a session row directly
in MongoDB and attaching the cookie / header.

## 1. Create a test user + session

```bash
mongosh --eval "
use('test_database');
var uid = 'test_user_' + Date.now();
var tok = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: uid,
  email: 'test.' + Date.now() + '@example.com',
  name: 'Test Student',
  picture: 'https://via.placeholder.com/150',
  accent_color: '#8BE3B4',
  vibe: 'chill',
  pronouns: 'they/them',
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: uid,
  session_token: tok,
  expires_at: new Date(Date.now()+7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
});
print('USER_ID=' + uid);
print('SESSION_TOKEN=' + tok);
"
```

## 2. Backend curl

```bash
curl -H "Authorization: Bearer $SESSION_TOKEN" $API/api/auth/me
curl -H "Authorization: Bearer $SESSION_TOKEN" $API/api/today
curl -H "Authorization: Bearer $SESSION_TOKEN" $API/api/integrations
curl -X POST -H "Authorization: Bearer $SESSION_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"text":"what now?"}' $API/api/chat
```

Expect `200` and JSON — any `401` means session wasn't found or expired.

## 3. Browser (Playwright) — set the cookie

```python
await context.add_cookies([{
  "name": "raku_session",
  "value": SESSION_TOKEN,
  "domain": "focus-nudge-3.preview.emergentagent.com",
  "path": "/",
  "httpOnly": True,
  "secure": True,
  "sameSite": "None",
}])
await page.goto(APP_URL)  # bypasses /login, lands on Today
```

## 4. Clean up

```bash
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\./});
db.user_sessions.deleteMany({session_token: /test_session/});
"
```

## Checklist

- [ ] `user_id` on session matches user's `user_id` exactly.
- [ ] All Mongo queries use `{"_id": 0}` projection.
- [ ] `/api/auth/me` returns `200` + user JSON.
- [ ] Protected endpoints return `401` with no session + `200` with session.
- [ ] Frontend with cookie lands directly on `/` (Today), not `/login`.
