/**
 * Local filesystem storage provider.
 * Provides uploadFile and deleteFile implementations.
 */
const fs = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

const baseDir = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'storage', 'uploads');

function ensureDirSync(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

async function uploadFile({ buffer, originalName, mimeType }) {
	ensureDirSync(baseDir);
	const safeName = String(originalName || 'file').replace(/[^\w.\-]+/g, '_');
	const id = uuid();
	const filename = `${id}_${safeName}`;
	const absPath = path.join(baseDir, filename);
	await fs.promises.writeFile(absPath, buffer);
	const stats = await fs.promises.stat(absPath);
	// For local provider, expose a file path URL
	const url = `file://${absPath}`;
	return { url, name: filename, size: stats.size, mimeType: mimeType || 'application/octet-stream' };
}

async function deleteFile(url) {
	if (!url) return false;
	// Expect file:// absolute path
	if (!url.startsWith('file://')) return false;
	const absPath = url.replace('file://', '');
	try {
		await fs.promises.unlink(absPath);
		return true;
	} catch (_e) {
		// file may already be missing
		return false;
	}
}

module.exports = { uploadFile, deleteFile };


