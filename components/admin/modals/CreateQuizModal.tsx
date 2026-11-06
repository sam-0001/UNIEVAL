import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Quiz, Question } from '../../../types';
import { SubjectSelector } from '../../SubjectSelector';
import { useSubjectSelection } from '../../../hooks/useSubjectSelection';
import { INPUT_CLASS, LABEL_CLASS } from './common';

export interface CreateQuizModalProps {
    onClose: () => void;
    editItem?: Quiz | null;
    onSave: (data: Quiz) => void;
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({ onClose, editItem, onSave }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState(editItem?.title || '');
    const [duration, setDuration] = useState(editItem?.durationMinutes?.toString() || '30');
    const [price, setPrice] = useState(editItem?.price?.toString() || '0');
    const [originalPrice, setOriginalPrice] = useState(editItem?.originalPrice?.toString() || '');
    const subjectSelection = useSubjectSelection(editItem?.subjectId);
    const [questions, setQuestions] = useState<Question[]>(editItem?.questions ? editItem.questions.map(q => ({ ...q, options: q.options || ['', '', '', ''] })) : []);

    const addQuestion = () => setQuestions([...questions, { id: Date.now().toString(), text: '', options: ['', '', '', ''], correctAnswer: '' }]);
    const updateQuestionText = (id: string, text: string) => setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
    const updateOption = (qId: string, optIndex: number, val: string) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            const newOpts = [...(q.options || [])];
            const oldVal = newOpts[optIndex];
            newOpts[optIndex] = val;
            return { ...q, options: newOpts, correctAnswer: q.correctAnswer === oldVal ? val : q.correctAnswer };
        }));
    };
    const updateCorrectAnswer = (id: string, ans: string) => setQuestions(questions.map(q => q.id === id ? { ...q, correctAnswer: ans } : q));

    const handleSave = async () => {
        const finalSubjectId = await subjectSelection.getSubjectForSave();
        onSave({ id: editItem?.id || '', title, subjectId: finalSubjectId, teacherId: user?.id || '', questionCount: questions.length, durationMinutes: parseInt(duration) || 30, price: parseFloat(price) || 0, originalPrice: originalPrice ? parseFloat(originalPrice) : undefined, questions });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">{editItem ? 'Edit Quiz' : 'Create New Quiz'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                </div>
                <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
                    <div><label className={LABEL_CLASS}>Quiz Title</label><input type="text" className={INPUT_CLASS} placeholder="e.g. Thermodynamics MCQ Test 1" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><SubjectSelector {...subjectSelection} inputClass={INPUT_CLASS} labelClass={LABEL_CLASS} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={LABEL_CLASS}>Time Limit (Mins)</label><input type="number" className={INPUT_CLASS} value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
                        <div><label className={LABEL_CLASS}>Price (₹)</label><div className="grid grid-cols-2 gap-2"><input type="number" className={INPUT_CLASS} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Selling" /><input type="number" className={INPUT_CLASS} value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Original" /></div></div>
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="font-bold text-gray-800">Questions</h3>
                             <button onClick={addQuestion} className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-blue-700 transition">+ Add Question</button>
                        </div>
                        <div className="space-y-6">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between mb-2"><span className="font-bold text-sm text-gray-600">Question {idx + 1}</span></div>
                                    <input type="text" className={`${INPUT_CLASS} mb-3`} placeholder="Enter question text..." value={q.text} onChange={(e) => updateQuestionText(q.id, e.target.value)} />
                                    <div className="space-y-3 mb-3">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Options (Select the correct one)</label>
                                        {[0,1,2,3].map(opt => (
                                            <div key={opt} className="flex items-center gap-3">
                                                <input type="radio" name={`correct-ans-${q.id}`} checked={q.options && q.options[opt] === q.correctAnswer && q.options[opt] !== ''} onChange={() => updateCorrectAnswer(q.id, q.options![opt])} className="w-5 h-5 text-green-600 focus:ring-green-500 cursor-pointer accent-green-600" />
                                                <input type="text" className={`w-full border rounded p-2 text-xs outline-none transition-all ${q.options && q.options[opt] === q.correctAnswer && q.options[opt] !== '' ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-300 focus:ring-1 focus:ring-indigo-500'}`} placeholder={`Option ${opt + 1}`} value={q.options ? q.options[opt] : ''} onChange={(e) => updateOption(q.id, opt, e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {questions.length === 0 && <p className="text-gray-400 text-sm text-center italic">No questions added yet.</p>}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2.5 font-bold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg shadow-lg shadow-indigo-200 transition">Publish Quiz</button>
                </div>
            </div>
        </div>
    );
};

export default CreateQuizModal;
