import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BadRequestError, ValidationError } from './errors';
import { parseJsonBody } from './parse-body';

const schema = z.object({ email: z.string().trim().email('Bad email'), nested: z.object({ n: z.number() }) });

function post(body: string): Request {
  return new Request('https://devmentor.test/api/x', { method: 'POST', body });
}

describe('parseJsonBody', () => {
  it('returns the schema output', async () => {
    await expect(parseJsonBody(post('{"email":" a@b.co ","nested":{"n":1}}'), schema)).resolves.toEqual({
      email: 'a@b.co',
      nested: { n: 1 },
    });
  });

  it('answers a body that is not JSON with a 400', async () => {
    const error = await parseJsonBody(post('{'), schema).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BadRequestError);
    expect((error as BadRequestError).message).toBe('Request body must be valid JSON');
  });

  it('answers a schema failure with a 422 keyed by dotted path or _root', async () => {
    const field = await parseJsonBody(post('{"email":"x","nested":{"n":"1"}}'), schema).catch((caught: unknown) => caught);
    expect(field).toBeInstanceOf(ValidationError);
    expect((field as ValidationError).fieldErrors).toEqual({
      email: ['Bad email'],
      'nested.n': [expect.any(String)],
    });

    const root = await parseJsonBody(post('[]'), schema).catch((caught: unknown) => caught);
    expect((root as ValidationError).fieldErrors).toEqual({ _root: [expect.any(String)] });
  });
});
