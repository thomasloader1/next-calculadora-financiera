import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

describe('Quick Record API (/api/quick-record)', () => {
  it('GET without params returns API documentation and usage', async () => {
    const req = new NextRequest('http://localhost:3000/api/quick-record');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('active');
    expect(data.service).toContain('Quick Record');
  });

  it('GET with valid amount, category, and description registers expense', async () => {
    const req = new NextRequest('http://localhost:3000/api/quick-record?amount=4500&cat=needs&desc=Farmacia');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.record.amount).toBe(4500);
    expect(data.record.category).toBe('needs');
    expect(data.record.description).toBe('Farmacia');
    expect(data.message).toContain('$4.500');
  });

  it('POST with JSON payload successfully creates expense record', async () => {
    const payload = {
      amount: 12500,
      category: 'wants',
      description: 'Cena con amigos',
      type: 'expense',
    };
    const req = new NextRequest('http://localhost:3000/api/quick-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.record.amount).toBe(12500);
    expect(data.record.category).toBe('wants');
    expect(data.record.categoryName).toBe('Imprevistos');
    expect(data.record.description).toBe('Cena con amigos');
  });

  it('POST rejects invalid or zero amount', async () => {
    const payload = { amount: 0, category: 'needs' };
    const req = new NextRequest('http://localhost:3000/api/quick-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });
});
