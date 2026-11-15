/**
 * Wraps an async Express route handler so thrown errors are forwarded to next().
 * @param {Function} fn - async (req, res, next) => ...
 * @returns {Function}
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default catchAsync;
