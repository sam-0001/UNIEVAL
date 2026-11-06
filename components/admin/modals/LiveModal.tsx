import React from 'react';
import { Trash2 } from 'lucide-react';

export interface LiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    liveClasses: any[];
    title: string;
    setTitle: (v: string) => void;
    scheduledAt: string;
    setScheduledAt: (v: string) => void;
    onSchedule: () => void;
    navigate: (path: string) => void;
    onDelete: (id: string) => void;
    isScheduling: boolean;
}

export const LiveModal: React.FC<LiveModalProps> = ({
    isOpen,
    onClose,
    liveClasses,
    title,
    setTitle,
    scheduledAt,
    setScheduledAt,
    onSchedule,
    navigate,
    onDelete,
    isScheduling
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Manage Live Classes</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                        <h3 className="font-bold text-blue-900 mb-2">Schedule New Class</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Class Title (e.g., Doubts Session)"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border border-blue-300 rounded p-2 text-sm outline-none focus:border-blue-500"
                            />
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className="w-full border border-blue-300 rounded p-2 text-sm outline-none focus:border-blue-500"
                            />
                            <button
                                disabled={isScheduling}
                                onClick={onSchedule}
                                className={`w-full text-white font-bold py-2 rounded shadow transition ${isScheduling ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {isScheduling ? 'Scheduling...' : 'Schedule Class'}
                            </button>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-gray-800 mb-2 border-b pb-1">Scheduled Classes</h3>
                        {liveClasses.length === 0 ? (
                            <p className="text-sm text-gray-500">No upcoming live classes.</p>
                        ) : (
                            <ul className="space-y-2">
                                {liveClasses.map(lc => (
                                    <li key={lc.id} className="border border-gray-200 rounded p-3 flex justify-between items-center bg-gray-50">
                                        <div>
                                            <p className="font-bold text-sm text-gray-900">{lc.title}</p>
                                            <p className="text-xs text-gray-500">{new Date(lc.scheduledAt).toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/live-class/${lc.id}`)}
                                                className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-indigo-700 transition"
                                            >
                                                Start Class
                                            </button>
                                            <button
                                                onClick={() => onDelete(lc.id)}
                                                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold px-2 py-1.5 rounded transition"
                                                title="Cancel Class"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveModal;
