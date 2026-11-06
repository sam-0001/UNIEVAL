import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { uploadExamIntelligence, listExamIntelligence, deleteExamIntelligence, ListItem } from '../../../services/examIntelligenceApi';

export const ExamPrepTab: React.FC = () => {
  const [examFile, setExamFile] = useState<File | null>(null);
  const [examStatus, setExamStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [examMessage, setExamMessage] = useState('');
  const [examPreview, setExamPreview] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<ListItem[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const fetchUploadedFiles = async () => {
    setFilesLoading(true);
    try {
      const list = await listExamIntelligence();
      setUploadedFiles(list || []);
    } catch {
      setUploadedFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleDeleteFile = async (item: ListItem) => {
    if (!window.confirm(`Delete "${item.subject} (Sem ${item.semester})"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    setDeleteMessage(null);
    try {
      await deleteExamIntelligence(item.id);
      setUploadedFiles(prev => prev.filter(f => f.id !== item.id));
      setDeleteMessage({ type: 'success', text: `"${item.subject}" deleted successfully.` });
    } catch (err: any) {
      setDeleteMessage({ type: 'error', text: err.message || 'Failed to delete.' });
    } finally {
      setDeletingId(null);
      setTimeout(() => setDeleteMessage(null), 4000);
    }
  };

  const handleExamFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setExamFile(file);
    setExamStatus('idle');
    setExamMessage('');
    setExamPreview(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setExamPreview(JSON.parse(ev.target?.result as string));
      } catch {
        setExamStatus('error');
        setExamMessage('Invalid JSON file — could not parse.');
      }
    };
    reader.readAsText(file);
  };

  const handleExamUpload = async () => {
    if (!examPreview) return;
    setExamStatus('loading');
    setExamMessage('');
    try {
      const result = await uploadExamIntelligence(examPreview);
      setExamStatus('success');
      setExamMessage(result.message || 'Uploaded successfully!');
      setExamFile(null);
      setExamPreview(null);
      fetchUploadedFiles();
    } catch (err: any) {
      setExamStatus('error');
      setExamMessage(err.message || 'Upload failed.');
    }
  };

  const handleLoadDemo = async () => {
    setSeedStatus('loading');
    const demo = {
      subject: "Data Structures & Algorithms",
      semester: "3",
      branch: "Computer Engineering",
      units: [
        {
          unit: "Unit 1",
          title: "Arrays & Linked Lists",
          topics: [
            {
              name: "Array Operations",
              priority: "high",
              weightage: 25,
              frequency: 8,
              topQuestions: ["Explain time complexity of array insertion.", "Compare arrays and linked lists."],
              pyqs: [
                { question: "Write an algorithm to reverse an array in-place.", year: 2023, marks: 5 },
                { question: "What is the difference between static and dynamic arrays?", year: 2022, marks: 3 }
              ]
            },
            {
              name: "Singly Linked List",
              priority: "high",
              weightage: 20,
              frequency: 7,
              topQuestions: ["Implement insert at head in linked list.", "How to detect a cycle in a linked list?"],
              pyqs: [
                { question: "Write a program to reverse a singly linked list.", year: 2023, marks: 5 }
              ]
            }
          ]
        },
        {
          unit: "Unit 2",
          title: "Stacks & Queues",
          topics: [
            {
              name: "Stack Implementation",
              priority: "high",
              weightage: 15,
              frequency: 9,
              topQuestions: ["Implement stack using array.", "Applications of stack in expression evaluation."],
              pyqs: [
                { question: "Convert infix expression to postfix using stack.", year: 2023, marks: 6 }
              ]
            }
          ]
        }
      ]
    };
    try {
      await uploadExamIntelligence(demo as any);
      setSeedStatus('success');
      fetchUploadedFiles();
    } catch {
      setSeedStatus('error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Exam Intelligence & Syllabus Analysis
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Upload and manage SPPU past papers, unit weightages, topic priority maps, and recurring questions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Upload Syllabus JSON</h3>
            <p className="text-xs text-gray-500 mb-4">Select structured JSON with subjects, units, and PYQs.</p>

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-200 rounded-xl cursor-pointer bg-indigo-50/50 hover:bg-indigo-50 transition-colors mb-4">
              <span className="text-2xl mb-1">📂</span>
              <span className="text-xs text-indigo-700 font-semibold px-2 text-center truncate max-w-full">
                {examFile ? examFile.name : 'Select .json file'}
              </span>
              <span className="text-[10px] text-gray-400 mt-1">Structured syllabus format</span>
              <input type="file" accept=".json" className="hidden" onChange={handleExamFileChange} />
            </label>

            {examPreview && (() => {
              const items: any[] = Array.isArray(examPreview) ? examPreview : (Array.isArray(examPreview?.subjects) ? examPreview.subjects : [examPreview]);
              const totalUnits = items.reduce((a: number, s: any) => a + (s.units?.length ?? 0), 0);
              const totalTopics = items.reduce((a: number, s: any) => a + (s.units?.reduce((b: number, u: any) => b + (u.topics?.length ?? 0), 0) ?? 0), 0);
              return (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs text-gray-600">
                  <p className="font-semibold text-gray-800 mb-1">Preview ({items.length} subject{items.length > 1 ? 's' : ''})</p>
                  {items.map((s: any, i: number) => (
                    <p key={i} className="text-indigo-700 font-medium truncate">• {s.subject} (Sem {s.semester})</p>
                  ))}
                  <p className="mt-2 text-gray-500 text-[11px]">Units: <strong className="text-gray-700">{totalUnits}</strong> | Topics: <strong className="text-gray-700">{totalTopics}</strong></p>
                </div>
              );
            })()}

            {examMessage && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-4 ${examStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {examStatus === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span className="truncate">{examMessage}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleExamUpload}
              disabled={!examPreview || examStatus === 'loading'}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
            >
              {examStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Upload JSON
            </button>
            <button
              onClick={handleLoadDemo}
              disabled={seedStatus === 'loading'}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-lg transition disabled:opacity-50"
              title="Load Demo DSA Subject"
            >
              {seedStatus === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '🧪 Demo'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-sm">Uploaded Exam Intelligence Subjects ({uploadedFiles.length})</h3>
              <button onClick={fetchUploadedFiles} disabled={filesLoading} className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50">
                {filesLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '↻'} Refresh
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">These syllabus topics, weightages, and PYQs are live for students in Exam Prep.</p>

            {deleteMessage && (
              <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 ${deleteMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {deleteMessage.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                {deleteMessage.text}
              </div>
            )}

            {filesLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                Loading exam subjects...
              </div>
            ) : uploadedFiles.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-xs">
                No subjects uploaded yet. Upload a JSON file or click Demo to test.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-100 max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2.5">Subject</th>
                      <th className="px-3 py-2.5">Semester</th>
                      <th className="px-3 py-2.5">Branch</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {uploadedFiles.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-gray-800">{item.subject}</td>
                        <td className="px-3 py-2.5">
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded">Sem {item.semester}</span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">{item.branch || '—'}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteFile(item)}
                            disabled={deletingId === item.id}
                            className="text-red-600 hover:text-red-800 font-semibold text-[11px] disabled:opacity-50 transition inline-flex items-center gap-1"
                          >
                            {deletingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamPrepTab;
