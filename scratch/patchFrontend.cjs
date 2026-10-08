const fs = require('fs');
const p = 'pages/TeacherLiveClasses.tsx';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
    `const [liveClasses, setLiveClasses] = useState<any[]>([]);`,
    `const [liveClasses, setLiveClasses] = useState<any[]>([]);\n    const [viewMode, setViewMode] = useState<'upcoming' | 'completed'>('upcoming');`
);

code = code.replace(
    `                const endpoint = selectedCourse === 'all' 
                    ? '/api/live-classes/teacher-schedule'
                    : \`/api/live-classes/course/\${selectedCourse}\`;
                    
                const res = await fetch(endpoint, {`,
    `                const endpoint = selectedCourse === 'all' 
                    ? '/api/live-classes/teacher-schedule'
                    : \`/api/live-classes/course/\${selectedCourse}\`;
                    
                const res = await fetch(\`\${endpoint}?status=\${viewMode}\`, {`
);

code = code.replace(
    `setLiveClasses(data.liveClasses.filter((lc: any) => lc.status !== 'completed'));`,
    `setLiveClasses(data.liveClasses);`
);

code = code.replace(
    `}, [selectedCourse, navigate]);`,
    `}, [selectedCourse, navigate, viewMode]);`
);

code = code.replace(
    `setLiveClasses(freshData.liveClasses.filter((lc: any) => lc.status !== 'completed'));`,
    `setLiveClasses(freshData.liveClasses);`
);

code = code.replace(
    `                        <div className="bg-[#830EF9] rounded-2xl p-6 min-h-[160px] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-lg">`,
    `                        <div onClick={() => setViewMode(viewMode === 'upcoming' ? 'completed' : 'upcoming')} className="bg-[#830EF9] rounded-2xl p-6 min-h-[160px] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-lg">`
);

code = code.replace(
    `                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            Upcoming Classes
                        </h2>`,
    `                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                {viewMode === 'upcoming' ? 'Upcoming Classes' : 'Completed Classes / Recordings'}
                            </h2>
                            <button onClick={() => setViewMode(viewMode === 'upcoming' ? 'completed' : 'upcoming')} className="text-sm font-medium bg-[#252A41] hover:bg-[#2A2E3D] px-4 py-2 rounded-lg transition-colors">
                                Switch to {viewMode === 'upcoming' ? 'Completed' : 'Upcoming'}
                            </button>
                        </div>`
);

fs.writeFileSync(p, code);
