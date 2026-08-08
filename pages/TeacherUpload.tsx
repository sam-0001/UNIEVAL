import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserRole, NoteSection, NoteFile, CourseModule, CourseResource } from '../types';
import { Upload, FileText, X, CheckCircle, Loader2, Plus, AlertCircle } from 'lucide-react';
import { SubjectSelector } from '../components/SubjectSelector';
import { useSubjectSelection } from '../hooks/useSubjectSelection';
import CouponManager from '../components/CouponManager';

interface UploadResponse {
    url: string;
    message?: string;
    filename?: string;
    entryName?: string;
}

interface VideoJob {
    status: 'processing' | 'finalizing' | 'ready' | 'error';
    progress: number;
    error?: string;
}

const TeacherUpload: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'course' | 'note'>('course');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Track published product IDs so teachers can manage coupons right after publishing
  const [publishedCourseId, setPublishedCourseId] = useState<string | null>(null);
  const [publishedNoteId, setPublishedNoteId] = useState<string | null>(null);
  const [showCourseCoupons, setShowCourseCoupons] = useState(false);
  const [showNoteCoupons, setShowNoteCoupons] = useState(false);

  // Course Form State
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const courseSubjectSelection = useSubjectSelection();

  // Thumbnail State
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  
  // Upload States
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  
  // Polling for video status
  useEffect(() => {
      const interval = setInterval(async () => {
          let hasUpdates = false;
          const updatedModules = [...courseModules];

          for (let mIdx = 0; mIdx < updatedModules.length; mIdx++) {
              const mod = updatedModules[mIdx];
              const updatedVideos = [...mod.videos];
              let modHasUpdates = false;

              for (let vIdx = 0; vIdx < updatedVideos.length; vIdx++) {
                  const video = updatedVideos[vIdx];
                  if (video.videoStatus === 'processing' || video.videoStatus === 'finalizing') {
                      if (!video.videoId) continue;
                      try {
                          const res = await fetch(`/api/video/status?videoId=${video.videoId}`);
                          if (res.ok) {
                              const job: VideoJob = await res.json();
                              if (video.videoStatus !== job.status || video.videoProgress !== job.progress) {
                                  updatedVideos[vIdx] = {
                                      ...video,
                                      videoStatus: job.status,
                                      videoProgress: job.progress,
                                      videoUrl: job.status === 'ready' ? video.videoUrl : video.videoUrl
                                  };
                                  modHasUpdates = true;
                                  hasUpdates = true;
                              }
                          }
                      } catch (e) {
                          console.error('Error polling status:', e);
                      }
                  }
              }

              if (modHasUpdates) {
                  updatedModules[mIdx] = { ...mod, videos: updatedVideos };
              }
          }

          if (hasUpdates) {
              setCourseModules(updatedModules);
          }
      }, 2000);

      return () => clearInterval(interval);
  }, [courseModules]);

  // Note Form State
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDesc, setNoteDesc] = useState('');
  const [notePrice, setNotePrice] = useState(0);
  const noteSubjectSelection = useSubjectSelection();
  const [sections, setSections] = useState<NoteSection[]>(() => [
      { id: Date.now().toString(), title: 'All Units Notes', files: [] }
  ]);

  // Note Thumbnail State
  const [noteThumbnailFile, setNoteThumbnailFile] = useState<File | null>(null);
  const [noteThumbnailPreview, setNoteThumbnailPreview] = useState<string>('');
  const [noteThumbnailUrl, setNoteThumbnailUrl] = useState<string>('');
  const [noteThumbnailUploading, setNoteThumbnailUploading] = useState(false);

  if (!user || user.role !== UserRole.TEACHER) {
    return <div className="p-8">Access Denied. Teachers only.</div>;
  }

  const uploadFileWithProgress = (url: string, file: File, fieldName: string, progressKey: string): Promise<UploadResponse> => {
      return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', url);

          xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                  const percentComplete = Math.round((event.loaded / event.total) * 100);
                  setUploadProgress(prev => ({ ...prev, [progressKey]: percentComplete }));
              }
          };

          xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                  setUploadProgress(prev => {
                      const newProgress = { ...prev };
                      delete newProgress[progressKey];
                      return newProgress;
                  });
                  resolve(JSON.parse(xhr.responseText) as UploadResponse);
              } else {
                  reject(new Error('Upload failed'));
              }
          };

          xhr.onerror = () => {
              setUploadProgress(prev => {
                  const newProgress = { ...prev };
                  delete newProgress[progressKey];
                  return newProgress;
              });
              reject(new Error('Upload failed'));
          };

          const formData = new FormData();
          formData.append(fieldName, file);
          xhr.send(formData);
      });
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setThumbnailUrl(''); // reset uploaded URL until we actually upload
    }
  };

  const handleNoteThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNoteThumbnailFile(file);
      setNoteThumbnailPreview(URL.createObjectURL(file));
      setNoteThumbnailUrl('');
    }
  };

  const uploadThumbnail = async (file: File): Promise<string> => {
    setThumbnailUploading(true);
    try {
      const presignRes = await fetch('/api/upload/r2-presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, isVideo: false })
      });
      if (!presignRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await presignRes.json();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed')));
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      setThumbnailUrl(publicUrl);
      return publicUrl;
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleVideoUpload = async (moduleId: string | null, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const progressKey = `video-${Date.now()}`;
    setIsUploading(true);
    setMessage('Getting upload URL...');

    try {
        // 1. Get Presigned URL
        const presignRes = await fetch('/api/upload/r2-presigned-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, fileType: file.type })
        });
        
        if (!presignRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, publicUrl, key } = await presignRes.json();

        // 2. Upload directly to R2
        setMessage('Uploading video to cloud...');
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(prev => ({ ...prev, [progressKey]: percentComplete }));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setUploadProgress(prev => {
                        const newProgress = { ...prev };
                        delete newProgress[progressKey];
                        return newProgress;
                    });
                    resolve(true);
                } else reject(new Error('Upload failed'));
            };

            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.send(file);
        });

        // 3. Trigger Processing
        setMessage('Processing video...');
        const processRes = await fetch('/api/process-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: publicUrl, videoKey: key })
        });

        if (!processRes.ok) throw new Error('Failed to start processing');
        const processData = await processRes.json();
        
        const newVideo = {
            id: Date.now().toString(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            videoUrl: processData.url, // This is the HLS playlist URL
            duration: "10:00", // Placeholder
            resources: [],
            videoStatus: 'processing' as const,
            videoProgress: 0,
            videoId: processData.videoId,
            videoKey: key
        };

        if (moduleId) {
            setCourseModules(courseModules.map(mod => {
                if (mod.id === moduleId) {
                    return {
                        ...mod,
                        videos: [...mod.videos, newVideo]
                    };
                }
                return mod;
            }));
        } else {
            const newModule: CourseModule = {
                id: Date.now().toString(),
                title: `Module ${courseModules.length + 1}`,
                videos: [newVideo]
            };
            setCourseModules([...courseModules, newModule]);
        }
        setMessage(`Video uploaded! Processing started.`);
    } catch (error) {
        console.error('Error uploading video:', error);
        setMessage('Failed to upload video.');
    } finally {
        setIsUploading(false);
    }
  };

  const handleResourceUpload = async (moduleId: string, videoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const progressKey = `resource-${moduleId}-${videoId}-${Date.now()}`;
      
      try {
          // Reusing the generic file upload endpoint for resources
          const data = await uploadFileWithProgress('/api/upload/file', file, 'file', progressKey);
          
          const newResource: CourseResource = {
              title: file.name,
              url: data.url,
              type: file.type.includes('pdf') ? 'pdf' : 'link'
          };

          setCourseModules(courseModules.map(mod => {
              if (mod.id === moduleId) {
                  return {
                      ...mod,
                      videos: mod.videos.map(v => {
                          if (v.id === videoId) {
                              return {
                                  ...v,
                                  resources: [...(v.resources || []), newResource]
                              };
                          }
                          return v;
                      })
                  };
              }
              return mod;
          }));
      } catch (error) {
          console.error('Error uploading resource:', error);
          alert('Failed to upload resource');
      }
  };

  const removeResource = (moduleId: string, videoId: string, resourceIndex: number) => {
      setCourseModules(courseModules.map(mod => {
          if (mod.id === moduleId) {
              return {
                  ...mod,
                  videos: mod.videos.map(v => {
                      if (v.id === videoId) {
                          const newResources = [...(v.resources || [])];
                          newResources.splice(resourceIndex, 1);
                          return { ...v, resources: newResources };
                      }
                      return v;
                  })
              };
          }
          return mod;
      }));
  };

  const handleCourseUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalSubjectId = await courseSubjectSelection.getSubjectForSave();

      let finalThumbnailUrl = thumbnailUrl;
      if (thumbnailFile && !thumbnailUrl) {
        finalThumbnailUrl = await uploadThumbnail(thumbnailFile);
      }
      if (!finalThumbnailUrl) {
        finalThumbnailUrl = 'https://picsum.photos/800/600';
      }

      const course = await api.createCourse({
        title: courseTitle,
        description: courseDesc,
        subjectId: finalSubjectId,
        teacherId: user.id,
        thumbnailUrl: finalThumbnailUrl,
        modules: courseModules,
        price: 499
      });
      setPublishedCourseId(course.id);
      setShowCourseCoupons(false);
      setMessage('Course created successfully with uploaded videos.');
      setCourseTitle('');
      setCourseDesc('');
      setCourseModules([]);
      setThumbnailFile(null);
      setThumbnailPreview('');
      setThumbnailUrl('');
    } catch (err) {
      setMessage('Failed to create course.');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalThumbnailUrl = noteThumbnailUrl;
      if (noteThumbnailFile && !noteThumbnailUrl) {
        setNoteThumbnailUploading(true);
        finalThumbnailUrl = await uploadThumbnail(noteThumbnailFile);
        setNoteThumbnailUploading(false);
      }
      if (!finalThumbnailUrl) {
        finalThumbnailUrl = 'https://picsum.photos/800/600';
      }

      const finalSubjectId = await noteSubjectSelection.getSubjectForSave();
      const note = await api.createNote({
        title: noteTitle,
        description: noteDesc,
        subjectId: finalSubjectId,
        teacherId: user.id,
        price: notePrice,
        thumbnailUrl: finalThumbnailUrl,
        sections: sections
      });
      setPublishedNoteId(note.id);
      setShowNoteCoupons(false);
      setLoading(false);
      setMessage('Notes package created successfully with all sections.');
      
      // Clear forms
      setNoteTitle('');
      setNoteDesc('');
      setNoteThumbnailFile(null);
      setNoteThumbnailPreview('');
      setNoteThumbnailUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to publish note');
      setLoading(false);
    }
  };

  // Section Management Helper
  const addSection = () => {
      setSections([...sections, { id: Date.now().toString(), title: 'New Section', files: [] }]);
  };

  const updateSectionTitle = (id: string, newTitle: string) => {
      setSections(sections.map(s => s.id === id ? { ...s, title: newTitle } : s));
  };

  const removeSection = (id: string) => {
      setSections(sections.filter(s => s.id !== id));
  };

  const updateFile = (sectionId: string, fileId: string, field: keyof NoteFile, value: string | boolean) => {
      setSections(sections.map(s => {
          if (s.id !== sectionId) return s;
          return {
              ...s,
              files: s.files.map(f => f.id === fileId ? { ...f, [field]: value } : f)
          };
      }));
  };

  const handleNoteFileUpload = async (sectionId: string, file: File, inputEl?: HTMLInputElement) => {
      const progressKey = `note-${sectionId}-${Date.now()}`;
      setMessage(`Uploading ${file.name}...`);

      // A .zip is an HTML note bundled with its own assets (e.g. an img/ folder) —
      // route it to the bundle endpoint, which extracts, encrypts, and stores each
      // file individually and links them together server-side.
      const isBundle = file.name.toLowerCase().endsWith('.zip');
      const endpoint = isBundle ? '/api/upload/html-bundle' : '/api/upload/file';

      try {
          const data = await uploadFileWithProgress(endpoint, file, 'file', progressKey);

          const newFile: NoteFile = {
              id: Date.now().toString(),
              // For bundles, title with the HTML entry's filename (e.g. "unit1.html")
              // so the viewer picks the right renderer — not the .zip filename.
              title: isBundle ? (data.entryName || file.name) : file.name,
              url: data.url,
              isFree: false
          };

          // Use functional updater to avoid stale closure causing duplicate entries
          setSections(prev => prev.map(s => 
              s.id === sectionId ? { ...s, files: [...s.files, newFile] } : s
          ));
          // Reset input so the same file can be re-selected and to prevent double-fire
          if (inputEl) inputEl.value = '';
          setMessage(`File ${file.name} uploaded successfully!`);
      } catch (error) {
          console.error('Error uploading file:', error);
          setMessage('Failed to upload file.');
      }
  };

  // Check if all videos are ready
  const allVideosReady = courseModules.length > 0 && courseModules.every(m => m.videos.every(v => v.videoStatus === 'ready'));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Instructor Studio</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => { setActiveTab('course'); setMessage(''); }}
              className={`${activeTab === 'course' ? 'border-brand-cobalt text-brand-cobalt' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors`}
            >
              Upload Video Course
            </button>
            <button
               onClick={() => { setActiveTab('note'); setMessage(''); }}
               className={`${activeTab === 'note' ? 'border-brand-cobalt text-brand-cobalt' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors`}
            >
               Upload Notes Package
            </button>
          </nav>
        </div>

        <div className="p-6">
          {message && (
            <div className={`mb-6 p-4 border-l-4 ${message.includes('Failed') ? 'bg-red-50 border-red-400 text-red-700' : 'bg-green-50 border-green-400 text-green-700'}`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          {/* Global Progress Bars */}
          {Object.keys(uploadProgress).length > 0 && (
              <div className="mb-6 space-y-2">
                  {Object.entries(uploadProgress).map(([key, percent]) => (
                      <div key={key} className="bg-gray-100 rounded-full overflow-hidden h-4 relative">
                          <div 
                              className="bg-brand-cobalt h-full transition-all duration-300" 
                              style={{ width: `${percent}%` }}
                          ></div>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                              {key.includes('video') ? 'Uploading Video' : 'Uploading File'}: {percent}%
                          </span>
                      </div>
                  ))}
              </div>
          )}

          {activeTab === 'course' ? (
            <form className="space-y-6" onSubmit={handleCourseUpload}>
              <div className="grid grid-cols-1 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Course Title</label>
                    <input type="text" required value={courseTitle} onChange={e => setCourseTitle(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-cobalt focus:border-brand-cobalt sm:text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea rows={3} required value={courseDesc} onChange={e => setCourseDesc(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-cobalt focus:border-brand-cobalt sm:text-sm" />
                </div>
                
                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course Thumbnail</label>
                  {thumbnailPreview ? (
                    <div className="relative w-full max-w-xs aspect-video">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="absolute inset-0 w-full h-full object-cover rounded-lg border border-gray-300 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => { setThumbnailFile(null); setThumbnailPreview(''); setThumbnailUrl(''); }}
                        className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-500 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {thumbnailUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
                          <Loader2 className="w-6 h-6 text-brand-cobalt animate-spin" />
                          <span className="ml-2 text-sm text-brand-cobalt">Uploading...</span>
                        </div>
                      )}
                      {thumbnailUrl && (
                        <div className="absolute bottom-1 right-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Uploaded
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full max-w-xs h-32 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-brand-cobalt cursor-pointer transition-colors">
                      <Upload className="w-7 h-7 text-brand-cobalt mb-1" />
                      <span className="text-sm text-brand-cobalt font-medium">Click to upload thumbnail</span>
                      <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP (max 5MB)</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleThumbnailSelect}
                      />
                    </label>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <SubjectSelector 
                        {...courseSubjectSelection} 
                        inputClass="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-cobalt focus:border-brand-cobalt sm:text-sm" 
                        labelClass="block text-sm font-medium text-gray-700" 
                    />
                </div>
              </div>

              {/* Video Upload Section */}
              <div className="border-2 border-slate-300 border-dashed rounded-lg p-6 flex justify-center bg-slate-50 hover:bg-blue-50 hover:border-brand-cobalt transition-colors">
                 <div className="space-y-1 text-center">
                   {isUploading ? (
                       <div className="flex flex-col items-center">
                           <Loader2 className="w-8 h-8 text-brand-cobalt animate-spin mb-2" />
                           <p className="text-sm text-brand-cobalt font-medium">Uploading to cloud...</p>
                       </div>
                   ) : (
                       <>
                           <Upload className="mx-auto h-12 w-12 text-brand-cobalt" />
                           <div className="flex text-sm text-gray-600 justify-center">
                             <label className="relative cursor-pointer bg-transparent rounded-md font-medium text-brand-cobalt hover:text-brand-indigo focus-within:outline-none">
                               <span>Upload videos</span>
                               <input type="file" className="sr-only" accept="video/*" onChange={(e) => handleVideoUpload(null, e)} />
                             </label>
                           </div>
                           <p className="text-xs text-gray-500">MP4, MOV up to 2GB</p>
                       </>
                   )}
                 </div>
              </div>

              {/* Module List */}
              {courseModules.length > 0 && (
                  <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Uploaded Modules</h4>
                      {courseModules.map((mod, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                      <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-brand-cobalt rounded-lg text-xs font-bold">{idx + 1}</span>
                                      <input 
                                          type="text" 
                                          value={mod.title} 
                                          onChange={(e) => {
                                              const newModules = [...courseModules];
                                              newModules[idx].title = e.target.value;
                                              setCourseModules(newModules);
                                          }}
                                          className="text-sm font-medium text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-cobalt focus:outline-none"
                                      />
                                  </div>
                                  <label className="text-xs bg-blue-50 border border-blue-200 text-brand-cobalt font-medium px-2 py-1 rounded-lg hover:bg-blue-100 cursor-pointer flex items-center gap-1 transition-colors">
                                      <Plus className="w-3 h-3" /> Add Video
                                      <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="video/*"
                                          onChange={(e) => handleVideoUpload(mod.id, e)} 
                                      />
                                  </label>
                              </div>
                              
                              <div className="space-y-4 pl-9">
                                  {mod.videos.map((video, vIdx) => (
                                      <div key={vIdx} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-brand-cobalt/30 transition-colors">
                                          <div className="flex items-center justify-between mb-2">
                                              <input 
                                                  type="text" 
                                                  value={video.title} 
                                                  onChange={(e) => {
                                                      const newModules = [...courseModules];
                                                      newModules[idx].videos[vIdx].title = e.target.value;
                                                      setCourseModules(newModules);
                                                  }}
                                                  className="text-sm font-medium text-gray-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-cobalt focus:outline-none flex-1 mr-4"
                                              />
                                              {/* Status Badge */}
                                              <div className="flex items-center gap-2">
                                                  {video.videoStatus === 'ready' ? (
                                                      <span className="text-xs text-emerald-600 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1 font-medium">
                                                          <CheckCircle className="w-3 h-3" /> Ready
                                                      </span>
                                                  ) : video.videoStatus === 'processing' ? (
                                                      <div className="flex items-center gap-2">
                                                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                              <div className="h-full bg-brand-cobalt transition-all duration-500" style={{ width: `${video.videoProgress || 0}%` }}></div>
                                                          </div>
                                                          <span className="text-xs text-brand-cobalt font-bold">{video.videoProgress}%</span>
                                                      </div>
                                                  ) : video.videoStatus === 'finalizing' ? (
                                                      <span className="text-xs text-brand-indigo bg-purple-50 border border-purple-200 px-2 py-1 rounded-lg flex items-center gap-1 font-medium">
                                                          <Loader2 className="w-3 h-3 animate-spin" /> Finalizing...
                                                      </span>
                                                  ) : video.videoStatus === 'error' ? (
                                                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                          <AlertCircle className="w-3 h-3" /> Error
                                                      </span>
                                                  ) : (
                                                      <span className="text-xs text-gray-500">Waiting...</span>
                                                  )}
                                              </div>
                                          </div>
                                          
                                          {/* Resources Section */}
                                          <div className="pl-4 border-l-2 border-gray-100 mt-2">
                                              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Resources</div>
                                              <div className="space-y-2 mb-2">
                                                  {video.resources?.map((res, rIdx) => (
                                                      <div key={rIdx} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100 text-sm">
                                                          <div className="flex items-center gap-2">
                                                              <FileText className="w-4 h-4 text-gray-400" />
                                                              <span className="truncate max-w-[200px]">{res.title}</span>
                                                          </div>
                                                          <button 
                                                              type="button" 
                                                              onClick={() => removeResource(mod.id, video.id, rIdx)}
                                                              className="text-gray-400 hover:text-red-500"
                                                          >
                                                              <X className="w-4 h-4" />
                                                          </button>
                                                      </div>
                                                  ))}
                                              </div>
                                              
                                              <label className="inline-flex items-center gap-1 text-xs text-brand-cobalt hover:text-brand-indigo cursor-pointer font-bold transition-colors">
                                                  <Plus className="w-3 h-3" /> Add Resource (PDF/Link)
                                                  <input 
                                                      type="file" 
                                                      className="hidden" 
                                                      onChange={(e) => handleResourceUpload(mod.id, video.id, e)} 
                                                  />
                                              </label>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              <button 
                type="submit" 
                disabled={loading || isUploading || thumbnailUploading || !allVideosReady} 
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-gradient-main hover:opacity-90 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Publishing...' : thumbnailUploading ? 'Uploading thumbnail...' : (!allVideosReady && courseModules.length > 0 ? 'Waiting for videos...' : 'Publish Course')}
              </button>

              {/* Coupon Manager — shown after course is published */}
              {publishedCourseId && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowCourseCoupons(v => !v)}
                    className="flex items-center gap-2 text-sm font-semibold text-brand-cobalt hover:text-brand-indigo border border-brand-cobalt/30 hover:border-brand-cobalt px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {showCourseCoupons ? 'Hide Coupon Manager' : 'Manage Coupons for This Course'}
                  </button>
                  {showCourseCoupons && (
                    <div className="mt-3">
                      <CouponManager productId={publishedCourseId} productType="course" />
                    </div>
                  )}
                </div>
              )}
            </form>
          ) : (
            <form className="space-y-8" onSubmit={handleNoteUpload}>
                {/* Basic Info */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Package Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Package Title</label>
                            <input type="text" placeholder="e.g. BEE Exam Notes" required value={noteTitle} onChange={e => setNoteTitle(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-cobalt focus:border-brand-cobalt sm:text-sm" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                            <input type="number" placeholder="0 for Free" value={notePrice} onChange={e => setNotePrice(Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-cobalt focus:border-brand-cobalt sm:text-sm" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <input type="text" placeholder="Guaranteed passing..." value={noteDesc} onChange={e => setNoteDesc(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-brand-cobalt focus:border-brand-cobalt sm:text-sm" />
                        </div>
                        
                        {/* Note Thumbnail Upload */}
                        <div className="md:col-span-2 mt-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Package Thumbnail</label>
                          {noteThumbnailPreview ? (
                            <div className="relative w-full max-w-xs aspect-video">
                              <img
                                src={noteThumbnailPreview}
                                alt="Thumbnail preview"
                                className="absolute inset-0 w-full h-full object-cover rounded-lg border border-gray-300 shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => { setNoteThumbnailFile(null); setNoteThumbnailPreview(''); setNoteThumbnailUrl(''); }}
                                className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-500 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              {noteThumbnailUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
                                  <Loader2 className="w-6 h-6 text-brand-cobalt animate-spin" />
                                  <span className="ml-2 text-sm text-brand-cobalt">Uploading...</span>
                                </div>
                              )}
                              {noteThumbnailUrl && (
                                <div className="absolute bottom-1 right-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Uploaded
                                </div>
                              )}
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full max-w-xs h-32 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-brand-cobalt cursor-pointer transition-colors">
                              <Upload className="w-7 h-7 text-brand-cobalt mb-1" />
                              <span className="text-sm text-brand-cobalt font-medium">Click to upload thumbnail</span>
                              <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP (max 5MB)</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                onChange={handleNoteThumbnailSelect}
                              />
                            </label>
                          )}
                        </div>
                        <div className="md:col-span-2 bg-white p-4 rounded-xl border border-gray-200 mt-2">
                            <SubjectSelector 
                                {...noteSubjectSelection} 
                                inputClass="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-brand-cobalt focus:border-brand-cobalt sm:text-sm" 
                                labelClass="block text-sm font-medium text-gray-700" 
                            />
                        </div>
                    </div>
                </div>

                {/* Sections Manager */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Content Sections</h3>
                        <button type="button" onClick={addSection} className="text-sm bg-blue-50 text-brand-cobalt border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                            + Add Section
                        </button>
                    </div>

                    {sections.map((section) => (
                        <div key={section.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                            <div className="flex justify-between items-center mb-4">
                                <input 
                                    type="text" 
                                    value={section.title} 
                                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                    className="font-semibold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-brand-cobalt focus:outline-none bg-transparent"
                                />
                                <div className="flex items-center gap-2">
                                     <label className="text-xs bg-blue-50 border border-blue-200 text-brand-cobalt font-medium px-2 py-1 rounded-lg hover:bg-blue-100 cursor-pointer flex items-center gap-1 transition-colors" title="PDF, HTML, or a .zip containing an HTML file + its img/ folder">
                                        <Upload className="w-3 h-3" />
                                        Upload File
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept=".pdf,.html,.htm,.zip" 
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    handleNoteFileUpload(section.id, e.target.files[0], e.target);
                                                }
                                            }}
                                        />
                                     </label>
                                     <button type="button" onClick={() => removeSection(section.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                {section.files.map((file) => {
                                    const fileExt = (file.title.split('.').pop() || 'FILE').toUpperCase();
                                    const badgeClass = ['HTML', 'HTM'].includes(fileExt)
                                        ? 'bg-amber-100 text-amber-600'
                                        : 'bg-red-100 text-red-600';
                                    return (
                                    <div key={file.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded text-sm">
                                        <div className={`p-1 rounded text-[10px] font-bold ${badgeClass}`}>{fileExt.substring(0, 4)}</div>
                                        <input 
                                            type="text" 
                                            value={file.title} 
                                            onChange={(e) => updateFile(section.id, file.id, 'title', e.target.value)}
                                            className="flex-grow bg-transparent border-none focus:ring-0 p-0 text-sm"
                                        />
                                        <label className="flex items-center gap-1 text-xs text-gray-500">
                                            <input 
                                                type="checkbox" 
                                                checked={file.isFree}
                                                onChange={(e) => updateFile(section.id, file.id, 'isFree', e.target.checked)}
                                                className="rounded text-brand-cobalt focus:ring-brand-cobalt"
                                            />
                                            Free Preview
                                        </label>
                                    </div>
                                    );
                                })}
                                {section.files.length === 0 && <p className="text-xs text-gray-400 italic">No files in this section yet.</p>}
                            </div>
                        </div>
                    ))}
                </div>

                <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-gradient-main hover:opacity-90 focus:outline-none transition-all">
                    {loading ? 'Creating Package...' : 'Publish Notes Package'}
                </button>

                {/* Coupon Manager — shown after notes package is published */}
                {publishedNoteId && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowNoteCoupons(v => !v)}
                      className="flex items-center gap-2 text-sm font-semibold text-brand-cobalt hover:text-brand-indigo border border-brand-cobalt/30 hover:border-brand-cobalt px-4 py-2 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {showNoteCoupons ? 'Hide Coupon Manager' : 'Manage Coupons for This Package'}
                    </button>
                    {showNoteCoupons && (
                      <div className="mt-3">
                        <CouponManager productId={publishedNoteId} productType="note" />
                      </div>
                    )}
                  </div>
                )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherUpload;