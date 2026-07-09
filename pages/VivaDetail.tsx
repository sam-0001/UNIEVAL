import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Viva } from '../types';

import { useAuth } from '../context/AuthContext';

// Interface for evaluation result
interface Evaluation {
  score: number; // 0 to 10
  feedback: string;
}

// Add types for Speech Recognition
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

const VivaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, setShowLoginModal } = useAuth();
  
  // Viva Data
  const [viva, setViva] = useState<Viva | null>(null);
  const [loading, setLoading] = useState(true);
  
  // User Interactions
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> text
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({}); // questionId -> result
  const [loadingEval, setLoadingEval] = useState<Record<string, boolean>>({}); // questionId -> isAnalyzing
  const [isListening, setIsListening] = useState<string | null>(null); // questionId currently listening

  useEffect(() => {
    if (id) {
      setLoading(true);
      api.getVivaById(id).then(data => {
        setViva(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  // Voice to Text Handler
  const startListening = (questionId: string) => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const SpeechRecognition = (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(questionId);
    };

    recognition.onend = () => {
      setIsListening(null);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error", event.error);
      setIsListening(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setAnswers(prev => ({
        ...prev,
        [questionId]: (prev[questionId] ? prev[questionId] + ' ' : '') + transcript
      }));
    };

    recognition.start();
  };

  // AI Evaluation Handler
  const handleEvaluate = async (questionId: string) => {
    if (!viva || !viva.questions) return;
    
    const question = viva.questions.find(q => q.id === questionId);
    const userAnswer = answers[questionId];

    if (!question || !userAnswer || userAnswer.trim().length === 0) {
        alert("Please provide an answer before evaluating.");
        return;
    }

    setLoadingEval(prev => ({ ...prev, [questionId]: true }));

    try {
        const prompt = `
            You are an expert engineering examiner conducting a Viva Voce.
            
            Question: "${question.text}"
            Expected Concept/Key Points: "${question.correctAnswer}"
            Student Answer: "${userAnswer}"
            
            Evaluation Guidelines:
            1. Conceptual Match: If the student's answer conveys the correct meaning, treat it as CORRECT even if wording differs.
            2. Voice Input: Ignore minor grammatical errors or phonetic misinterpretations.
            3. Scoring: 8-10 correct, 5-7 partial, 0-4 wrong/irrelevant.
            
            Output Format: JSON only.
            {"score": number (0-10), "feedback": "string (under 30 words)"}
        `;
        const token = localStorage.getItem('token');
        const aiRes = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ prompt }),
        });
        if (!aiRes.ok) throw new Error('AI request failed');
        const aiData = await aiRes.json();
        const rawText = (aiData.text || '{}').replace(/```json|```/g, '').trim();
        const result = JSON.parse(rawText);
        
        setEvaluations(prev => ({
            ...prev,
            [questionId]: {
                score: result.score || 0,
                feedback: result.feedback || "Could not generate feedback."
            }
        }));

    } catch (error) {
        console.error("Evaluation failed", error);
        alert("Failed to evaluate. Please try again.");
    } finally {
        setLoadingEval(prev => ({ ...prev, [questionId]: false }));
    }
  };

  if (loading) return <div className="p-12 text-center">Loading Viva session...</div>;
  if (!viva || !viva.questions) return <div className="p-12 text-center">Viva set not found.</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
       <Link to="/browse?tab=viva" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Viva List
       </Link>

       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-8">
            <div className="flex items-start gap-4">
                <div className="bg-green-100 p-3 rounded-xl text-green-600">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{viva.title}</h1>
                    <p className="text-slate-600 mt-2">{viva.description}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{viva.questions.length} Questions</span>
                        <span>•</span>
                        <span>AI-Powered Evaluation</span>
                    </div>
                </div>
            </div>
       </div>

       {!user ? (
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
               <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                   <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                   </svg>
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">Login Required</h3>
               <p className="text-slate-600 mb-8 max-w-md mx-auto">
                   Please log in to access the Viva questions and use the AI evaluation features.
               </p>
               <button 
                   onClick={() => setShowLoginModal(true)}
                   className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all"
               >
                   Log In to Start
               </button>
           </div>
       ) : (
           <div className="space-y-8">
               {viva.questions.map((q, idx) => {
               const evaluation = evaluations[q.id];
               const isEvaluating = loadingEval[q.id];
               const listeningToThis = isListening === q.id;

               return (
                   <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                       <div className="bg-slate-50/50 p-6 border-b border-slate-100">
                           <h3 className="text-lg font-bold text-slate-800 flex items-start gap-3">
                               <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-1 rounded mt-0.5">Q{idx + 1}</span>
                               {q.text}
                           </h3>
                       </div>
                       
                       <div className="p-6">
                           <div className="relative">
                               <textarea 
                                   className="w-full border border-slate-300 rounded-lg p-4 pr-12 pb-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[100px] text-slate-700 resize-none bg-slate-50 focus:bg-white transition-colors"
                                   placeholder="Type your answer here or click the microphone to speak..."
                                   value={answers[q.id] || ''}
                                   onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                               ></textarea>
                               
                               <button 
                                   onClick={() => startListening(q.id)}
                                   className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${
                                       listeningToThis 
                                       ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
                                       : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                   }`}
                                   title="Speak Answer"
                               >
                                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                   </svg>
                               </button>
                           </div>

                           <div className="mt-4 flex justify-between items-center">
                               <button 
                                   onClick={() => handleEvaluate(q.id)}
                                   disabled={isEvaluating || !answers[q.id]}
                                   className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                               >
                                   {isEvaluating ? (
                                       <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Analyzing...
                                       </>
                                   ) : (
                                       <>
                                        <span>✨</span> Evaluate Answer
                                       </>
                                   )}
                               </button>
                           </div>

                           {/* AI Feedback Section */}
                           {evaluation && (
                               <div className="mt-6 animate-in slide-in-from-top-2 fade-in duration-300">
                                   <div className={`rounded-xl p-5 border ${
                                       evaluation.score >= 7 ? 'bg-green-50 border-green-200' : 
                                       evaluation.score >= 4 ? 'bg-amber-50 border-amber-200' : 
                                       'bg-red-50 border-red-200'
                                   }`}>
                                       <div className="flex items-center justify-between mb-3">
                                           <span className="font-bold text-sm uppercase tracking-wider text-slate-500">AI Feedback</span>
                                           <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                evaluation.score >= 7 ? 'bg-green-200 text-green-800' : 
                                                evaluation.score >= 4 ? 'bg-amber-200 text-amber-800' : 
                                                'bg-red-200 text-red-800'
                                           }`}>
                                               Score: {evaluation.score}/10
                                           </div>
                                       </div>
                                       <p className="text-slate-800 leading-relaxed font-medium">
                                           {evaluation.feedback}
                                       </p>
                                       {evaluation.score < 10 && (
                                           <div className="mt-4 pt-4 border-t border-slate-200/50">
                                               <p className="text-xs font-bold text-slate-500 uppercase mb-1">Expected Key Points</p>
                                               <p className="text-sm text-slate-600 italic">{q.correctAnswer}</p>
                                           </div>
                                       )}
                                   </div>
                               </div>
                           )}
                       </div>
                   </div>
               );
           })}
       </div>
       )}
    </div>
  );
};

export default VivaDetail;