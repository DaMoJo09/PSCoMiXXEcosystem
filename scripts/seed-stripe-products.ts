import { getUncachableStripeClient } from '../server/stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating PSCoMiXX subscription products...');

  // Check if products exist
  const existingProducts = await stripe.products.search({ query: "active:'true'" });
  if (existingProducts.data.length > 0) {
    console.log('Products already exist:', existingProducts.data.map(p => p.name).join(', '));
    return;
  }

  // Create Creator Pro Monthly
  const creatorProProduct = await stripe.products.create({
    name: 'Creator Pro',
    description: 'Full access to all creation tools, unlimited exports, and commercial licensing',
    metadata: {
      tier: 'creator_pro',
      features: 'unlimited_exports,commercial_license,priority_support,ai_tools'
    },
  });

  const creatorProMonthly = await stripe.prices.create({
    product: creatorProProduct.id,
    unit_amount: 1999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { billing_period: 'monthly' },
  });

  const creatorProYearly = await stripe.prices.create({
    product: creatorProProduct.id,
    unit_amount: 19990,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { billing_period: 'yearly', savings: '17%' },
  });

  console.log('Created Creator Pro:', creatorProProduct.id);
  console.log('  Monthly price:', creatorProMonthly.id, '$19.99/month');
  console.log('  Yearly price:', creatorProYearly.id, '$199.90/year');

  // Create Studio Pro Monthly
  const studioProProduct = await stripe.products.create({
    name: 'Studio Pro',
    description: 'Everything in Creator Pro plus team collaboration, batch processing, and white-label exports',
    metadata: {
      tier: 'studio_pro',
      features: 'all_creator_pro,team_collab,batch_processing,white_label,api_access'
    },
  });

  const studioProMonthly = await stripe.prices.create({
    product: studioProProduct.id,
    unit_amount: 4999,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { billing_period: 'monthly' },
  });

  const studioProYearly = await stripe.prices.create({
    product: studioProProduct.id,
    unit_amount: 49990,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { billing_period: 'yearly', savings: '17%' },
  });

  console.log('Created Studio Pro:', studioProProduct.id);
  console.log('  Monthly price:', studioProMonthly.id, '$49.99/month');
  console.log('  Yearly price:', studioProYearly.id, '$499.90/year');

  console.log('\nAll products created successfully!');
}

createProducts().catch(console.error);
