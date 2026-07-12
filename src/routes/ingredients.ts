import { Hono } from 'hono';

const ingredientRoutes = new Hono();

ingredientRoutes.on(['GET', 'POST'], '/check', (c) => {
  return c.json({ message: 'ingredients check — payment verified', status: 'stub' });
});

ingredientRoutes.on(['GET', 'POST'], '/recommend', (c) => {
  return c.json({ message: 'ingredients recommend — payment verified', status: 'stub' });
});

export { ingredientRoutes };
