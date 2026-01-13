/* eslint-disable */
/**
 * Shared file upload handler for hikes (covers files).
 * Handles both storage adapter (Firebase) and local filesystem fallback.
 */

const fs = require('fs');
const path = require('path');

/**
 * Save a file buffer to local filesystem within the hikes module.
 * Creates directories as needed. Returns a web-accessible path.
 * @param {string} folder - Subdirectory under hikes module uploads (e.g., 'covers')
 * @param {string} filename - Target filename
 * @param {Buffer} buffer - File contents
 * @returns {string} Web-accessible path (e.g., '/hikes/covers/1234-file.jpg')
 */
function saveLocal(folder, filename, buffer) {
  const uploadsRoot = path.join(__dirname, '../uploads');
  const destDir = path.join(uploadsRoot, folder);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, filename);
  fs.writeFileSync(destPath, buffer);
  return `/hikes/${folder}/${filename}`;
}

/**
 * Upload a single file.
 * Attempts to use the storage adapter (Firebase); falls back to local save.
 * @param {Object} params
 * @param {Object} params.file - Multer file object { originalname, buffer, mimetype }
 * @param {string} params.folder - Target folder ('covers')
 * @param {Object} params.storageAdapter - Firebase storage adapter (or null)
 * @returns {Promise<string>} URL of uploaded file
 */
async function uploadFile({ file, folder, storageAdapter }) {
  if (!file) return null;

  const key = `${folder}/${Date.now()}-${file.originalname}`;
  let uploaded = null;

  // Try storage adapter first (Firebase)
  if (storageAdapter?.uploadObject) {
    try {
      uploaded = await storageAdapter.uploadObject(key, file.buffer, file.mimetype);
    } catch (e) {
      console.warn(`[uploadFile] Storage adapter failed for ${folder}, falling back to local:`, e.message || e);
    }
  }

  // Use adapter URL if successful, else fall back to local save
  if (uploaded?.url) {
    return uploaded.url;
  }

  const fname = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  return saveLocal(folder, fname, file.buffer);
}

/**
 * Process file uploads (cover image) in a hike request.
 * Populates data object with coverUrl.
 * @param {Object} params
 * @param {Object} params.files - Multer files object { cover: []}
 * @param {Object} params.data - Hike data object to populate
 * @param {Object} params.storageAdapter - Firebase storage adapter (or null)
 * @returns {Promise<void>}
 */
async function handleFileUploads({ files, data, storageAdapter }) {
  if (!files) return;

  // Handle cover image
  const coverArr = files['cover'];
  if (coverArr?.length > 0) {
    // Delete old cover if it exists in storage adapter
    if (data.oldCoverUrl && storageAdapter?.deleteObject) {
      try {
        // Extract key from URL (for Spaces: https://bucket.region.digitaloceanspaces.com/covers/filename.jpg)
        const urlParts = data.oldCoverUrl.split('/');
        const keyIndex = urlParts.findIndex(part => part === 'covers');
        if (keyIndex !== -1 && urlParts[keyIndex + 1]) {
          const key = `covers/${urlParts[keyIndex + 1]}`;
          console.log(`[handleFileUploads] Deleting old cover: ${key}`);
          await storageAdapter.deleteObject(key);
        }
      } catch (deleteErr) {
        console.warn('[handleFileUploads] Failed to delete old cover:', deleteErr.message);
        // Continue with upload even if delete fails
      }
    }
    
    data.coverUrl = await uploadFile({
      file: coverArr[0],
      folder: 'covers',
      storageAdapter,
    });
    
    // Remove the temporary oldCoverUrl from data
    delete data.oldCoverUrl;
  }

}

module.exports = {
  saveLocal,
  uploadFile,
  handleFileUploads,
};
