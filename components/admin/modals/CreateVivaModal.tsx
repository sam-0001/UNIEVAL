import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Viva, Question } from '../../../types';
import { SubjectSelector } from '../../SubjectSelector';
import { useSubjectSelection } from '../../../hooks/useSubjectSelection';
import { INPUT_CLASS, LABEL_CLASS } from './common';

export interface CreateVivaModalProps {
    onClose: () => void;
    editItem?: Viva | null;
    onSave: (data: Viva) => void;
}

export const CreateVivaModal: React.FC<CreateVivaModalProps> = ({ onClose, editItem, onSave }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState(editItem?.title || '');
    const [description, setDescription] = useState(editItem?.description || '');
    const [price, setPrice] = useState(editItem?.price?.toString() || '0');
    const [originalPrice, setOriginalPrice] = useState(editItem?.originalPrice?.toString() || '');
    const subjectSelection = useSubjectSelection(editItem?.subjectId);
    const [questions, setQuestions] = useState<Question[]>(editItem?.questions ? editItem.questions.map(q => ({ ...q, options: q.options || ['', '', '', ''] })) : []);

    const addQuestion = () => setQuestions([...questions, { id: Date.now().toString(), text: '', options: ['', '', '', ''], correctAnswer: '' }]);
    const updateQuestionText = (id: string, text: string) => setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
    const updateOption = (qId: string, optIndex: number, val: string) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            const newOpts = [...(q.options || ['', '', '', ''])];
            const oldVal = newOpts[optIndex];
            newOpts[optIndex] = val;
            return { ...q, options: newOpts, correctAnswer: (q.correctAnswer === oldVal && oldVal !== '') ? val : q.correctAnswer };
        }));
    };
    const updateExpectedAnswer = (id: string, ans: string) => setQuestions(questions.map(q => q.id === id ? { ...q, correctAnswer: ans } : q));

    const handleSave = async () => {
        const finalSubjectId = await subjectSelection.getSubjectForSave();
        onSave({ id: editItem?.id || '', title, description, subjectId: finalSubjectId, teacherId: user?.id || '', price: parseFloat(price) || 0, originalPrice: originalPrice ? parseFloat(originalPrice) : undefined, questions });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">{editItem ? 'Edit Viva Set' : 'Create Viva Set'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                </div>
                <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
                    <div><label className={LABEL_CLASS}>Set Title</label><input type="text" className={INPUT_CLASS} placeholder="e.g. Workshop Practice Viva" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                    <div><label className={LABEL_CLASS}>Description</label><textarea rows={3} className={INPUT_CLASS} placeholder="Brief about this viva set..." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><SubjectSelector {...subjectSelection} inputClass={INPUT_CLASS} labelClass={LABEL_CLASS} /></div>
                    <div>
                        <label className={LABEL_CLASS}>Price (₹)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT_CLASS} placeholder="Selling Price (0 for Free)" />
                            <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className={INPUT_CLASS} placeholder="Original Price (Optional)" />
                        </div>
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="font-bold text-gray-800">Viva Questions</h3>
                             <button onClick={addQuestion} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-green-700 transition">+ Add Question</button>
                        </div>
                        <div className="space-y-6">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between mb-2"><span className="font-bold text-sm text-gray-600">Q{idx + 1}</span></div>
                                    <input type="text" className={`${INPUT_CLASS} mb-3`} placeholder="Viva Question..." value={q.text} onChange={(e) => updateQuestionText(q.id, e.target.value)} />
                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Options (Optional for Multiple Choice)</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(q.options || ['', '', '', '']).map((opt, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-2">
                                                    <input type="radio" name={`viva-correct-${q.id}`} checked={q.correctAnswer === opt && opt !== ''} onChange={() => updateExpectedAnswer(q.id, opt)} className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                                    <input type="text" className="w-full border border-gray-300 rounded p-2 text-xs outline-none focus:border-indigo-500" placeholder={`Option ${optIdx + 1}`} value={opt} onChange={(e) => updateOption(q.id, optIdx, e.target.value)} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea className="w-full border border-gray-300 rounded p-2 text-xs bg-yellow-50 border-yellow-200 focus:ring-1 focus:ring-yellow-500 outline-none" placeholder="Expected Answer / Hint for student..." rows={2} value={q.correctAnswer || ''} onChange={(e) => updateExpectedAnswer(q.id, e.target.value)}></textarea>
                                </div>
                            ))}
                             {questions.length === 0 && <p className="text-gray-400 text-sm text-center italic">No viva questions added yet.</p>}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                    <button onClick={handleSave} className="px-6 py-2.5 font-bold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg shadow-lg shadow-indigo-200 transition">Publish Viva Set</button>
                </div>
            </div>
        </div>
    );
};

export default CreateVivaModal;
