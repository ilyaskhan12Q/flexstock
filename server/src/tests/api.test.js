import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('FlexStock API Integration Tests', () => {
  let adminToken = '';
  let staffToken = '';
  let categoryId = '';
  let productId = '';
  
  // Dynamic names to prevent unique constraint failures
  const rand = Math.random().toString(36).substring(7);
  const testCategoryName = `Medicines Test ${rand}`;
  const testSku = `PAN-TEST-${rand.toUpperCase()}`;

  describe('Authentication Endpoints', () => {
    it('should fail to log in with incorrect credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@flexstock.com', password: 'wrongpassword' });
      
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should successfully log in as admin', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@flexstock.com', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.role).toBe('ADMIN');
      adminToken = res.body.accessToken;
    });

    it('should successfully log in as staff', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'staff@flexstock.com', password: 'staff123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.role).toBe('STAFF');
      staffToken = res.body.accessToken;
    });
  });

  describe('Categories Schema Configuration', () => {
    it('should block non-admin users from creating categories', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: testCategoryName,
          fields: []
        });

      expect(res.status).toBe(403);
    });

    it('should allow admin to create a category with custom fields schema', async () => {
      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: testCategoryName,
          description: 'Medicines description',
          color: '#ef4444',
          icon: 'Pills',
          fields: [
            {
              label: 'Expiry Date',
              key: 'expiryDate',
              fieldType: 'DATE',
              isRequired: true,
              sortOrder: 0
            },
            {
              label: 'Strength',
              key: 'strength',
              fieldType: 'TEXT',
              isRequired: false,
              unit: 'mg',
              sortOrder: 1
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.fields).toHaveLength(2);
      categoryId = res.body.id;
    });
  });

  describe('Product Catalog & Dynamic Fields validation', () => {
    it('should block adding a product if a mandatory custom field is missing', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          categoryId,
          name: 'Panadol Test Item',
          sku: testSku,
          price: 120.00,
          costPrice: 85.00,
          unit: 'box',
          customFields: JSON.stringify({
            strength: '500' // expiryDate is missing, which is marked as isRequired!
          })
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details[0]).toContain('required');
    });

    it('should successfully add a product with valid custom fields values', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          categoryId,
          name: 'Panadol Test Item',
          sku: testSku,
          price: 120.00,
          costPrice: 85.00,
          unit: 'box',
          customFields: JSON.stringify({
            expiryDate: '2027-12-31',
            strength: '500'
          })
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.customFields).toHaveProperty('expiryDate', '2027-12-31');
      productId = res.body.id;
    });
  });

  describe('Inventory Adjustments & real-time movement triggers', () => {
    it('should record stock transaction and adjust quantities', async () => {
      // Record a Stock In movement
      const res = await request(app)
        .post('/api/v1/inventory/movement')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId,
          type: 'IN',
          quantity: 100,
          location: 'Main',
          note: 'Initial import batch test'
        });

      expect(res.status).toBe(201);
      expect(res.body.movement).toHaveProperty('quantity', 100);

      // Verify that inventory level of the product is now 100 at Main Location
      const levelRes = await request(app)
        .get(`/api/v1/inventory?search=${testSku}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(levelRes.status).toBe(200);
      const panadolStock = levelRes.body.items.find(item => item.productId === productId && item.location === 'Main');
      expect(panadolStock).toBeDefined();
      expect(panadolStock.quantity).toBe(100);
    });
  });

  describe('Sales Module — Checkout & Auto-Stock Deduction', () => {
    it('should process a sale and auto-deduct stock', async () => {
      // Complete a sale of 5 units
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          items: [{ productId, quantity: 5, location: 'Main' }],
          discount: 0,
          note: 'Test sale via integration test'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.items)).toBe(true);

      // Verify stock was decremented from 100 to 95
      const stockRes = await request(app)
        .get(`/api/v1/inventory?search=${testSku}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(stockRes.status).toBe(200);
      const updatedStock = stockRes.body.items.find(i => i.productId === productId && i.location === 'Main');
      expect(updatedStock).toBeDefined();
      expect(updatedStock.quantity).toBe(95);
    });

    it('should reject a sale when stock is insufficient', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          items: [{ productId, quantity: 99999, location: 'Main' }],
          discount: 0
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/insufficient stock/i);
    });

    it('should reject an empty cart checkout', async () => {
      const res = await request(app)
        .post('/api/v1/sales')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ items: [], discount: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/zero items/i);
    });

    it('should list sales history with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/sales')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sales');
      expect(Array.isArray(res.body.sales)).toBe(true);
      expect(res.body).toHaveProperty('pagination');
    });
  });

  describe('Settings Module', () => {
    it('should return settings for any authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/settings')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('businessName');
      expect(res.body).toHaveProperty('locations');
      expect(res.body).toHaveProperty('modules');
    });

    it('should allow admin to update settings', async () => {
      const res = await request(app)
        .patch('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ businessName: 'Test Store Patched', currencySymbol: 'USD' });

      expect(res.status).toBe(200);
      expect(res.body.businessName).toBe('Test Store Patched');
      expect(res.body.currencySymbol).toBe('USD');
    });

    it('should block non-admin users from changing settings', async () => {
      const res = await request(app)
        .patch('/api/v1/settings')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ businessName: 'Hacked Name' });

      expect(res.status).toBe(403);
    });
  });
});

