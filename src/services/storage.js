/**
 * Storage service interface.
 * Swap providers by setting STORAGE_PROVIDER env (local|s3).
 * S3 can be implemented by creating ./storage/s3.js that exports same API.
 */
const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
// eslint-disable-next-line import/no-dynamic-require, global-require
const impl = require(`./storage/${provider}.js`);

module.exports = {
	uploadFile: impl.uploadFile,
	deleteFile: impl.deleteFile,
};


