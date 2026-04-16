

# Plan: Append email param to signup URLs in CoachClients.tsx

## Single file: `src/pages/coach/CoachClients.tsx`

### Change 1 — Line 309 (inside `handleOrderClientPays`)
Replace `const signupUrl = \`\${window.location.origin}/signup\`;`
with `const signupUrl = \`\${window.location.origin}/signup?email=\${encodeURIComponent(email)}\`;`

### Change 2 — Line 405 (inside `handleRemind`)
Replace `const signupUrl = \`\${window.location.origin}/signup\`;`
with `const signupUrl = \`\${window.location.origin}/signup?email=\${encodeURIComponent(client.client_email)}\`;`

No other files changed.

