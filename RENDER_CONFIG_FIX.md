# Render & Express 5.0 Deployment Fix

## Issue: Server Crash (PathError)
When deploying to Render (which uses Node 22+), the server would crash with the following error:
`PathError [TypeError]: Missing parameter name at index ...`

### Root Cause:
Render's environment pulls in newer versions of dependencies. Specifically, the `router` package (an indirect dependency) uses `path-to-regexp` v8+. This version is extremely strict and does NOT allow unnamed wildcards like `*` or `(.*)` in `app.get()`.

## The Solution: Middleware Fallback
Instead of using route-based wildcards, use a generic middleware as the very last item in `server.js`. Middleware does not trigger the problematic path-parsing engine.

### Implementation:
```javascript
// 1. Serve static files first
app.use(express.static(path.join(__dirname, 'dist')));

// 2. Add API routes...
app.get('/api/recorder-logs', ...);

// 3. SPA Fallback (MUST BE LAST)
// This avoids path-to-regexp entirely by using a nameless middleware function
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

### Why this works:
*   `app.get('*')` -> Triggers path-to-regexp (CRASH).
*   `app.get(/.*/) ` -> Triggers path-to-regexp (CRASH).
*   `app.use((req, res) => ...)` -> **Pure function, no path parsing (SUCCESS).**

---
*Documented on: Jan 1, 2026 (New Year's Day Fix!)*
