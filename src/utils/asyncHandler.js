/**
 * Wrap async route handlers to forward errors to Express.
 */
function asyncHandler(fn) {
	return function wrapped(req, res, next) {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}

module.exports = asyncHandler;


