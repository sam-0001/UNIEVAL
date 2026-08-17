const fs = require('fs');

let content = fs.readFileSync('pages/LiveClassRoom.tsx', 'utf8');

// 1. Update imports
content = content.replace(
  "import { DailyProvider, useLocalParticipant, useParticipantIds, useVideoTrack, useAudioTrack, useParticipantProperty } from '@daily-co/daily-react';",
  "import { DailyProvider, useLocalParticipant, useParticipantIds, useVideoTrack, useAudioTrack, useParticipantProperty, useDaily, useScreenShare, useScreenVideoTrack, useDailyEvent } from '@daily-co/daily-react';"
);

// 2. Add ScreenShareVideo component after ParticipantVideo
const participantVideoEnd = "  );\n};\n\nconst LiveClassRoomContent";
const screenShareVideo = `  );
};

const ScreenShareVideo = ({ id, isLocal = false }: { id: string, isLocal?: boolean }) => {
  const videoTrack = useScreenVideoTrack(id);
  
  return (
    <video
      autoPlay
      muted={isLocal}
      playsInline
      ref={(video) => {
        if (!video) return;
        if (videoTrack.persistentTrack) {
          video.srcObject = new MediaStream([videoTrack.persistentTrack]);
        } else {
          video.srcObject = null;
        }
      }}
      className={\`w-full h-full object-contain \${isLocal ? 'transform scale-x-[-1]' : ''}\`}
    />
  );
};

const LiveClassRoomContent`;

content = content.replace(participantVideoEnd, screenShareVideo);

// 3. Update main component to include daily hooks and raise hand state
const stateDeclarations = `  const [hasJoined, setHasJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'qa' | 'polls'>('chat');`;

const newStates = `  const [hasJoined, setHasJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'qa' | 'polls'>('chat');
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const daily = useDaily();
  const { screens } = useScreenShare();
  const activeScreenShare = screens.length > 0 ? screens[0] : null;`;

content = content.replace(stateDeclarations, newStates);

// 4. Add useDailyEvent for raise-hand and lower-hand logic right before useEffect
const useEffectStr = `  useEffect(() => {
    if (!classId || !user) return;`;

const newLogic = `  useDailyEvent('app-message', useCallback((ev: any) => {
    if (ev.data?.type === 'raise-hand') {
      setRaisedHands(prev => prev.includes(ev.fromId) ? prev : [...prev, ev.fromId]);
    } else if (ev.data?.type === 'lower-hand') {
      setRaisedHands(prev => prev.filter(id => id !== ev.fromId));
    }
  }, []));

  useEffect(() => {
    if (!classId || !user) return;`;

content = content.replace(useEffectStr, newLogic);

// 5. Add toggleRaiseHand and teacher logic 
const fetchedRefStr = `  const fetchedRef = React.useRef(false);`;

const newTeacherLogic = `  const toggleRaiseHand = useCallback(() => {
    if (!daily || !localParticipant) return;
    const isRaised = raisedHands.includes(localParticipant.session_id);
    const type = isRaised ? 'lower-hand' : 'raise-hand';
    daily.sendAppMessage({ type }, '*');
    if (isRaised) {
      setRaisedHands(prev => prev.filter(id => id !== localParticipant.session_id));
    } else {
      setRaisedHands(prev => [...prev, localParticipant.session_id]);
    }
  }, [daily, localParticipant, raisedHands]);

  const teacherId = React.useMemo(() => {
    if (!daily) return null;
    const ps = daily.participants();
    const owner = Object.values(ps).find(p => (p as any).owner);
    if (owner) return owner.session_id;
    if (isTeacher && localParticipant) return localParticipant.session_id;
    return remoteParticipantIds.length > 0 ? remoteParticipantIds[0] : null;
  }, [daily, isTeacher, localParticipant, remoteParticipantIds]);

  const fetchedRef = React.useRef(false);`;

content = content.replace(fetchedRefStr, newTeacherLogic);

// 6. Update TeacherControls prop
const teacherControls = `<TeacherControls onEndClass={handleEndClass} isTeacher={isTeacher} />`;
const newTeacherControls = `<TeacherControls onEndClass={handleEndClass} isTeacher={isTeacher} onRaiseHand={toggleRaiseHand} isHandRaised={localParticipant ? raisedHands.includes(localParticipant.session_id) : false} />`;
content = content.replace(teacherControls, newTeacherControls);

