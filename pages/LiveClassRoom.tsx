import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
    StreamVideo, 
    StreamVideoClient, 
    StreamCall, 
    Call, 
    SpeakerLayout, 
    PaginatedGridLayout, 
    CallControls, 
    StreamTheme, 
    CallParticipantsList,
    CallStatsButton,
    useCallStateHooks
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { Users, LayoutGrid, PhoneForwarded, Loader2 } from 'lucide-react';

const MeetingLayout: React.FC<{ isTeacher: boolean, call: Call }> = ({ isTeacher, call }) => {
    const navigate = useNavigate();
    const { useCallEndedAt } = useCallStateHooks();
    const endedAt = useCallEndedAt();

    const [layout, setLayout] = useState<'speaker' | 'grid'>('speaker');
    const [showParticipants, setShowParticipants] = useState(false);

    if (endedAt) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#161925] text-white">
                <div className="bg-[#1C1F2E] p-8 rounded-2xl max-w-md text-center border border-[#2A2E3D]">
                    <h2 className="text-2xl font-bold mb-4 text-red-500">Meeting Ended</h2>
                    <p className="text-gray-300 mb-6">The host has ended the meeting for everyone.</p>
                    <button onClick={() => navigate(isTeacher ? '/teacher/upload' : '/profile')} className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-medium transition-colors">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <StreamTheme className="h-full w-full relative text-white">
            <div className="flex h-full w-full">
                <div className="flex w-full flex-col items-center justify-center relative">
                    {layout === 'speaker' ? (
                        <SpeakerLayout participantsBarPosition="bottom" />
                    ) : (
                        <PaginatedGridLayout />
                    )}

                    {/* Top Left Overlay (Zoom style) */}
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-medium z-10 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span>UniEval Live Class</span>
                    </div>

                    {/* Custom Controls Bar */}
                    <div className="fixed bottom-0 flex w-full items-center justify-center gap-5 pb-6 flex-wrap z-20">
                        <CallControls onLeave={() => navigate('/profile')} />

                        <div className="flex items-center gap-2 bg-[#19232D] rounded-full px-2 py-1">
                            <button 
                                onClick={() => setLayout('speaker')}
                                className={`p-2 rounded-full hover:bg-[#4C535B] transition-colors ${layout === 'speaker' ? 'bg-[#323B44]' : ''}`}
                                title="Speaker View"
                            >
                                <PhoneForwarded className="w-5 h-5 text-white" />
                            </button>
                            <button 
                                onClick={() => setLayout('grid')}
                                className={`p-2 rounded-full hover:bg-[#4C535B] transition-colors ${layout === 'grid' ? 'bg-[#323B44]' : ''}`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        
                        <CallStatsButton />
                        
                        <button 
                            onClick={() => setShowParticipants(p => !p)}
                            className="bg-[#19232D] hover:bg-[#4C535B] rounded-full p-2.5 transition-colors relative"
                        >
                            <Users className="w-5 h-5 text-white" />
                        </button>
                        
                        {isTeacher && (
                            <button 
                                onClick={async () => {
                                    if (window.confirm("End class for everyone?")) {
                                        try {
                                            await api.endLiveClass(call.id);
                                        } catch (err) {
                                            console.error("Failed to mark class as ended in DB:", err);
                                        }
                                        await call.endCall();
                                        // The endedAt hook will automatically render the "Meeting Ended" screen
                                    }
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full font-bold transition-colors ml-4"
                            >
                                End Meeting for All
                            </button>
                        )}
                    </div>
                </div>

                {/* Participants Sidebar */}
                {showParticipants && (
                    <div className="h-full w-full max-w-[320px] bg-[#19232D] p-4 border-l border-[#323B44]">
                        <CallParticipantsList onClose={() => setShowParticipants(false)} />
                    </div>
                )}
            </div>
        </StreamTheme>
    );
};

export const LiveClassRoom: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [client, setClient] = useState<StreamVideoClient | null>(null);
    const [call, setCall] = useState<Call | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user || !id) return;

        const initCall = async () => {
            try {
                const isTeacher = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'TEACHER';
                
                // Fetch token
                const res = isTeacher ? await api.startLiveClass(id) : await api.joinLiveClass(id);
                
                // Initialize client
                const videoClient = new StreamVideoClient({
                    apiKey: import.meta.env.VITE_STREAM_API_KEY || 'default',
                    user: { id: user.id, name: user.name || 'User' },
                    token: res.token
                });

                setClient(videoClient);

                // Initialize call
                const streamCall = videoClient.call('default', res.callId || id);
                await streamCall.join({ create: isTeacher });
                
                setCall(streamCall);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to join the meeting');
            } finally {
                setLoading(false);
            }
        };

        initCall();

        return () => {
            if (call) call.leave();
            if (client) client.disconnectUser();
        };
    }, [id, user]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#161925] text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-xl font-medium">Loading Meeting...</p>
                </div>
            </div>
        );
    }

    if (error || !client || !call) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#161925] text-white">
                <div className="bg-[#1C1F2E] p-8 rounded-2xl max-w-md text-center border border-[#2A2E3D]">
                    <h2 className="text-2xl font-bold mb-4 text-red-500">Error</h2>
                    <p className="text-gray-300 mb-6">{error || 'Could not connect to the room.'}</p>
                    <button onClick={() => navigate(-1)} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const isTeacher = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TEACHER';

    return (
        <main className="h-screen w-full bg-[#161925]">
            <StreamVideo client={client}>
                <StreamCall call={call}>
                    <MeetingLayout isTeacher={isTeacher} call={call} />
                </StreamCall>
            </StreamVideo>
        </main>
    );
};

export default LiveClassRoom;
