import { ZodError } from 'zod';

/**
 * Validates `body`, `query` and `params` against a schemas object.
 */
export const validate = (schema) => (req, res, next) => {
  try {
    if (schema.body) {
      req.body = schema.body.parse(req.body ?? {});
    }
    if (schema.query) {
      req.validQuery = schema.query.parse(req.query ?? {});
    }
    if (schema.params) {
      req.params = schema.params.parse(req.params ?? {});
    }
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: issues[0]?.message || 'ข้อมูลไม่ถูกต้องตามรูปแบบ',
        errors: issues,
      });
    }
    next(error);
  }
};
