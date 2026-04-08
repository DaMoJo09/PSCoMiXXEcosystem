import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { sql } from 'drizzle-orm';

export class StripeService {
  async createCustomer(email: string, userId: string, name?: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`
        WITH paginated_products AS (
          SELECT id, name, description, metadata, active
          FROM stripe.products
          WHERE active = ${active}
          ORDER BY id
          LIMIT ${limit} OFFSET ${offset}
        )
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM paginated_products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async listPrices(active = true, limit = 20, offset = 0) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE active = ${active} LIMIT ${limit} OFFSET ${offset}`
    );
    return result.rows;
  }

  async getPricesForProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE product = ${productId} AND active = true`
    );
    return result.rows;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async getCustomerActiveSubscription(customerId: string): Promise<{
    subscriptionId: string;
    status: string;
    tier: string;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  } | null> {
    const result = await db.execute(
      sql`
        SELECT 
          s.id as subscription_id,
          s.status,
          s.current_period_end,
          s.cancel_at_period_end,
          s.items as subscription_items
        FROM stripe.subscriptions s
        WHERE s.customer = ${customerId}
        AND s.status IN ('active', 'trialing', 'past_due')
        ORDER BY s.created DESC
        LIMIT 1
      `
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0] as any;
    const items = row.subscription_items || [];
    
    let tier = 'free';
    let priceId: string | null = null;
    
    if (Array.isArray(items) && items.length > 0) {
      const firstItem = items[0];
      priceId = firstItem?.price?.id || firstItem?.price;
      
      if (priceId) {
        const priceResult = await db.execute(
          sql`
            SELECT p.metadata, p.name 
            FROM stripe.prices pr
            JOIN stripe.products p ON pr.product = p.id
            WHERE pr.id = ${priceId}
          `
        );
        
        if (priceResult.rows.length > 0) {
          const priceRow = priceResult.rows[0] as any;
          let productMetadata: Record<string, any> = {};
          try {
            productMetadata = typeof priceRow.metadata === 'string' ? JSON.parse(priceRow.metadata || '{}') : (priceRow.metadata || {});
          } catch { productMetadata = {}; }
          const productName = (priceRow.name || '').toLowerCase();
          
          const validTiers = ['creator', 'pro', 'studio', 'lifetime', 'school'];
          const metadataTier = (productMetadata.tier || '').toLowerCase();
          if (metadataTier && validTiers.includes(metadataTier)) {
            tier = metadataTier;
          } else {
            for (const t of ['lifetime', 'studio', 'pro', 'creator', 'school']) {
              if (productName.includes(t)) {
                tier = t;
                break;
              }
            }
          }
        }
      }
    }

    return {
      subscriptionId: row.subscription_id,
      status: row.status,
      tier,
      currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end * 1000) : null,
      cancelAtPeriodEnd: row.cancel_at_period_end || false,
    };
  }

  async seedSubscriptionProducts() {
    const stripe = await getUncachableStripeClient();

    const plans = [
      { name: "PSCoMiXX Creator", tier: "creator", amount: 999, interval: "month" as const, description: "20 projects, 50 AI generations/day, 1 GB storage, 30 exports/month" },
      { name: "PSCoMiXX Pro", tier: "pro", amount: 1999, interval: "month" as const, description: "100 projects, 200 AI generations/day, 5 GB storage, unlimited exports, commercial license" },
      { name: "PSCoMiXX Studio", tier: "studio", amount: 3999, interval: "month" as const, description: "Unlimited projects, unlimited AI, 20 GB storage, collaboration tools, API access" },
      { name: "PSCoMiXX Lifetime", tier: "lifetime", amount: 19900, interval: null, description: "One-time payment. Founders Pass with all Pro features forever, 50 GB storage" },
    ];

    const created: any[] = [];

    for (const plan of plans) {
      const existingProducts = await stripe.products.list({ limit: 100 });
      const existing = existingProducts.data.find(p => p.metadata?.tier === plan.tier && p.active);
      if (existing) {
        created.push({ product: existing.id, tier: plan.tier, status: "already_exists" });
        continue;
      }

      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: { tier: plan.tier, platform: "pscomixx" },
      });

      const priceData: any = {
        product: product.id,
        unit_amount: plan.amount,
        currency: "usd",
        metadata: { tier: plan.tier },
      };

      if (plan.interval) {
        priceData.recurring = { interval: plan.interval };
      }

      const price = await stripe.prices.create(priceData);
      created.push({ product: product.id, price: price.id, tier: plan.tier, status: "created" });
    }

    return created;
  }
}

export const stripeService = new StripeService();
