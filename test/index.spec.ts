import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('chat proxy worker', () => {
  it('serves test page', async () => {
    const response = await SELF.fetch('https://example.com/');
    expect(response.headers.get('content-type')).toContain('text/html');
    const text = await response.text();
    expect(text).toContain('AI Chat Test');
  });

  it('returns 400 for missing fields', async () => {
    const request = new IncomingRequest('https://example.com/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, { ...env, BASE_URL: '', OPENAI_API_KEY: '' }, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
  });
});
