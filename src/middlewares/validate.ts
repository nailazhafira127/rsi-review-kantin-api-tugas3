import type { Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError, type FieldError } from '../errors/AppError.ts';

type Source = 'params' | 'query' | 'body';
type Schemas = Partial<Record<Source, ZodType>>;

function run(schemas: Schemas): RequestHandler {
  return (req, res, next) => {
    const errors: FieldError[] = [];
    const validated: Record<string, any> = {};

    for (const key of ['params', 'query', 'body'] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const input = key === 'body' ? (req.body ?? {}) : req[key];
      const result = schema.safeParse(input);

      if (result.success) {
        validated[key] = result.data;
      } else {
        for (const issue of result.error.issues) {
          errors.push({ field: issue.path.join('.') || key, message: issue.message });
        }
      }
    }

    if (errors.length > 0) return next(new ValidationError(errors));
    res.locals.validated = { ...(res.locals.validated ?? {}), ...validated };
    next();
  };
}

export function validate(schemas: Schemas): RequestHandler;
export function validate(schema: ZodType, source: Source): RequestHandler;
export function validate(arg: Schemas | ZodType, source?: Source): RequestHandler {
  if (typeof (arg as ZodType).safeParse === 'function') {
    return run({ [source ?? 'body']: arg as ZodType });
  }
  return run(arg as Schemas);
}

// Bisa dipanggil getValidated(req, 'body') atau getValidated(res, 'body')
export function getValidated<T = any>(target: Request | Response, source?: Source): T {
  const res = 'locals' in target ? (target as Response) : (target as Request).res!;
  const all = res.locals.validated ?? {};
  return (source ? all[source] : all) as T;
}