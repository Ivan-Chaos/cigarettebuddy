import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('api', () => {
  const app = createApp();

  it('reports liveness', async () => {
    const res = await request(app).get('/api/health/live');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns a structured 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });

  it('serves the ICE server list', async () => {
    const res = await request(app).get('/api/ice');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.iceServers)).toBe(true);
    expect(res.body.data.iceServers.length).toBeGreaterThan(0);
  });
});
