import { NextRequest, NextResponse } from 'next/server';
import { wcApi } from '@/lib/woocommerce';
import { checkRateLimit } from '@/lib/rateLimit';
import { authenticateRequest } from '@/lib/server/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id, 10);

    if (!productId) {
      return NextResponse.json({ error: 'Invalid product id' }, { status: 400 });
    }

    const response = await wcApi.get('/products/reviews', {
      params: {
        product: productId,
        per_page: 50,
        status: 'approved',
        orderby: 'date_gmt',
        order: 'desc',
      },
    });

    return NextResponse.json({ reviews: response.data });
  } catch (error: any) {
    console.error('Error fetching product reviews:', error);
    return NextResponse.json(
      { error: 'Error fetching product reviews', detail: error?.response?.data || error?.message },
      { status: error?.response?.status || 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitError = await checkRateLimit(request, 5, 60_000);
  if (rateLimitError) return rateLimitError;

  try {
    const auth = await authenticateRequest(request);
    if (!auth?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productId = parseInt(params.id, 10);
    const body = await request.json();
    const reviewer = String(body?.reviewer || auth.email.split('@')[0] || '').trim();
    const reviewerEmail = auth.email;
    const review = String(body?.review || '').trim();
    const rating = parseInt(String(body?.rating || '0'), 10);

    if (!productId || !reviewer || !reviewerEmail || !review || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid review payload' }, { status: 400 });
    }

    const response = await wcApi.post('/products/reviews', {
      product_id: productId,
      reviewer,
      reviewer_email: reviewerEmail,
      review,
      rating,
      status: 'hold',
    });

    return NextResponse.json(
      { review: response.data, message: 'Reseña enviada y pendiente de moderación.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating product review:', error);
    return NextResponse.json(
      { error: 'Error creating product review', detail: error?.response?.data || error?.message },
      { status: error?.response?.status || 500 }
    );
  }
}
