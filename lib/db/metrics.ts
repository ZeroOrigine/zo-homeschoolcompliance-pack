// CANONICAL: server side purpose beacon (Law 116). Fail soft: a metrics failure never breaks a user request.
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { PRODUCT_ID } from '@/lib/db/constants';

export type ProductMetricEvent = 'page_view' | 'signup' | 'activation' | 'payment';

export async function emitProductMetric(event: ProductMetricEvent, path: string): Promise<void> {
  try {
    const service = createSupabaseServiceClient();
    const { error } = await service.from('homeschoolcompliancepack_zo_product_metrics').insert({ product_slug: PRODUCT_ID, event, path });
    if (error) console.error('[homeschoolcompliancepack] metric emit failed', error.message);
  } catch (error) {
    console.error('[homeschoolcompliancepack] metric emit failed', error);
  }
}
