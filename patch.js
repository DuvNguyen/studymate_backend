const fs = require('fs');
const path = './src/modules/auth/auth.controller.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "console.log('clerkUserId from Guard:', clerkUserId);",
  "console.log('clerkUserId from Guard:', clerkUserId);\n    require('fs').writeFileSync('DEBUG_CLERK_ID.txt', String(clerkUserId));"
);

fs.writeFileSync(path, code);
