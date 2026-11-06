/**
 * server/services/assetCleanup.service.ts
 * Cascading asset deletion service for Courses, Notes, Videos, and Secure Bundles.
 */

import logger from '../logger.js';
import { VideoKey, FileKey } from '../models/index.js';
import { deleteFileFromR2, deleteDirectoryFromR2 } from './storage.service.js';
import { invalidateDecryptedCache } from './crypto.service.js';

export async function deleteVideoAssets(video: {
  id?: string;
  videoId?: string;
  videoKey?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  resources?: any[];
}): Promise<void> {
  try {
    let vidId = video.videoId;
    if (!vidId && video.videoUrl) {
      const match = video.videoUrl.match(/videos\/(vid-[a-zA-Z0-9_-]+)/);
      if (match) vidId = match[1];
    }

    if (vidId) {
      await deleteDirectoryFromR2(`videos/${vidId}`);
      await VideoKey.deleteOne({ videoId: vidId });
    }

    if (video.videoKey) {
      await deleteFileFromR2(video.videoKey);
    }

    if (video.videoUrl && !video.videoUrl.includes('.m3u8')) {
      await deleteFileFromR2(video.videoUrl);
    }

    if (video.thumbnailUrl) {
      await deleteFileFromR2(video.thumbnailUrl);
    }

    if (Array.isArray(video.resources)) {
      for (const resItem of video.resources) {
        if (resItem?.url) {
          await deleteFileFromR2(resItem.url);
        }
      }
    }
  } catch (err) {
    logger.error('[AssetCleanup] Error deleting video assets:', err);
  }
}

export async function deleteNoteFileAssets(urlOrId?: string, fileIdFallback?: string): Promise<void> {
  if (!urlOrId || urlOrId === '#') return;
  try {
    let fileId: string | null = null;
    const match = urlOrId.match(/\/api\/secure-file-raw\/([a-zA-Z0-9-]+)/);
    if (match) {
      fileId = match[1];
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(urlOrId)) {
      fileId = urlOrId;
    } else if (fileIdFallback && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileIdFallback)) {
      const exists = await FileKey.exists({ fileId: fileIdFallback });
      if (exists) fileId = fileIdFallback;
    }

    if (fileId) {
      invalidateDecryptedCache(fileId);
      const record = await FileKey.findOne({ fileId }).lean() as any;
      if (record) {
        if (record.bundleId) {
          const bundleRecords = await FileKey.find({ bundleId: record.bundleId }).lean() as any[];
          for (const bRecord of bundleRecords) {
            if (bRecord.storageKey) {
              await deleteFileFromR2(bRecord.storageKey);
            }
          }
          await FileKey.deleteMany({ bundleId: record.bundleId });
        } else {
          if (record.storageKey) {
            await deleteFileFromR2(record.storageKey);
          }
          await FileKey.deleteOne({ fileId });
        }
        return;
      }
    }

    await deleteFileFromR2(urlOrId);
  } catch (err) {
    logger.error('[AssetCleanup] Error deleting note file assets:', err);
  }
}

export async function deleteNoteAssets(note: {
  id?: string;
  thumbnailUrl?: string;
  sections?: any[];
}): Promise<void> {
  try {
    if (note.thumbnailUrl) {
      await deleteFileFromR2(note.thumbnailUrl);
    }
    if (Array.isArray(note.sections)) {
      for (const section of note.sections) {
        if (Array.isArray(section.files)) {
          for (const file of section.files) {
            await deleteNoteFileAssets(file.url, file.id);
          }
        }
      }
    }
  } catch (err) {
    logger.error('[AssetCleanup] Error deleting note assets:', err);
  }
}

export async function deleteCourseAssets(course: any): Promise<void> {
  try {
    if (course.thumbnailUrl) {
      await deleteFileFromR2(course.thumbnailUrl);
    }
    if (Array.isArray(course.modules)) {
      for (const mod of course.modules) {
        if (mod.videoUrl) await deleteFileFromR2(mod.videoUrl);
        if (mod.videoKey) await deleteFileFromR2(mod.videoKey);
        if (Array.isArray(mod.resources)) {
          for (const r of mod.resources) {
            if (r?.url) await deleteFileFromR2(r.url);
          }
        }
        if (Array.isArray(mod.videos)) {
          for (const vid of mod.videos) {
            await deleteVideoAssets(vid);
          }
        }
      }
    }
  } catch (err) {
    logger.error('[AssetCleanup] Error deleting course assets:', err);
  }
}
