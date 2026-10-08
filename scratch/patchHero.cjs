const fs = require('fs');
let code = fs.readFileSync('pages/TeacherLiveClasses.tsx', 'utf8');

const oldBanner = `<div className="h-64 rounded-[20px] bg-white dark:bg-[#1C1F2E] border border-slate-200 dark:border-[#2A2E3D] p-8 flex flex-col justify-between mb-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 dark:bg-[#252A41] rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <h2 className="relative z-10 bg-indigo-50 dark:bg-[#252A41] text-indigo-700 dark:text-blue-300 w-fit px-4 py-1.5 rounded-full text-sm font-bold border border-indigo-100">
                            Upcoming Meeting at: {liveClasses.length > 0 ? new Date(liveClasses[0].scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                        </h2>
                        <div className="relative z-10">
                            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-slate-900 dark:text-white">{timeString}</h1>
                            <p className="text-slate-500 dark:text-gray-400 text-lg md:text-xl font-medium mt-2">{dateString}</p>
                        </div>
                    </div>`;

const newBanner = `<div className="h-64 rounded-[20px] bg-gradient-to-br from-indigo-600 to-purple-700 p-8 flex flex-col justify-between mb-10 shadow-xl relative overflow-hidden text-white">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <h2 className="relative z-10 bg-white/20 text-white w-fit px-4 py-1.5 rounded-full text-sm font-bold border border-white/20 backdrop-blur-md shadow-sm">
                            Upcoming Meeting at: {liveClasses.length > 0 ? new Date(liveClasses[0].scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                        </h2>
                        <div className="relative z-10">
                            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter drop-shadow-md">{timeString}</h1>
                            <p className="text-indigo-100 text-lg md:text-xl font-medium mt-2 drop-shadow-sm">{dateString}</p>
                        </div>
                    </div>`;

code = code.replace(oldBanner, newBanner);

code = code.replace(
    `<Plus className="w-5 h-5 text-orange-600" />`,
    `<Plus className="w-5 h-5 text-orange-600 dark:text-orange-400" />`
);
code = code.replace(
    `<Calendar className="w-5 h-5 text-blue-600" />`,
    `<Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />`
);

fs.writeFileSync('pages/TeacherLiveClasses.tsx', code);
