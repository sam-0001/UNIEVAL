const fs = require('fs');
const p = 'pages/AdminDashboard.tsx';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(
    `import { Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';`,
    `import { Loader2, CheckCircle, AlertCircle, Trash2, Video } from 'lucide-react';`
);

code = code.replace(
    `                  <button onClick={async () => {
                      if (!window.confirm("Clear the live server cache? Use this if you just uploaded a video locally and want the live site to see it instantly.")) return;`,
    `                  <div className="flex gap-3">
                      <button 
                          onClick={() => navigate('/teacher/live-classes')}
                          className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-2"
                      >
                          <Video className="w-4 h-4" /> Live Classes
                      </button>
                      <button onClick={async () => {
                          if (!window.confirm("Clear the live server cache? Use this if you just uploaded a video locally and want the live site to see it instantly.")) return;`
);

code = code.replace(
    `                  }} className="text-sm font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-200">
                      Sync Live Server (Clear Cache)
                  </button>
              </div>`,
    `                  }} className="text-sm font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors border border-slate-200">
                          Sync Live Server (Clear Cache)
                      </button>
                  </div>
              </div>`
);

fs.writeFileSync(p, code);
