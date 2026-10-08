const fs = require('fs');
const p = 'pages/TeacherLiveClasses.tsx';
let code = fs.readFileSync(p, 'utf8');

const oldBanner = `<div className="h-64 rounded-[20px] bg-gradient-to-r from-[#1F81FC] to-[#7F26FE] p-8 flex flex-col justify-between mb-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <h2 className="relative z-10 bg-white/20 w-fit px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-md border border-white/10">
                            Upcoming Meeting at: {liveClasses.length > 0 ? new Date(liveClasses[0].scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                        </h2>
                        <div className="relative z-10">
                            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter drop-shadow-lg">{timeString}</h1>
                            <p className="text-blue-100 text-lg md:text-xl font-medium mt-2">{dateString}</p>
                        </div>
                    </div>`;

const newBanner = `<div className="h-64 rounded-[20px] bg-white border border-slate-200 p-8 flex flex-col justify-between mb-10 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <h2 className="relative z-10 bg-indigo-50 text-indigo-700 w-fit px-4 py-1.5 rounded-full text-sm font-bold border border-indigo-100">
                            Upcoming Meeting at: {liveClasses.length > 0 ? new Date(liveClasses[0].scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'None'}
                        </h2>
                        <div className="relative z-10">
                            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-slate-900">{timeString}</h1>
                            <p className="text-slate-500 text-lg md:text-xl font-medium mt-2">{dateString}</p>
                        </div>
                    </div>`;

code = code.replace(oldBanner, newBanner);
fs.writeFileSync(p, code);
