import { Hono } from 'hono';

const routineRoutes = new Hono();

routineRoutes.on(['GET', 'POST'], '/build', (c) => {
  return c.json({ message: 'routine build — payment verified', status: 'stub' });
});

export { routineRoutes };
