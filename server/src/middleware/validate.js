import { ZodError } from 'zod';

/**
 * Zod validation middleware factory.
 *
 * @param {Object} schema - Object with optional `body`, `params`, `query` Zod schemas.
 * @returns Express middleware
 *
 * @example
 *   import { z } from 'zod';
 *   router.post('/foo', validate({ body: z.object({ name: z.string() }) }), handler);
 */
const validate = (schema) => (req, _res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params);
    }
    if (schema.query) {
      req.query = schema.query.parse(req.query);
    }
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const formatted = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      const combinedMessage = formatted.map((e) => e.message).join('. ') || 'Validation failed';

      return _res.status(400).json({
        success: false,
        message: combinedMessage,
        errors: formatted,
      });
    }
    next(error);
  }
};

export default validate;
