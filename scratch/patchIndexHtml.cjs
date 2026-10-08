const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
code = code.replace(
  /tailwind\.config = {/,
  `tailwind.config = {\n        darkMode: 'class',`
);
fs.writeFileSync('index.html', code);
