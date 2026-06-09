const express = require('express');

const app = express();
app.use(express.json());

const VERSION = '1.0.0';

const products = [
  { id: 1, name: 'Aurora Lamp', description: 'A warm desk lamp', price: 49.99, category: 'home', inStock: true },
  { id: 2, name: 'Northstar Keyboard', description: 'Wireless mechanical keyboard', price: 89.5, category: 'tech', inStock: true },
  { id: 3, name: 'Summit Bottle', description: 'Insulated stainless steel bottle', price: 24.0, category: 'outdoor', inStock: true },
  { id: 4, name: 'Harbor Notebook', description: 'Dot grid notebook', price: 12.75, category: 'stationery', inStock: true },
  { id: 5, name: 'Echo Speaker', description: 'Portable Bluetooth speaker', price: 69.0, category: 'audio', inStock: true },
];

const users = [
  { id: 1, name: 'Maya Carter', email: 'maya.carter@example.com', role: 'customer' },
  { id: 2, name: 'Noah Patel', email: 'noah.patel@example.com', role: 'customer' },
  { id: 3, name: 'Lena Brooks', email: 'lena.brooks@example.com', role: 'admin' },
];

const orders = [
  { id: 1, userId: 1, productIds: [1, 2], total: 139.49, status: 'fulfilled', createdAt: '2026-05-20T10:15:00.000Z' },
  { id: 2, userId: 2, productIds: [3], total: 24.0, status: 'processing', createdAt: '2026-05-21T09:30:00.000Z' },
  { id: 3, userId: 3, productIds: [4, 5], total: 81.75, status: 'pending', createdAt: '2026-05-22T14:00:00.000Z' },
];

let nextProductId = 6;
let nextUserId = 4;
let nextOrderId = 4;

function parseId(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function findById(collection, id) {
  return collection.find(item => item.id === id) || null;
}

function notFound(resource, id, res) {
  return res.status(404).json({ error: `${resource}_not_found`, message: `${resource} ${id} was not found` });
}

function normalizeProduct(payload = {}) {
  return {
    name: payload.name || 'New Product',
    description: payload.description || 'Sample product description',
    price: Number(payload.price ?? 0),
    category: payload.category || 'general',
    inStock: payload.inStock !== undefined ? Boolean(payload.inStock) : true,
  };
}

function normalizeUser(payload = {}) {
  return {
    name: payload.name || 'New User',
    email: payload.email || 'new.user@example.com',
    role: payload.role || 'customer',
  };
}

function calculateOrderTotal(productIds) {
  return productIds.reduce((sum, productId) => {
    const product = findById(products, productId);
    return sum + (product ? Number(product.price || 0) : 0);
  }, 0);
}

app.get('/', (_req, res) => {
  res.json({
    message: 'Sample API Under Test',
    status: 'online',
    health: '/health',
    endpoints: {
      products: '/api/products',
      users: '/api/users',
      orders: '/api/orders'
    }
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: VERSION });
});

app.get('/api/products', (_req, res) => {
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const id = parseId(req.params.id);
  const product = id === null ? null : findById(products, id);
  if (!product) {
    return notFound('product', req.params.id, res);
  }
  return res.json(product);
});

app.post('/api/products', (req, res) => {
  const product = { id: nextProductId++, ...normalizeProduct(req.body) };
  products.push(product);
  res.status(201).json(product);
});

app.put('/api/products/:id', (req, res) => {
  const id = parseId(req.params.id);
  const product = id === null ? null : findById(products, id);
  if (!product) {
    return notFound('product', req.params.id, res);
  }

  Object.assign(product, normalizeProduct({ ...product, ...req.body }));
  product.id = id;
  res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
  const id = parseId(req.params.id);
  const product = id === null ? null : findById(products, id);
  if (!product) {
    return notFound('product', req.params.id, res);
  }
  res.json({ message: 'Product deleted', deleted: true, id: product.id });
});

app.get('/api/users', (_req, res) => {
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const id = parseId(req.params.id);
  const user = id === null ? null : findById(users, id);
  if (!user) {
    return notFound('user', req.params.id, res);
  }
  return res.json(user);
});

app.post('/api/users', (req, res) => {
  const user = { id: nextUserId++, ...normalizeUser(req.body) };
  users.push(user);
  res.status(201).json(user);
});

app.get('/api/orders', (_req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const productIds = Array.isArray(req.body?.productIds) && req.body.productIds.length > 0 ? req.body.productIds.map(Number).filter(Number.isFinite) : [1, 2];
  const order = {
    id: nextOrderId++,
    userId: Number(req.body?.userId || 1),
    productIds,
    total: Number(req.body?.total ?? calculateOrderTotal(productIds)),
    status: req.body?.status || 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  res.status(201).json(order);
});

app.get('/api/orders/:id', (req, res) => {
  const id = parseId(req.params.id);
  const order = id === null ? null : findById(orders, id);
  if (!order) {
    return notFound('order', req.params.id, res);
  }
  return res.json(order);
});

const port = Number.parseInt(process.env.PORT || '4000', 10);

app.listen(port, () => {
  console.log(`sample-api listening on ${port}`);
});