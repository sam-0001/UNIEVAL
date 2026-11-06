import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { Note } from '../../../types';
import { SubjectSelector } from '../../SubjectSelector';
import { useSubjectSelection } from '../../../hooks/useSubjectSelection';
import { Clock } from 'lucide-react';
import { INPUT_CLASS, LABEL_CLASS } from './common';

export interface CreateNoteModalProps {
    onClose: () => void;
    editItem?: Note | null;
    onSave: (data: Note) => void;
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({ onClose, editItem, onSave }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState(editItem?.title || '');
    const [description, setDescription] = useState(editItem?.description || '');
    const [noteThumbnailFile, setNoteThumbnailFile] = useState<File | null>(null);
    const [noteThumbnailPreview, setNoteThumbnailPreview] = useState<string>(editItem?.thumbnailUrl || '');
    const [thumbnailUploading, setThumbnailUploading] = useState(false);
    const [price, setPrice] = useState(editItem?.price?.toString() || '199');
    const [originalPrice, setOriginalPrice] = useState(editItem?.originalPrice?.toString() || '');
    const [collegeName, setCollegeName] = useState(editItem?.collegeConfig?.name || '');
    const [collegeDomain, setCollegeDomain] = useState(editItem?.collegeConfig?.emailDomain || '');
    const [enableCollegeFree, setEnableCollegeFree] = useState(!!(editItem?.collegeConfig?.name && editItem?.collegeConfig?.emailDomain));
    const [validityType, setValidityType] = useState<'months' | 'date'>(editItem?.validityType || 'months');
    const [validityMonths, setValidityMonths] = useState<number>(editItem?.validityMonths || 6);
    const [validityDate, setValidityDate] = useState<string>(
        editItem?.validityDate ? new Date(editItem.validityDate).toISOString().split('T')[0] : ''
    );
    const subjectSelection = useSubjectSelection(editItem?.subjectId);
    
    interface NoteModalFile {
        id: string;
        name: string;
        content: string;
        isFree?: boolean;
        status: 'ready' | 'uploading' | 'failed';
        progress: number;
        error?: string;
        rawFile?: File;
    }

    interface NoteModalSection {
        id: string;
        title: string;
        files: NoteModalFile[];
    }

    const [sections, setSections] = useState<NoteModalSection[]>(() => 
        (editItem?.sections && editItem.sections.length > 0) ? editItem.sections.map(s => ({ 
            id: String(s.id || crypto.randomUUID()), 
            title: s.title || '', 
            files: (s.files || []).map((f: any) => ({
                id: String(f.id || f._id || crypto.randomUUID()),
                name: f.title || f.name || 'Untitled File',
                content: f.url || '',
                isFree: !!f.isFree,
                status: 'ready' as const,
                progress: 100
            })) 
        })) : [{ id: crypto.randomUUID(), title: 'Notes', files: [] }]
    );
    
    const addSection = () => setSections(prev => [...prev, { id: crypto.randomUUID(), title: 'New Section', files: [] }]);
    const updateSectionTitle = (id: string | number, title: string) => setSections(prev => prev.map(s => String(s.id) === String(id) ? { ...s, title } : s));
    const removeSection = (id: string | number) => setSections(prev => prev.filter(s => String(s.id) !== String(id)));

    const uploadSingleFile = async (sectionId: string | number, fileItem: NoteModalFile) => {
        if (!fileItem.rawFile) return;
        const file = fileItem.rawFile;
        const isBundle = file.name.toLowerCase().endsWith('.zip');
        const endpoint = isBundle ? '/api/upload/html-bundle' : '/api/upload/file';
        const token = localStorage.getItem('token');

        setSections(prev => prev.map(s => {
            if (String(s.id) !== String(sectionId)) return s;
            return {
                ...s,
                files: s.files.map(f => f.id === fileItem.id ? { ...f, status: 'uploading' as const, progress: 0, error: undefined } : f)
            };
        }));

        try {
            const result = await new Promise<{ url: string; fileId?: string; entryName?: string }>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', endpoint);
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
                xhr.timeout = 120000; // 2 minute timeout per file

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
                        setSections(prev => prev.map(s => {
                            if (String(s.id) !== String(sectionId)) return s;
                            return {
                                ...s,
                                files: s.files.map(f => f.id === fileItem.id ? { ...f, progress: percent } : f)
                            };
                        }));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            resolve(data);
                        } catch {
                            reject(new Error('Invalid response from server'));
                        }
                    } else {
                        let errorMsg = `Upload failed (${xhr.status})`;
                        try {
                            const errJson = JSON.parse(xhr.responseText);
                            if (errJson.error) errorMsg = errJson.error;
                        } catch {}
                        reject(new Error(errorMsg));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'));

                const formData = new FormData();
                formData.append('file', file);
                xhr.send(formData);
            });

