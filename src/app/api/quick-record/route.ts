import { NextRequest, NextResponse } from 'next/server';

interface QuickRecordPayload {
  token?: string;
  type?: 'expense' | 'income';
  amount: number | string;
  category?: 'needs' | 'wants' | 'savings';
  description?: string;
  currency?: 'ARS' | 'USD';
}

const CATEGORY_NAMES: Record<string, string> = {
  needs: 'Necesidades',
  wants: 'Imprevistos',
  savings: 'Ahorro',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: QuickRecordPayload = await req.json();

    const numericAmount = typeof body.amount === 'string'
      ? parseFloat(body.amount.replace(/[^0-9.-]+/g, ''))
      : Number(body.amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Monto inválido. Debe ser un número mayor a cero.' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const type = body.type === 'income' ? 'income' : 'expense';
    const category = body.category && ['needs', 'wants', 'savings'].includes(body.category)
      ? body.category
      : 'needs';
    const description = body.description?.trim() || (type === 'income' ? 'Ingreso rápido' : 'Gasto rápido');
    const currency = body.currency === 'USD' ? 'USD' : 'ARS';

    const record = {
      id: `quick_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      category: type === 'expense' ? category : undefined,
      categoryName: type === 'expense' ? CATEGORY_NAMES[category] : undefined,
      amount: numericAmount,
      description,
      currency,
      timestamp: new Date().toISOString(),
    };

    const formattedAmount = `$${numericAmount.toLocaleString('es-AR')}`;
    const message = type === 'income'
      ? `✅ Ingreso de ${formattedAmount} registrado`
      : `✅ Gasto de ${formattedAmount} en ${CATEGORY_NAMES[category]} registrado`;

    return NextResponse.json({
      success: true,
      message,
      record,
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Error procesando la solicitud' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawAmount = searchParams.get('amount') || searchParams.get('monto');
  const type = searchParams.get('type') === 'income' ? 'income' : 'expense';
  const category = (searchParams.get('category') || searchParams.get('cat') || 'needs') as 'needs' | 'wants' | 'savings';
  const description = searchParams.get('description') || searchParams.get('desc') || (type === 'income' ? 'Ingreso rápido' : 'Gasto rápido');

  if (!rawAmount) {
    return NextResponse.json({
      status: 'active',
      service: 'Calculadora Financiera 50/30/20 - Quick Record iOS Shortcut API',
      usage: 'Envía un POST o GET con amount, category (needs|wants|savings) y description',
      example: '/api/quick-record?amount=2500&cat=needs&desc=Supermercado',
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  const numericAmount = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ''));
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return NextResponse.json(
      { success: false, error: 'Monto inválido' },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const formattedAmount = `$${numericAmount.toLocaleString('es-AR')}`;
  return NextResponse.json({
    success: true,
    message: type === 'income'
      ? `✅ Ingreso de ${formattedAmount} registrado`
      : `✅ Gasto de ${formattedAmount} en ${CATEGORY_NAMES[category] || 'Necesidades'} registrado`,
    record: {
      id: `quick_${Date.now()}`,
      type,
      category,
      amount: numericAmount,
      description,
      timestamp: new Date().toISOString(),
    },
  }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
