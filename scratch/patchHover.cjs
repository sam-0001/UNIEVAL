const fs = require('fs');
let code = fs.readFileSync('pages/TeacherLiveClasses.tsx', 'utf8');

code = code.replace(
    `hover:bg-indigo-100 dark:bg-indigo-500/20`,
    `hover:bg-indigo-100 dark:hover:bg-[#3A3F58]`
);

fs.writeFileSync('pages/TeacherLiveClasses.tsx', code);
