import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Topic } from '@cigbuddy/shared';
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

  it('serves live stats without letting them be cached', async () => {
    const wired = createApp({ stats: () => ({ online: 3, breaks: 42 }) });
    const res = await request(wired).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ data: { online: 3, breaks: 42 } });
  });

  it('says so when no stats source is wired', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('stats_unavailable');
  });

  it('serves one topic without letting it be cached', async () => {
    const topic: Topic = { id: 't-001', kind: 'opener', text: 'what did you have for breakfast' };
    const wired = createApp({ topic: () => topic });
    const res = await request(wired).get('/api/topics/random');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ data: topic });
  });

  it('says so when no topic source is wired', async () => {
    const res = await request(app).get('/api/topics/random');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('topics_unavailable');
  });
});