// 7. Update mainVideoId calculation (remove it or replace it)
const mainVideoIdStr = `  const mainVideoId = isTeacher ? localParticipant?.session_id : (remoteParticipantIds.length > 0 ? remoteParticipantIds[0] : null);`;
content = content.replace(mainVideoIdStr, ``); // we don't need it, we use teacherId

// 8. Replace video rendering logic
const oldVideoGrid = `                 {mainVideoId ? (
                   <ParticipantVideo id={mainVideoId} isLocal={mainVideoId === localParticipant?.session_id} />
                 ) : (
                   <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center text-4xl font-bold text-slate-500 border-4 border-slate-700">
                      <Users className="w-12 h-12" />
                   </div>
                 )}
              </div>
              
              <div className="absolute top-4 right-4 flex flex-col gap-3 z-10">
                {(isTeacher ? remoteParticipantIds : (localParticipant ? [localParticipant.session_id, ...remoteParticipantIds.slice(0, 4)] : [])).map((studentId) => {
                  if (!studentId) return null;
                  return (
                    <div key={studentId} className="w-40 aspect-video bg-slate-800 rounded-xl border-2 border-slate-700 shadow-lg overflow-hidden relative group">
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <ParticipantVideo id={studentId} isLocal={studentId === localParticipant?.session_id} />
                      </div>
                      <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[90%]">
                        {studentId === localParticipant?.session_id ? 'You' : <ParticipantName id={studentId} />}
                      </div>
                    </div>
                  );
                })}
              </div>`;

const newVideoGrid = `                 {activeScreenShare ? (
                   <ScreenShareVideo id={activeScreenShare.session_id} isLocal={activeScreenShare.local} />
                 ) : teacherId ? (
                   <ParticipantVideo id={teacherId} isLocal={teacherId === localParticipant?.session_id} />
                 ) : (
                   <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center text-4xl font-bold text-slate-500 border-4 border-slate-700">
                      <Users className="w-12 h-12" />
                   </div>
                 )}
              </div>
              
              {activeScreenShare && teacherId && (
                <div className="absolute bottom-4 right-4 w-48 aspect-video bg-slate-800 rounded-xl border-2 border-slate-700 shadow-2xl overflow-hidden z-10 group">
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <ParticipantVideo id={teacherId} isLocal={teacherId === localParticipant?.session_id} />
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[90%] text-white">
                    {teacherId === localParticipant?.session_id ? 'You' : <ParticipantName id={teacherId} />}
                  </div>
                </div>
              )}`;

content = content.replace(oldVideoGrid, newVideoGrid);

// 9. Add Participants Tab in the sidebar buttons
const tabsStr = `            <button onClick={() => setActiveTab('chat')} className={\`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all \${activeTab === 'chat' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}\`}>
              <MessageSquare className="w-4 h-4" /> Chat
            </button>`;

const newTabsStr = `            <button onClick={() => setActiveTab('chat')} className={\`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all \${activeTab === 'chat' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}\`}>
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
            <button onClick={() => setActiveTab('participants')} className={\`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all \${activeTab === 'participants' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}\`}>
              <Users className="w-4 h-4" /> Users
            </button>`;

content = content.replace(tabsStr, newTabsStr);

// 10. Add Participants Tab Content right after activeTab === 'chat' block
const chatContentEnd = `                </form>
              </div>
            )}`;

const participantsContent = `                </form>
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-2 pb-4">
                  {[...(localParticipant ? [localParticipant.session_id] : []), ...remoteParticipantIds].map(id => (
                    <div key={id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700/50">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                           <Users className="w-4 h-4 text-slate-300" />
                         </div>
                         <div className="flex flex-col">
                           <span className="text-sm font-medium text-slate-200">
                             {id === localParticipant?.session_id ? 'You' : <ParticipantName id={id} />}
                             {id === teacherId && ' (Teacher)'}
                           </span>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         {raisedHands.includes(id) && (
                            <Hand className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}`;

content = content.replace(chatContentEnd, participantsContent);

fs.writeFileSync('pages/LiveClassRoom.tsx', content, 'utf8');
console.log('Successfully updated LiveClassRoom.tsx');
