import { describe, expect, it } from 'vitest';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  isAppError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
} from './errors';

describe('AppError family', () => {
  it.each([
    [new BadRequestError(), 400, 'bad_request', 'Bad request', 'BadRequestError'],
    [new UnauthorizedError(), 401, 'unauthorized', 'Authentication required', 'UnauthorizedError'],
    [
      new ForbiddenError(),
      403,
      'forbidden',
      'You do not have access to this resource',
      'ForbiddenError',
    ],
    [new NotFoundError(), 404, 'not_found', 'Resource not found', 'NotFoundError'],
    [
      new ConflictError(),
      409,
      'conflict',
      'Conflict with the current state of the resource',
      'ConflictError',
    ],
    [new ValidationError(), 422, 'validation_failed', 'Validation failed', 'ValidationError'],
    [
      new ServiceUnavailableError(),
      503,
      'service_unavailable',
      'Service temporarily unavailable',
      'ServiceUnavailableError',
    ],
  ])('maps %o to its status, code, default message and name', (error, status, code, message, name) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
    expect(error.name).toBe(name);
    expect(error.headers).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  it('accepts custom messages', () => {
    expect(new UnauthorizedError('No').message).toBe('No');
    expect(new ForbiddenError('No').message).toBe('No');
    expect(new NotFoundError('No').message).toBe('No');
    expect(new ConflictError('No').message).toBe('No');
  });

  it('carries a cause on BadRequestError', () => {
    const cause = new SyntaxError('bad json');
    expect(new BadRequestError('Bad body', { cause }).cause).toBe(cause);
  });

  it('carries field errors on ValidationError', () => {
    const error = new ValidationError('Invalid', { email: ['Required'] });
    expect(error.fieldErrors).toEqual({ email: ['Required'] });
  });

  it('carries a cause and headers on ServiceUnavailableError', () => {
    const cause = { status: 502 };
    const error = new ServiceUnavailableError('GitHub is unavailable', {
      cause,
      headers: { 'retry-after': '30' },
    });
    expect(error.status).toBe(503);
    expect(error.code).toBe('service_unavailable');
    expect(error.message).toBe('GitHub is unavailable');
    expect(error.cause).toBe(cause);
    expect(error.headers).toEqual({ 'retry-after': '30' });
  });

  it('accepts headers on the base class', () => {
    const error = new AppError('Teapot', 418, 'teapot', { headers: { 'x-a': '1' } });
    expect(error.headers).toEqual({ 'x-a': '1' });
    expect(error.name).toBe('AppError');
  });

  it('identifies app errors', () => {
    expect(isAppError(new NotFoundError())).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError('nope')).toBe(false);
  });
});
