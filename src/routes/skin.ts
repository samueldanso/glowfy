import { Hono } from 'hono';

const skinRoutes = new Hono();

skinRoutes.on(['GET', 'POST'], '/analyze', (c) => {
  return c.json({ message: 'skin analyze — payment verified', status: 'stub' });
});

skinRoutes.on(['GET', 'POST'], '/quiz', (c) => {
  return c.json({ message: 'skin quiz — payment verified', status: 'stub' });
});

export { skinRoutes };
