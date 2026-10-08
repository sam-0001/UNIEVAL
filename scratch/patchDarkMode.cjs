const fs = require('fs');
let code = fs.readFileSync('pages/TeacherLiveClasses.tsx', 'utf8');

const replacements = {
    'bg-slate-50 ': 'bg-slate-50 dark:bg-[#161925] ',
    'bg-slate-50"': 'bg-slate-50 dark:bg-[#161925]"',
    'bg-white ': 'bg-white dark:bg-[#1C1F2E] ',
    'bg-white"': 'bg-white dark:bg-[#1C1F2E]"',
    'text-slate-900 ': 'text-slate-900 dark:text-white ',
    'text-slate-900"': 'text-slate-900 dark:text-white"',
    'border-slate-200 ': 'border-slate-200 dark:border-[#2A2E3D] ',
    'border-slate-200"': 'border-slate-200 dark:border-[#2A2E3D]"',
    'text-slate-500 ': 'text-slate-500 dark:text-gray-400 ',
    'text-slate-500"': 'text-slate-500 dark:text-gray-400"',
    'text-slate-600 ': 'text-slate-600 dark:text-gray-300 ',
    'text-slate-600"': 'text-slate-600 dark:text-gray-300"',
    'text-slate-700 ': 'text-slate-700 dark:text-gray-200 ',
    'text-slate-700"': 'text-slate-700 dark:text-gray-200"',
    'bg-slate-100 ': 'bg-slate-100 dark:bg-[#252A41] ',
    'hover:bg-slate-200 ': 'hover:bg-slate-200 dark:hover:bg-[#2A2E3D] ',
    'bg-slate-900/60 ': 'bg-slate-900/60 dark:bg-black/80 ',
    'bg-indigo-50 ': 'bg-indigo-50 dark:bg-[#252A41] ',
    'text-indigo-600 ': 'text-indigo-600 dark:text-blue-400 ',
    'text-indigo-600"': 'text-indigo-600 dark:text-blue-400"',
    'text-indigo-700 ': 'text-indigo-700 dark:text-blue-300 ',
    'border-indigo-100 ': 'border-indigo-100 dark:border-[#3A3F58] ',
    'hover:border-indigo-300 ': 'hover:border-indigo-300 dark:hover:border-[#3A3F58] ',
    // specific button
    'bg-indigo-600 hover:bg-indigo-700': 'bg-indigo-600 hover:bg-indigo-700 dark:bg-blue-600 dark:hover:bg-blue-700',
    // colored cards need dark mode backgrounds too, wait, they are white in light mode
    // I already did bg-white dark:bg-[#1C1F2E]
    // The colored icons: bg-orange-100 -> bg-orange-100 dark:bg-orange-500/20
    'bg-orange-100 ': 'bg-orange-100 dark:bg-orange-500/20 ',
    'bg-blue-100 ': 'bg-blue-100 dark:bg-blue-500/20 ',
    'bg-indigo-100 ': 'bg-indigo-100 dark:bg-indigo-500/20 ',
    'text-orange-600 ': 'text-orange-600 dark:text-orange-400 ',
    'text-blue-600 ': 'text-blue-600 dark:text-blue-400 '
};

for (const [light, dark] of Object.entries(replacements)) {
    code = code.split(light).join(dark);
}

// Add state and toggle button
// find imports
code = code.replace(
    `import { Video, Calendar, Clock, Plus, MonitorPlay, Copy, Play, Trash2, ArrowLeft } from 'lucide-react';`,
    `import { Video, Calendar, Clock, Plus, MonitorPlay, Copy, Play, Trash2, ArrowLeft, Sun, Moon } from 'lucide-react';`
);

// find useState
code = code.replace(
    `const [viewMode, setViewMode] = useState<'upcoming' | 'completed'>('upcoming');`,
    `const [viewMode, setViewMode] = useState<'upcoming' | 'completed'>('upcoming');\n    const [isDarkMode, setIsDarkMode] = useState(false);`
);

// find root div
code = code.replace(
    `<div className="min-h-screen bg-slate-50 dark:bg-[#161925] text-slate-900 dark:text-white flex flex-col">`,
    `<div className={\`min-h-screen bg-slate-50 dark:bg-[#161925] text-slate-900 dark:text-white flex flex-col \${isDarkMode ? 'dark' : ''}\`}>`
);

// add toggle button to header
code = code.replace(
    `<button onClick={() => navigate('/teacher/upload')} className="text-sm text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:text-blue-400 flex items-center gap-2 transition-colors font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to App
                </button>`,
    `<div className="flex items-center gap-4">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-slate-100 dark:bg-[#252A41] text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#2A2E3D] transition-colors">
                        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                    <button onClick={() => navigate('/teacher/upload')} className="text-sm text-slate-500 dark:text-gray-400 hover:text-indigo-600 dark:text-blue-400 flex items-center gap-2 transition-colors font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back to App
                    </button>
                </div>`
);

fs.writeFileSync('pages/TeacherLiveClasses.tsx', code);
