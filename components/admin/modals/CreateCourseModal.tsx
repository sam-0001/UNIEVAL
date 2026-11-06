import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../services/api';
import { Course } from '../../../types';
import { SubjectSelector } from '../../SubjectSelector';
import { useSubjectSelection } from '../../../hooks/useSubjectSelection';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { INPUT_CLASS, LABEL_CLASS } from './common';

export interface CreateCourseModalProps {
    onClose: () => void;
    editItem?: Course | null;
    onSave: (data: Course) => void;
}

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ onClose, editItem, onSave }) => {
    const { user } = useAuth();
    
    const [title, setTitle] = useState(editItem?.title || '');
    const [description, setDescription] = useState(editItem?.description || '');
    const [courseThumbnailFile, setCourseThumbnailFile] = useState<File | null>(null);
    const [courseThumbnailPreview, setCourseThumbnailPreview] = useState<string>(editItem?.thumbnailUrl || '');
    const subjectSelection = useSubjectSelection(editItem?.subjectId);
    const [price, setPrice] = useState(editItem?.price?.toString() || '499');
    const [originalPrice, setOriginalPrice] = useState(editItem?.originalPrice?.toString() || '');
    const [discountMode, setDiscountMode] = useState(!!editItem?.originalPrice);
    const [enableCollegeFree, setEnableCollegeFree] = useState(!!(editItem?.collegeConfig?.name && editItem?.collegeConfig?.emailDomain));
    const [collegeName, setCollegeName] = useState(editItem?.collegeConfig?.name || '');
    const [collegeDomain, setCollegeDomain] = useState(editItem?.collegeConfig?.emailDomain || '');
    const [validityType, setValidityType] = useState<'months' | 'date'>(editItem?.validityType || 'months');
    const [validityMonths, setValidityMonths] = useState<number>(editItem?.validityMonths || 6);
    const [validityDate, setValidityDate] = useState<string>(
        editItem?.validityDate ? new Date(editItem.validityDate).toISOString().split('T')[0] : ''
    );
    
    const [modules, setModules] = useState<{
        id: number;
        title: string;
        videos: {
            id: number;
            title: string;
            fileName?: string;
            videoUrl?: string;
            videoStatus?: 'uploading' | 'processing' | 'finalizing' | 'ready' | 'error';
            videoProgress?: number;
            videoId?: string;
            videoKey?: string;
            resources?: { title: string; url: string; type: 'pdf' | 'link' }[];
            resourceFileName?: string;
        }[];
    }[]>(
        () => editItem?.modules.map(m => ({ 
            id: Math.random(), 
            title: m.title, 
            videos: m.videos ? m.videos.map(v => ({
                id: Math.random(),
                title: v.title,
                fileName: v.videoUrl && v.videoUrl !== '#' ? 'Saved Video File (Ready)' : '',
                videoUrl: v.videoUrl,
                videoStatus: (v.videoStatus || 'ready'),
                videoProgress: v.videoStatus === 'processing' ? 0 : 100,
                videoId: v.videoId,
                videoKey: v.videoKey,
                resources: v.resources || [],
                resourceFileName: v.resources?.[0]?.url ? 'Saved Resource' : ''
            })) : (m.videoUrl ? [{
                id: Math.random(),
                title: 'Video 1',
                fileName: m.videoUrl && m.videoUrl !== '#' ? 'Saved Video File (Ready)' : '',
                videoUrl: m.videoUrl,
                videoStatus: (m.videoStatus || 'ready'),
                videoProgress: 100,
                videoId: m.videoId,
                videoKey: m.videoKey,
                resources: m.resources || [],
                resourceFileName: m.resources?.[0]?.url ? 'Saved Resource' : ''
            }] : [])
        })) || []
    );

    const modulesRef = useRef(modules);
    useEffect(() => { modulesRef.current = modules; }, [modules]);

    useEffect(() => {
        const interval = setInterval(async () => {
            const currentModules = modulesRef.current;

            const hasProcessing = currentModules.some(m =>
                m.videos.some(v => v.videoStatus === 'processing' || v.videoStatus === 'finalizing')
            );
            if (!hasProcessing) return;

            for (const module of currentModules) {
                for (const video of module.videos) {
                    if ((video.videoStatus === 'processing' || video.videoStatus === 'finalizing') && video.videoId) {
                        try {
                            const response = await api.getVideoStatus(video.videoId);
                            setModules(prev => prev.map(m => m.id === module.id ? {
                                ...m,
                                videos: m.videos.map(v => v.id === video.id ? {
                                    ...v,
                                    videoStatus: response.status,
                                    videoProgress: response.progress,
                                    videoUrl: response.url || v.videoUrl
                                } : v)
                            } : m));
                        } catch (error) {
                            console.error("Error polling video status — marking as error:", error);
                            setModules(prev => prev.map(m => m.id === module.id ? {
                                ...m,
                                videos: m.videos.map(v => v.id === video.id ? {
                                    ...v,
                                    videoStatus: 'error' as const,
                                } : v)
                            } : m));
                        }
                    }
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, []);
    
    const addModule = () => setModules([...modules, { id: Date.now(), title: '', videos: [] }]);
    const removeModule = (id: number) => setModules(modules.filter(m => m.id !== id));
    const updateModule = (id: number, title: string) => setModules(modules.map(m => m.id === id ? { ...m, title } : m));
    const addVideo = (moduleId: number) => setModules(modules.map(m => m.id === moduleId ? { ...m, videos: [...m.videos, { id: Date.now(), title: '' }] } : m));
    const removeVideo = (moduleId: number, videoId: number) => setModules(modules.map(m => m.id === moduleId ? { ...m, videos: m.videos.filter(v => v.id !== videoId) } : m));
    const updateVideoTitle = (moduleId: number, videoId: number, title: string) => setModules(modules.map(m => m.id === moduleId ? { ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, title } : v) } : m));
    
    const handleFileSelect = async (moduleId: number, videoId: number, file: File | null) => {
        if (!file) return;
        const fileType = file.type || 'application/octet-stream';
        setModules(prev => prev.map(m => m.id === moduleId ? { 
            ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, fileName: file.name, videoStatus: 'uploading', videoProgress: 0 } : v)
        } : m));
        try {
            const { uploadUrl, publicUrl, key } = await api.getPresignedUrl(file.name, fileType, file.size, true);
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', fileType);
            let lastUpdate = 0;
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const now = Date.now();
                    if (now - lastUpdate > 100 || event.loaded === event.total) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        setModules(prev => prev.map(m => m.id === moduleId ? {
                            ...m, videos: m.videos.map(v => (v.id === videoId && v.videoStatus === 'uploading') ? { ...v, videoProgress: percentComplete } : v)
                        } : m));
                        lastUpdate = now;
                    }
                }
            };
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setModules(prev => prev.map(m => m.id === moduleId ? { 
                        ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'processing', videoProgress: 0, videoUrl: publicUrl, videoKey: key } : v)
                    } : m));
                    try {
                        const processResponse = await api.processVideo(publicUrl, key);
                        setModules(prev => prev.map(m => m.id === moduleId ? { 
                            ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoId: processResponse.videoId, videoUrl: processResponse.url || v.videoUrl } : v)
                        } : m));
                    } catch (err) {
                        console.error("Video processing failed:", err);
                        setModules(prev => prev.map(m => m.id === moduleId ? { 
                            ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'error' } : v)
                        } : m));
                    }
                } else {
                    setModules(prev => prev.map(m => m.id === moduleId ? { 
                        ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'error' } : v)
                    } : m));
                }
            };
            xhr.onerror = () => {
                setModules(prev => prev.map(m => m.id === moduleId ? { 
                    ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'error' } : v)
                } : m));
            };
            xhr.send(file);
        } catch (error) {
            console.error("File upload failed:", error);
            setModules(prev => prev.map(m => m.id === moduleId ? { 
                ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'error' } : v)
            } : m));
        }
    };

    const handleResourceSelect = async (moduleId: number, videoId: number, file: File | null) => {
        if (!file) return;
        const MAX_RESOURCE_MB = 50;
        if (file.size > MAX_RESOURCE_MB * 1024 * 1024) { alert(`Resource file is too large. Maximum allowed size is ${MAX_RESOURCE_MB}MB.`); return; }
        const ext = file.name.toLowerCase().split('.').pop() || 'bin';
        const mimeByExt: Record<string, string> = {
            pdf: 'application/pdf', doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ppt: 'application/vnd.ms-powerpoint',
            pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            txt: 'text/plain', md: 'text/plain', csv: 'text/csv',
            epub: 'application/epub+zip',
            odt: 'application/vnd.oasis.opendocument.text',
            odp: 'application/vnd.oasis.opendocument.presentation',
            ods: 'application/vnd.oasis.opendocument.spreadsheet',
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
        };
        const fileType = (file.type && file.type !== 'application/octet-stream') ? file.type : (mimeByExt[ext] || 'application/octet-stream');
        setModules(prev => prev.map(m => m.id === moduleId ? { 
            ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, resourceFileName: file.name + ' (Uploading...)' } : v)
        } : m));
        try {
            const { uploadUrl, publicUrl } = await api.getPresignedUrl(file.name, fileType, file.size, false);
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', fileType);
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setModules(prev => prev.map(m => m.id === moduleId ? { 
                        ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, resourceFileName: file.name, resources: [{ title: file.name, url: publicUrl, type: (ext === 'pdf' ? 'pdf' : 'link') }] } : v)
                    } : m));
                } else {
                    alert('Failed to upload resource');
                    setModules(prev => prev.map(m => m.id === moduleId ? { 
                        ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, resourceFileName: 'Upload failed' } : v)
                    } : m));
                }
            };
            xhr.onerror = () => { alert('Failed to upload resource'); };
            xhr.send(file);
        } catch (error) { console.error("Resource upload failed:", error); alert('Failed to upload resource'); }
    };

    const handleThumbnailSelect = async (moduleId: number, videoId: number, file: File | null) => {
        if (!file) return;
        const fileType = file.type || 'image/jpeg';
        try {
            const { uploadUrl, publicUrl } = await api.getPresignedUrl(file.name, fileType, file.size, false);
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl, true);
            xhr.setRequestHeader('Content-Type', fileType);
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setModules(prev => prev.map(m => m.id === moduleId ? {
                        ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, thumbnailUrl: publicUrl } : v)
                    } : m));
                } else {
                    alert('Failed to upload thumbnail');
                }
            };
            xhr.onerror = () => { alert('Failed to upload thumbnail'); };
            xhr.send(file);
        } catch (error) { console.error("Thumbnail upload failed:", error); alert('Failed to upload thumbnail'); }
    };

    const handleRetryProcessing = async (moduleId: number, videoId: number) => {
        const module = modules.find(m => m.id === moduleId);
        const video = module?.videos.find(v => v.id === videoId);
        
        if (!video || !video.videoUrl || !video.videoKey) { 
            alert("Cannot retry: Missing video information. Please re-upload."); 
            return; 
        }
        
        // Set UI to processing state
        setModules(prev => prev.map(m => m.id === moduleId ? { 
            ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'processing', videoProgress: 0 } : v)
        } : m));

        try {
            let rawUploadUrl = video.videoUrl;
            if (video.videoUrl.includes('.m3u8')) {
                if (video.videoUrl.startsWith('http')) {
                    const urlObj = new URL(video.videoUrl);
                    rawUploadUrl = `${urlObj.origin}/${video.videoKey}`;
                } else {
                    rawUploadUrl = `/uploads/${video.videoKey}`;
                }
            }

            const processResponse = await api.processVideo(rawUploadUrl, video.videoKey);
            
            setModules(prev => prev.map(m => m.id === moduleId ? { 
                ...m, videos: m.videos.map(v => v.id === videoId ? { 
                    ...v, 
                    videoId: processResponse.videoId, 
                    videoUrl: processResponse.url || v.videoUrl 
                } : v)
            } : m));
        } catch (err) {
            console.error("Video processing retry failed:", err);
            setModules(prev => prev.map(m => m.id === moduleId ? { 
                ...m, videos: m.videos.map(v => v.id === videoId ? { ...v, videoStatus: 'error' } : v)
            } : m));
        }
    };

    const handleSave = async () => {
        let uploading = false;
        modules.forEach(m => { m.videos.forEach(v => { if (v.videoStatus === 'uploading') { uploading = true; } }); });
        if (uploading) { alert("Please wait for all videos to finish uploading before saving."); return; }
        
        let finalCourseThumbnail = editItem?.thumbnailUrl || '';
        if (courseThumbnailFile) {
            try {
                const { uploadUrl, publicUrl } = await api.getPresignedUrl(courseThumbnailFile.name, courseThumbnailFile.type || 'image/jpeg', courseThumbnailFile.size, false);
                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', uploadUrl);
                    xhr.setRequestHeader('Content-Type', courseThumbnailFile.type || 'image/jpeg');
                    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Failed')));
                    xhr.onerror = () => reject(new Error('Failed'));
                    xhr.send(courseThumbnailFile);
                });
                finalCourseThumbnail = publicUrl;
            } catch (err) {
                console.error("Course thumbnail upload failed", err);
                alert("Failed to upload course thumbnail. Saving without it.");
            }
        }
        
        const finalSubjectId = await subjectSelection.getSubjectForSave();
        
        const courseData = {
            id: editItem?.id,
            title, 
            description,
            subjectId: finalSubjectId,
            teacherId: user?.id || '',
            thumbnailUrl: finalCourseThumbnail,
            createdAt: editItem?.createdAt || new Date().toISOString(),
            price: parseFloat(price) || 0,
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            collegeConfig: (enableCollegeFree && collegeName.trim() && collegeDomain.trim()) 
                ? { name: collegeName.trim(), emailDomain: collegeDomain.trim().toLowerCase() } 
                : null,
            validityType,
            validityMonths: validityType === 'months' ? validityMonths : 6,
            validityDate: validityType === 'date' && validityDate ? validityDate : undefined,
            modules: modules.map(m => ({
                id: m.id.toString(), 
                title: m.title,
                videos: m.videos.map(v => ({
                    id: v.id.toString(), 
                    title: v.title,
                    videoUrl: v.videoUrl || '#', 
                    duration: '15:00',
                    videoStatus: v.videoStatus, 
                    videoProgress: v.videoProgress,
                    videoId: v.videoId, 
                    videoKey: v.videoKey, 
                    thumbnailUrl: (v as any).thumbnailUrl,
                    resources: v.resources
                }))
            }))
        };
        onSave(courseData as unknown as Course);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">{editItem ? 'Edit Course' : 'Create New Course'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                </div>
                
                <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/3">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Course Thumbnail</label>
                            <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-indigo-500 transition-colors group cursor-pointer">
                                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        setCourseThumbnailFile(e.target.files[0]);
                                        setCourseThumbnailPreview(URL.createObjectURL(e.target.files[0]));
                                    }
                                }} />
                                {courseThumbnailPreview ? (
                                    <img src={courseThumbnailPreview} alt="Course Cover" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-sm font-medium text-gray-500">Upload Image</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="bg-white text-gray-900 px-3 py-1 rounded-md text-sm font-bold shadow">Change</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 space-y-6">
                            <div>
                                <label className={LABEL_CLASS}>Title</label>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} />
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>Description</label>
                                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={INPUT_CLASS}></textarea>
                            </div>
                        </div>
                    </div>
                    <SubjectSelector {...subjectSelection} inputClass={INPUT_CLASS} labelClass={LABEL_CLASS} />
                    <div className="p-6 border border-gray-200 rounded-xl bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-4">
                            <input type="checkbox" checked={discountMode} onChange={(e) => setDiscountMode(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300" />
                            <label className="text-sm font-bold text-gray-700">Discount Mode</label>
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>Price (₹)</label>
                            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT_CLASS} />
                        </div>
                        {discountMode && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                <label className={LABEL_CLASS}>Original Price (₹) <span className="text-gray-400 font-normal normal-case">(Strike-through price)</span></label>
                                <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="e.g. 999" className={INPUT_CLASS} />
                            </div>
                        )}
                    </div>
                    <div className="p-5 border border-indigo-100 bg-indigo-50/50 rounded-xl space-y-3">
                        <div>
                            <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                Student Access Expiry / Validity
                            </h4>
                            <p className="text-xs text-indigo-700/80 mt-0.5">
                                Set when student access expires after enrolling. Default is 6 months.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                <input 
                                    type="radio" 
                                    name="courseValidityType" 
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
                                    name="courseValidityType" 
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
                                <span className="text-xs text-gray-600 font-medium">Month(s) access from purchase/enrollment date (Default: 6 months). After this, student access is revoked.</span>
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
                                <p className="text-xs text-purple-600 mt-0.5">Allow students from a specific college email domain to access this course for free.</p>
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
                                    <span>Students logging in with emails ending in this domain will bypass payment and enroll for free.</span>
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
                                <span>Standard mode: All students must purchase this course.</span>
                                {editItem?.collegeConfig && (
                                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        College free access will be removed upon saving
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-gray-800">Content</h3>
                             <button onClick={addModule} className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-slate-700 transition">Add Module</button>
                        </div>
                        <div className="space-y-4">
                            {modules.map((module, index) => (
                                <div key={module.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-4">
                                     <div className="flex items-center gap-4">
                                         <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-500 text-xs shrink-0">{index + 1}</div>
                                         <div className="flex-grow space-y-2">
                                             <input type="text" placeholder="Module Title" value={module.title} onChange={(e) => updateModule(module.id, e.target.value)} className="w-full border-b border-gray-200 focus:border-indigo-500 outline-none py-1 text-sm font-medium bg-transparent" />
                                         </div>
                                         <button onClick={() => addVideo(module.id)} className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded hover:bg-indigo-200 transition">Add Video</button>
                                         <button onClick={() => removeModule(module.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition">
                                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                         </button>
                                     </div>
                                     {module.videos && module.videos.length > 0 && (
                                     <div className="ml-12 space-y-3">
                                         {module.videos.map((video, vIndex) => (
                                             <div key={video.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50 flex flex-col gap-3">
                                                 <div className="flex items-center gap-3">
                                                     <div className="flex-grow">
                                                         <input type="text" placeholder={`Video ${vIndex + 1} Title`} value={video.title} onChange={(e) => updateVideoTitle(module.id, video.id, e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:border-indigo-500 outline-none bg-white" />
                                                     </div>
                                                     <div className="flex items-center gap-2 text-xs shrink-0">
                                                         <input type="file" accept="video/mp4,video/webm,video/ogg" id={`video-file-${video.id}`} className="hidden" onChange={(e) => handleFileSelect(module.id, video.id, e.target.files?.[0] || null)} />
                                                         <label htmlFor={`video-file-${video.id}`} className="text-indigo-600 hover:underline font-medium cursor-pointer">
                                                             {video.fileName ? 'Change Video' : 'Upload Video'}
                                                         </label>
                                                         <span className="text-gray-300">|</span>
                                                         <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp,.epub,.odt,.odp,.ods" id={`resource-file-${video.id}`} className="hidden" onChange={(e) => handleResourceSelect(module.id, video.id, e.target.files?.[0] || null)} />
                                                         <label htmlFor={`resource-file-${video.id}`} className="text-purple-600 hover:underline font-medium cursor-pointer">
                                                             {video.resourceFileName ? 'Change Resource' : 'Add Resource'}
                                                         </label>
                                                         <span className="text-gray-300">|</span>
                                                         <input type="file" accept="image/*" id={`thumbnail-file-${video.id}`} className="hidden" onChange={(e) => handleThumbnailSelect(module.id, video.id, e.target.files?.[0] || null)} />
                                                         <label htmlFor={`thumbnail-file-${video.id}`} className="text-emerald-600 hover:underline font-medium cursor-pointer">
                                                             {(video as any).thumbnailUrl ? 'Change Thumbnail' : 'Add Thumbnail'}
                                                         </label>
                                                         <button onClick={() => removeVideo(module.id, video.id)} className="text-red-500 hover:text-red-700 ml-2">
                                                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                         </button>
                                                     </div>
                                                 </div>
                                                 {(video as any).thumbnailUrl && (
                                                     <div className="mt-2">
                                                         <img src={(video as any).thumbnailUrl} alt="Thumbnail" className="h-16 aspect-video object-contain rounded shadow-sm border border-gray-200" />
                                                     </div>
                                                 )}
                                                 {video.fileName && <div className="text-xs text-gray-500">Video: {video.fileName}</div>}
                                                 {video.resourceFileName && <div className="text-xs text-gray-500">Resource: {video.resourceFileName}</div>}
                                                 {video.videoStatus && video.videoStatus !== 'ready' && (
                                                     <div className="bg-white rounded-lg p-2 border border-gray-100">
                                                         <div className="flex justify-between items-center mb-1">
                                                             <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                                                 {video.videoStatus === 'uploading' && <Loader2 className="w-3 h-3 animate-spin" />}
                                                                 {video.videoStatus === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                                                                 {video.videoStatus === 'finalizing' && <Loader2 className="w-3 h-3 animate-spin text-purple-600" />}
                                                                 {video.videoStatus === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                                                                 {video.videoStatus === 'uploading' && 'Uploading Video...'}
                                                                 {video.videoStatus === 'processing' && 'Processing (Transcoding)...'}
                                                                 {video.videoStatus === 'finalizing' && 'Finalizing...'}
                                                                 {video.videoStatus === 'error' && 'Processing Failed'}
                                                             </span>
                                                             {video.videoStatus === 'error' && video.videoKey ? (
                                                                 <button onClick={() => handleRetryProcessing(module.id, video.id)} className="text-xs font-bold text-indigo-600 hover:underline">Retry Processing</button>
                                                             ) : (
                                                                 <span className="text-xs font-bold text-slate-900">{video.videoProgress}%</span>
                                                             )}
                                                         </div>
                                                         <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                             <div className={`h-full transition-all duration-300 ${video.videoStatus === 'uploading' ? 'bg-blue-500' : video.videoStatus === 'processing' ? 'bg-indigo-500' : video.videoStatus === 'finalizing' ? 'bg-purple-500' : 'bg-red-500'}`} style={{ width: `${video.videoProgress}%` }}></div>
                                                         </div>
                                                     </div>
                                                 )}
                                                 {video.videoStatus === 'ready' && video.fileName && (
                                                     <div className="flex items-center gap-2 text-xs text-green-600 font-bold">
                                                         <CheckCircle className="w-4 h-4" /> Video Ready for Streaming
                                                     </div>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                     )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50 rounded-b-2xl">
                    <div className="text-sm font-bold text-amber-600 flex-1 flex items-center">
                        {modules.some(m => m.videos.some(v => v.videoStatus === 'processing' || v.videoStatus === 'uploading')) && 
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                {modules.some(m => m.videos.some(v => v.videoStatus === 'uploading')) 
                                    ? "Wait for upload to finish..."
                                    : "Auto-save is active. You can click Save Course and safely leave!"}
                            </>
                        }
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
                        <button onClick={handleSave} disabled={modules.some(m => m.videos.some(v => v.videoStatus === 'uploading'))}
                            className="px-6 py-2.5 font-bold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg shadow-lg shadow-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed">
                            Save Course
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCourseModal;