            // Upload success: update the file state
            setSections(prev => prev.map(s => {
                if (String(s.id) !== String(sectionId)) return s;
                return {
                    ...s,
                    files: s.files.map(f => f.id === fileItem.id ? {
                        ...f,
                        id: result.fileId || f.id,
                        name: isBundle ? (result.entryName || file.name) : file.name,
                        content: result.url,
                        status: 'ready' as const,
                        progress: 100,
                        error: undefined
                    } : f)
                };
            }));
        } catch (err: any) {
            console.error(`Failed to upload ${file.name}:`, err);
            setSections(prev => prev.map(s => {
                if (String(s.id) !== String(sectionId)) return s;
                return {
                    ...s,
                    files: s.files.map(f => f.id === fileItem.id ? {
                        ...f,
                        status: 'failed' as const,
                        progress: 0,
                        error: err.message || 'Upload failed'
                    } : f)
                };
            }));
        }
    };

    const addFilesToSection = (sectionId: string | number, newFiles: File[]) => {
        const newItems: NoteModalFile[] = newFiles.map(file => ({
            id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: file.name,
            content: '',
            isFree: false,
            status: 'uploading' as const,
            progress: 0,
            rawFile: file
        }));

        setSections(prev => prev.map(s => {
            if (String(s.id) !== String(sectionId)) return s;
            return { ...s, files: [...s.files, ...newItems] };
        }));

        newItems.forEach(item => {
            uploadSingleFile(sectionId, item);
        });
    };

    const retryFileUpload = (sectionId: string | number, fileId: string) => {
        const section = sections.find(s => String(s.id) === String(sectionId));
        const fileItem = section?.files.find(f => f.id === fileId);
        if (fileItem && fileItem.rawFile) {
            uploadSingleFile(sectionId, fileItem);
        }
    };

    const removeFileFromSection = (sectionId: string | number, fileId: string) => {
        setSections(prev => prev.map(s => {
            if (String(s.id) !== String(sectionId)) return s;
            return { ...s, files: s.files.filter(f => f.id !== fileId) };
        }));
    };

    const toggleFileFree = (sectionId: string | number, fileId: string) => {
        setSections(prev => prev.map(s => {
            if (String(s.id) !== String(sectionId)) return s;
            return { ...s, files: s.files.map(f => f.id === fileId ? { ...f, isFree: !f.isFree } : f) };
        }));
    };

    const isAnyFileUploading = sections.some(s => s.files.some(f => f.status === 'uploading'));
    const isAnyFileFailed = sections.some(s => s.files.some(f => f.status === 'failed'));

    const handleSave = async () => {
        if (isAnyFileUploading) {
            alert("Please wait for all files to finish uploading before saving.");
            return;
        }
        if (isAnyFileFailed) {
            if (!confirm("Some files failed to upload. Do you want to save without the failed files?")) {
                return;
            }
        }

        let finalNoteThumbnail = editItem?.thumbnailUrl || '';
        if (noteThumbnailFile) {
            setThumbnailUploading(true);
            try {
                const { uploadUrl, publicUrl } = await api.getPresignedUrl(noteThumbnailFile.name, noteThumbnailFile.type, noteThumbnailFile.size, false);
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', uploadUrl);
                    xhr.setRequestHeader('Content-Type', noteThumbnailFile.type);
                    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(null) : reject();
                    xhr.onerror = reject;
                    xhr.send(noteThumbnailFile);
                });
                finalNoteThumbnail = publicUrl;
            } catch (err) {
                console.error("Note thumbnail upload failed", err);
                alert("Failed to upload note thumbnail. Saving without it.");
            } finally {
                setThumbnailUploading(false);
            }
        }

        const finalSubjectId = await subjectSelection.getSubjectForSave();
        const noteData = {
            id: editItem?.id || '', title, description,
            subjectId: finalSubjectId, teacherId: user?.id || '',
            uploadedAt: editItem?.uploadedAt || new Date().toISOString(),
            thumbnailUrl: finalNoteThumbnail,
            price: parseFloat(price) || 0,
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            collegeConfig: (enableCollegeFree && collegeName.trim() && collegeDomain.trim()) 
                ? { name: collegeName.trim(), emailDomain: collegeDomain.trim().toLowerCase() } 
                : null,
            validityType,
            validityMonths: validityType === 'months' ? validityMonths : 6,
            validityDate: validityType === 'date' && validityDate ? validityDate : undefined,
            sections: sections.map(s => ({
                id: String(s.id), title: s.title,
                files: s.files
                    .filter(f => f.status !== 'failed' && f.content && f.content !== '#')
                    .map((f: any) => ({
                        id: f.id || crypto.randomUUID(),
                        title: f.name,
                        url: f.content,
                        isFree: !!f.isFree
                    }))
            }))
        };
        onSave(noteData as unknown as Note);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">{editItem ? 'Edit Note' : 'Create Note'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                </div>
                <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/3">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Package Thumbnail</label>
                            <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-colors group cursor-pointer">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setNoteThumbnailFile(e.target.files[0]);
                                            setNoteThumbnailPreview(URL.createObjectURL(e.target.files[0]));
                                        }
                                    }} 
                                />
                                {noteThumbnailPreview ? (
                                    <img src={noteThumbnailPreview} alt="Note Package Cover" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-sm font-medium text-gray-500">Upload Thumbnail</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="bg-white text-gray-900 px-3 py-1 rounded-md text-sm font-bold shadow">Change</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">Recommended: 16:9 widescreen image (PNG, JPG, WEBP)</p>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className={LABEL_CLASS}>Title</label>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} placeholder="e.g. Engineering Mathematics I Notes" />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Description</label>
                                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT_CLASS} placeholder="Brief summary of what this note package covers..."></textarea>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><SubjectSelector {...subjectSelection} inputClass={INPUT_CLASS} labelClass={LABEL_CLASS} /></div>
                    <div>
                        <label className={LABEL_CLASS}>Price (₹)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT_CLASS} placeholder="Selling Price" />
                            <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className={INPUT_CLASS} placeholder="Original Price (Optional)" />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">If Original Price is set, it will show as crossed out.</p>
                    </div>

                    <div className="p-5 border border-indigo-100 bg-indigo-50/50 rounded-xl space-y-3">
                        <div>
                            <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                Student Access Expiry / Validity
                            </h4>
                            <p className="text-xs text-indigo-700/80 mt-0.5">
                                Set when student access expires after purchasing or unlocking. Default is 6 months.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input 
                                    type="radio" 
                                    name="noteValidityType" 
                                    value="months" 
                                    checked={validityType === 'months'} 
                                    onChange={() => setValidityType('months')}
                                    className="text-indigo-600 focus:ring-indigo-500" 
                                />
                                Duration in Months
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input 
                                    type="radio" 
                                    name="noteValidityType" 
                                    value="date" 
                                    checked={validityType === 'date'} 
                                    onChange={() => setValidityType('date')}
                                    className="text-indigo-600 focus:ring-indigo-500" 
                                />
                                Exact Expiry Date
                            </label>
                        </div>
                        {validityType === 'months' ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <div className="w-32">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="60"
                                        value={validityMonths} 
                                        onChange={(e) => setValidityMonths(Math.max(1, parseInt(e.target.value) || 1))} 
                                        className={INPUT_CLASS} 
                                        placeholder="6" 
                                    />
                                </div>
                                <span className="text-xs text-gray-600 font-medium">Month(s) access from purchase/unlock date (Default: 6 months). After this, student access is revoked.</span>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <div className="w-48">
                                    <input 
                                        type="date" 
                                        min={new Date().toISOString().split('T')[0]}
                                        value={validityDate} 
                                        onChange={(e) => setValidityDate(e.target.value)} 
                                        className={INPUT_CLASS} 
                                    />
                                </div>
                                <span className="text-xs text-gray-600 font-medium">Access will automatically expire for all students at 11:59 PM on this exact date.</span>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border border-purple-100 bg-purple-50/50 rounded-xl space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h4 className="text-sm font-bold text-purple-900">College-Specific Free Access</h4>
                                <p className="text-xs text-purple-600 mt-0.5">Allow students from a specific college email domain to access these notes for free.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input 
                                    type="checkbox" 
                                    checked={enableCollegeFree} 
                                    onChange={(e) => {
                                        setEnableCollegeFree(e.target.checked);
                                        if (!e.target.checked) {
                                            setCollegeName('');
                                            setCollegeDomain('');
                                        }
                                    }} 
                                    className="sr-only peer" 
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        {enableCollegeFree ? (
                            <div className="space-y-3 pt-3 border-t border-purple-100 animate-in fade-in slide-in-from-top-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-purple-700 uppercase mb-1">College Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. COEP Tech, VJTI" 
                                            value={collegeName} 
                                            onChange={(e) => setCollegeName(e.target.value)} 
                                            className={`${INPUT_CLASS} border-purple-200 focus:ring-purple-500 focus:border-purple-500`} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-purple-700 uppercase mb-1">Email Domain</label>
                                        <input 
                                            type="text" 
                                            placeholder="@coep.ac.in" 
                                            value={collegeDomain} 
                                            onChange={(e) => setCollegeDomain(e.target.value)} 
                                            className={`${INPUT_CLASS} border-purple-200 focus:ring-purple-500 focus:border-purple-500`} 
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-purple-700 pt-1">
                                    <span>Students logging in with emails ending in this domain will bypass payment and access for free.</span>
                                    <button 
                                        type="button" 
                                        onClick={() => { setEnableCollegeFree(false); setCollegeName(''); setCollegeDomain(''); }} 
                                        className="text-red-600 hover:text-red-700 font-bold hover:underline shrink-0 text-left"
                                    >
                                        Remove College Access
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-500 flex items-center justify-between">
                                <span>Standard mode: All students must purchase these notes.</span>
                                {editItem?.collegeConfig && (
                                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        College free access will be removed upon saving
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="font-bold text-gray-800">Course Materials</h3>
                             <button onClick={addSection} className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-slate-700 transition">+ Add Section</button>
                        </div>
                        <div className="space-y-4">
                             {sections.map((section) => (
                                 <div key={section.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                     <div className="flex justify-between items-center mb-2">
                                         <input type="text" value={section.title} onChange={(e) => updateSectionTitle(section.id, e.target.value)} className="font-bold text-gray-800 bg-gray-50 border border-gray-200 hover:border-indigo-500 focus:border-indigo-500 rounded px-2 py-1 outline-none w-2/3" placeholder="Section Title" />
                                         <button onClick={() => removeSection(section.id)} className="text-xs text-red-500 font-bold hover:underline">Remove Section</button>
                                     </div>
                                     <div className="border-t border-dashed border-gray-200 pt-3">
                                         {section.files.length > 0 && (
                                             <ul className="mb-3 space-y-2">
                                                 {section.files.map((file) => (
                                                     <li key={file.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-gray-50 border border-gray-200 p-2.5 rounded-lg gap-2">
                                                         <div className="flex items-center gap-2 flex-grow min-w-0">
                                                             <span className="text-base flex-shrink-0">
                                                                 {file.name.endsWith('.zip') ? '📦' : file.name.match(/\.(png|jpe?g|webp|gif|svg)$/i) ? '🖼️' : '📄'}
                                                             </span>
                                                             <span className="font-medium text-gray-700 truncate" title={file.name}>
                                                                 {file.name}
                                                             </span>
                                                             
                                                             {file.status === 'uploading' && (
                                                                 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex-shrink-0">
                                                                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                                                                     {file.progress === 100 ? 'Encrypting & Storing...' : `Uploading ${file.progress}%`}
                                                                 </span>
                                                             )}
                                                             {file.status === 'failed' && (
                                                                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 flex-shrink-0" title={file.error}>
                                                                     ⚠️ Failed {file.error ? `(${file.error})` : ''}
                                                                 </span>
                                                             )}
                                                             {file.status === 'ready' && (
                                                                 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                                                                     ✓ Encrypted
                                                                 </span>
                                                             )}
                                                         </div>

                                                         {file.status === 'uploading' && (
                                                             <div className="w-full sm:w-28 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                                 <div 
                                                                     className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" 
                                                                     style={{ width: `${file.progress}%` }}
                                                                 ></div>
                                                             </div>
                                                         )}

                                                         <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                                             {file.status === 'ready' && (
                                                                 <label className="flex items-center gap-1 cursor-pointer text-[11px] text-gray-500 hover:text-gray-700">
                                                                     <input 
                                                                         type="checkbox" 
                                                                         checked={file.isFree} 
                                                                         onChange={() => toggleFileFree(section.id, file.id)}
                                                                         className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                                                     />
                                                                     <span>Free Demo</span>
                                                                 </label>
                                                             )}

                                                             {file.status === 'failed' && file.rawFile && (
                                                                 <button 
                                                                     type="button" 
                                                                     onClick={() => retryFileUpload(section.id, file.id)}
                                                                     className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition"
                                                                 >
                                                                     Retry
                                                                 </button>
                                                             )}

                                                             <button 
                                                                 type="button" 
                                                                 onClick={() => removeFileFromSection(section.id, file.id)} 
                                                                 className="text-gray-400 hover:text-red-500 p-1 text-sm font-bold transition rounded hover:bg-gray-200"
                                                                 title="Remove file"
                                                             >
                                                                 ✕
                                                             </button>
                                                         </div>
                                                     </li>
                                                 ))}
                                             </ul>
                                         )}
                                         <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,image/*" id={`note-files-${section.id}`} className="hidden"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                if (e.target.files && e.target.files.length > 0) { addFilesToSection(section.id, Array.from(e.target.files) as File[]); e.target.value = ''; }
                                            }} />
                                         <label htmlFor={`note-files-${section.id}`} className="block w-full py-2 border border-dashed border-gray-300 rounded text-xs text-center text-gray-500 hover:bg-gray-50 font-medium transition cursor-pointer">+ Click to Upload PDF / Docs / Images / Zip</label>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button onClick={onClose} disabled={thumbnailUploading || isAnyFileUploading} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">Cancel</button>
                    <button onClick={handleSave} disabled={thumbnailUploading || isAnyFileUploading} className="px-6 py-2.5 font-bold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg shadow-lg shadow-indigo-200 transition disabled:opacity-50 flex items-center gap-2">
                        {thumbnailUploading ? 'Uploading Thumbnail...' : isAnyFileUploading ? 'Uploading Files...' : 'Save Note'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateNoteModal;
