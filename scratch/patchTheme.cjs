const fs = require('fs');
const p = 'pages/TeacherLiveClasses.tsx';
let code = fs.readFileSync(p, 'utf8');

// Header and layout
code = code.replace(/bg-\[#161925\]/g, 'bg-slate-50');
code = code.replace(/bg-\[#1C1F2E\]/g, 'bg-white');
code = code.replace(/border-\[#2A2E3D\]/g, 'border-slate-200');
code = code.replace(/text-white/g, 'text-slate-900');
// Except in hero banner and colored cards, we need to be careful with text-white replacements.
// Let's do selective replacements or more specific ones.
