const fs = require('fs');
const p = 'pages/TeacherLiveClasses.tsx';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
    `<div className="min-h-screen bg-[#161925] text-white flex flex-col">`,
    `<div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">`
);

code = code.replace(
    `<header className="bg-[#1C1F2E] px-6 py-4 flex items-center justify-between border-b border-[#2A2E3D]">`,
    `<header className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200">`
);

code = code.replace(
    `<button onClick={() => navigate('/teacher/upload')} className="text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors">`,
    `<button onClick={() => navigate('/teacher/upload')} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors font-medium">`
);

code = code.replace(
    `<aside className="w-72 bg-[#1C1F2E] p-6 flex flex-col border-r border-[#2A2E3D]">`,
    `<aside className="w-72 bg-white p-6 flex flex-col border-r border-slate-200">`
);

code = code.replace(
    `<label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Select Course</label>`,
    `<label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Select Course</label>`
);

code = code.replace(
    `className="w-full bg-[#252A41] text-white rounded-lg p-3 outline-none border border-[#2A2E3D] focus:border-blue-500"`,
    `className="w-full bg-slate-50 text-slate-900 rounded-lg p-3 outline-none border border-slate-200 focus:border-indigo-500"`
);

code = code.replace(
    `<button className="w-full text-left px-4 py-3 bg-blue-600 rounded-lg font-medium flex items-center gap-3">`,
    `<button className="w-full text-left px-4 py-3 bg-indigo-50 text-indigo-700 rounded-lg font-bold flex items-center gap-3">`
);

code = code.replace(
    `<button className="w-full text-left px-4 py-3 text-gray-300 hover:bg-[#252A41] rounded-lg font-medium flex items-center gap-3 transition-colors">`,
    `<button className="w-full text-left px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-medium flex items-center gap-3 transition-colors">`
);

// Hero Banner - let's make it match gradient main
code = code.replace(
    `bg-gradient-to-r from-blue-700 to-indigo-800`,
    `bg-gradient-to-r from-[#1F81FC] to-[#7F26FE]`
);

// Action cards
const oldCards = `                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                        <div onClick={startInstantMeeting} className="bg-[#FF742E] rounded-2xl p-6 min-h-[160px] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-lg">
                            <div className="w-12 h-12 rounded-[12px] bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">New Meeting</h3>
                                <p className="text-white/80 text-sm">Start an instant meeting</p>
                            </div>
                        </div>

                        <div onClick={() => setShowScheduleModal(true)} className="bg-[#0E78F9] rounded-2xl p-6 min-h-[160px] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-lg">
                            <div className="w-12 h-12 rounded-[12px] bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Schedule Meeting</h3>
                                <p className="text-white/80 text-sm">Plan your meeting</p>
                            </div>
                        </div>

                        <div onClick={() => setViewMode(viewMode === 'upcoming' ? 'completed' : 'upcoming')} className="bg-[#830EF9] rounded-2xl p-6 min-h-[160px] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform shadow-lg">
                            <div className="w-12 h-12 rounded-[12px] bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <Video className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">View Recordings</h3>
                                <p className="text-white/80 text-sm">Check out your recordings</p>
                            </div>
                        </div>
                    </div>`;

const newCards = `                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                        <div onClick={startInstantMeeting} className="bg-white border border-slate-200 rounded-2xl p-6 min-h-[140px] flex flex-col justify-between cursor-pointer hover:border-orange-500 hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-[10px] bg-orange-100 flex items-center justify-center">
                                <Plus className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-lg font-bold text-slate-900">New Meeting</h3>
                                <p className="text-slate-500 text-sm">Start an instant meeting</p>
                            </div>
                        </div>

                        <div onClick={() => setShowScheduleModal(true)} className="bg-white border border-slate-200 rounded-2xl p-6 min-h-[140px] flex flex-col justify-between cursor-pointer hover:border-blue-500 hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-[10px] bg-blue-100 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-lg font-bold text-slate-900">Schedule Meeting</h3>
                                <p className="text-slate-500 text-sm">Plan your meeting</p>
                            </div>
                        </div>

                        <div onClick={() => setViewMode(viewMode === 'upcoming' ? 'completed' : 'upcoming')} className="bg-white border border-slate-200 rounded-2xl p-6 min-h-[140px] flex flex-col justify-between cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all">
                            <div className="w-10 h-10 rounded-[10px] bg-indigo-100 flex items-center justify-center">
                                <Video className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-lg font-bold text-slate-900">View Recordings</h3>
                                <p className="text-slate-500 text-sm">Check out your recordings</p>
                            </div>
                        </div>
                    </div>`;

