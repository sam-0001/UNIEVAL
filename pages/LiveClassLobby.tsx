import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Video, Calendar, Clock, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LiveClassLobby: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [liveClass, setLiveClass] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClassDetails = async () => {
            try {
                if (id) {
                    const res = await api.getLiveClassDetails(id);
                    setLiveClass(res);
                    if (res?.status === 'live') {
                        navigate(`/live-class/${id}`, { replace: true });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch live class details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchClassDetails();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!liveClass) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Class Not Found</h2>
                <button onClick={() => navigate(-1)} className="text-indigo-600 hover:text-indigo-800 font-medium">
                    &larr; Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
            <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 font-medium"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-700 px-6 py-8 text-white">
                    <div className="flex items-center gap-2 mb-4 opacity-90 text-sm font-semibold uppercase tracking-wider">
                        <Video className="w-5 h-5" />
                        UniEval Live Class
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                        {liveClass.title}
                    </h1>
                    <p className="text-indigo-100 max-w-2xl text-lg">
                        Get ready to join the interactive live session. Make sure your microphone and camera are working before entering the room.
                    </p>
                </div>

                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center justify-between">
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3 text-gray-700">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Date</p>
                                <p className="font-semibold">{new Date(liveClass.scheduledStartTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-700">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Time</p>
                                <p className="font-semibold">{new Date(liveClass.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-3 min-w-[240px]">
                        <button 
                            onClick={() => navigate(`/live-class/${id}`)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            <Video className="w-5 h-5" />
                            Enter Live Room
                        </button>
                        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 py-2 px-3 rounded-lg border border-emerald-100">
                            <ShieldAlert className="w-4 h-4" /> End-to-End Encrypted
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveClassLobby;
