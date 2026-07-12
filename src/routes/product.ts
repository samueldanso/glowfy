import { Hono } from 'hono';

const productRoutes = new Hono();

productRoutes.on(['GET', 'POST'], '/match', (c) => {
  return c.json({ message: 'product match — payment verified', status: 'stub' });
});

export { productRoutes };
