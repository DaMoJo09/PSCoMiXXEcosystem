# PSCoMiXX Payment Flow Documentation

## Subscription Tiers

| Tier | Description |
|------|-------------|
| Free | Basic access, limited AI generations |
| Creator | Enhanced tools, more exports |
| Pro | Full access, priority AI |
| Studio | Team features, unlimited everything |
| Lifetime | One-time purchase, permanent Pro access |
| School | Per-seat licensing for educational institutions |

## Checkout Flow

### Standard Subscription

```
1. User selects tier on /pricing page
2. Frontend calls POST /api/stripe/checkout
   Body: { priceId: "price_..." }

3. Server resolves/creates Stripe customer:
   a. Checks existing subscription for stripeCustomerId
   b. If none, calls stripeService.createCustomer()
   c. Stores customerId in subscriptions table

4. Server creates Stripe Checkout Session:
   stripeService.createCheckoutSession(customerId, priceId, successUrl, cancelUrl)

5. Payment audit log: "checkout.initiated"

6. Server returns { url: "https://checkout.stripe.com/..." }

7. Frontend redirects user to Stripe Checkout

8. On success: Stripe sends webhook → subscription activated
9. On cancel: User returns to /settings?checkout=cancel
```

### School Checkout

```
1. Teacher/Admin selects school plan
2. Frontend calls POST /api/stripe/school-checkout
   Body: { priceId: "price_...", seats: 30 }

3. Server validates teacher/admin role
4. Server resolves/creates Stripe customer (same flow)
5. Creates checkout session with teacher dashboard callback

6. Payment audit log: "checkout.initiated" (flow: "school")

7. Stripe processes payment
8. Webhook activates school subscription
```

### Customer Portal

```
POST /api/stripe/portal
→ Returns Stripe Customer Portal URL for managing subscriptions
```

## Webhook Processing

```
POST /api/stripe/webhook
Content-Type: application/json (raw body)
Stripe-Signature: t=...,v1=...

Processing:
1. Signature validated using Stripe SDK
2. Event processed by stripe-replit-sync
3. Subscription status synced to database
4. Tier entitlements updated
```

## Security Controls

| Control | Implementation |
|---------|---------------|
| Webhook signature validation | Stripe SDK built-in |
| Server-side pricing | All prices from Stripe, never client |
| Customer ID validation | Stripe customer resolved server-side |
| Audit trail | All checkout events logged to audit_logs |
| Rate limiting | Auth endpoints: 10/15min |
| Idempotency | Stripe handles duplicate webhook events |

## Audit Trail

All payment events are logged to the `audit_logs` table:

| Action | When |
|--------|------|
| `payment.checkout.initiated` | Checkout session created |
| `payment.checkout.failed` | Checkout creation error |
| `payment.checkout.completed` | Stripe webhook confirms payment |
| `payment.subscription.created` | New subscription activated |
| `payment.subscription.updated` | Tier change or renewal |
| `payment.subscription.cancelled` | User cancels |
| `payment.portal.opened` | Customer portal accessed |

Each log entry includes:
- `userId`: Platform user ID
- `resourceId`: Stripe session/subscription ID
- `ipAddress`: Client IP
- `metadata`: Full context (priceId, customerId, flow type, error details)
