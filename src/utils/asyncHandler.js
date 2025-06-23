/**
 * Wrapper for async route handlers to catch errors and pass them to the error middleware
 * @param {Function} fn - The async route handler function
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