code = code.replace(oldCards, newCards);

const oldToggle = `<button onClick={() => setViewMode(viewMode === 'upcoming' ? 'completed' : 'upcoming')} className="text-sm font-medium bg-[#252A41] hover:bg-[#2A2E3D] px-4 py-2 rounded-lg transition-colors">
                                Switch to {viewMode === 'upcoming' ? 'Completed' : 'Upcoming'}
                            </button>`;
const newToggle = `<button onClick={() => setViewMode(viewMode === 'upcoming' ? 'completed' : 'upcoming')} className="text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors border border-indigo-100">
                                Switch to {viewMode === 'upcoming' ? 'Completed' : 'Upcoming'}
                            </button>`;
code = code.replace(oldToggle, newToggle);

const oldEmpty = `<div className="bg-[#1C1F2E] border border-[#2A2E3D] rounded-xl p-8 text-center">
                                <p className="text-gray-400">No upcoming meetings for this course.</p>
                            </div>`;
const newEmpty = `<div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
                                <p className="text-slate-500">No {viewMode} meetings for this course.</p>
                            </div>`;
code = code.replace(oldEmpty, newEmpty);

const oldItem = `<div key={lc.id} className="bg-[#1C1F2E] border border-[#2A2E3D] rounded-2xl p-6 hover:border-[#3A3F58] transition-colors flex flex-col justify-between min-h-[200px]">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                    <Calendar className="w-5 h-5 text-blue-500" />
                                                </div>
                                                <h3 className="text-xl font-semibold truncate">{lc.title}</h3>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-6 flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                {new Date(lc.scheduledAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-auto">
                                            <button 
                                                onClick={() => navigate(\`/live-class/\${lc.id}\`)}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Play className="w-4 h-4" /> Start
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(\`\${window.location.origin}/live-class/lobby/\${lc.id}\`);
                                                    alert('Link copied!');
                                                }}
                                                className="px-4 py-2 bg-[#252A41] hover:bg-[#2A2E3D] rounded-lg transition-colors"
                                                title="Copy Student Link"
                                            >
                                                <Copy className="w-4 h-4 text-gray-300" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(lc.id)}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                                                title="Delete Meeting"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>`;

const newItem = `<div key={lc.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between min-h-[200px]">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                                                    <Calendar className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <h3 className="text-xl font-semibold truncate text-slate-900">{lc.title}</h3>
                                            </div>
                                            <p className="text-slate-500 text-sm mb-6 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                {new Date(lc.scheduledAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-auto">
                                            <button 
                                                onClick={() => navigate(\`/live-class/\${lc.id}\`)}
                                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Play className="w-4 h-4" /> Start
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(\`\${window.location.origin}/live-class/lobby/\${lc.id}\`);
                                                    alert('Link copied!');
                                                }}
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                                                title="Copy Student Link"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(lc.id)}
                                                className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-lg transition-colors"
                                                title="Delete Meeting"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>`;
code = code.replace(oldItem, newItem);

const oldModal = `<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1C1F2E] w-full max-w-md rounded-2xl shadow-2xl border border-[#2A2E3D] overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-6">Schedule Meeting</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Topic</label>
                                    <input 
                                        type="text" 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-[#252A41] border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Chapter 1 Discussion"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Date & Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={scheduledAt} 
                                        onChange={e => setScheduledAt(e.target.value)}
                                        className="w-full bg-[#252A41] border-none rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button 
                                    onClick={() => setShowScheduleModal(false)}
                                    className="flex-1 py-3 bg-[#252A41] hover:bg-[#2A2E3D] rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSchedule}
                                    disabled={!title || !scheduledAt || isScheduling}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
                                >
                                    {isScheduling ? 'Scheduling...' : 'Schedule'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;

const newModal = `<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="p-6 text-slate-900">
                            <h2 className="text-2xl font-bold mb-6 text-slate-900">Schedule Meeting</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">Topic</label>
                                    <input 
                                        type="text" 
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. Chapter 1 Discussion"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">Date & Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={scheduledAt} 
                                        onChange={e => setScheduledAt(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button 
                                    onClick={() => setShowScheduleModal(false)}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSchedule}
                                    disabled={!title || !scheduledAt || isScheduling}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 rounded-lg font-bold transition-colors"
                                >
                                    {isScheduling ? 'Scheduling...' : 'Schedule'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
code = code.replace(oldModal, newModal);

code = code.replace(/<div className="text-gray-400">Loading classes...<\/div>/g, `<div className="text-slate-500">Loading classes...</div>`);

fs.writeFileSync(p, code);
