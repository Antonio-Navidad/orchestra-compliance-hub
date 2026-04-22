/**
 * stripe-subscription — creates a Stripe Checkout Session.
 *
 * Single plan:
 *   team / monthly  →  $1,499/month  (subscription_tier = 'black')
 *   team / annual   →  $14,999/year  (subscription_tier = 'black')
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY              — Stripe secret key
 *   STRIPE_TEAM_MONTHLY_PRICE_ID   — Stripe Price ID for $1,499/month
 *   STRIPE_TEAM_ANNUAL_PRICE_ID    — Stripe Price ID for $14,999/year
 *
 * To create Price IDs in Stripe Dashboard:
 *   1. Products → Add Product → "Orchestra AI Team"
 *   2. Add recurring price: $1,499/month → copy Price ID → STRIPE_TEAM_MONTHLY_PRICE_ID
 *   3. Add recurring price: $14,999/year → copy Price ID → STRIPE_TEAM_ANNUAL_PRICE_ID
 */

import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY to Supabase secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { plan, billingCycle, userId, userEmail, successUrl, cancelUrl } = await req.json();

    // Only "team" plan exists — guard against stale clients sending old plan IDs
    if (plan !== "team") {
      return new Response(
        JSON.stringify({ error: "Invalid plan. Only 'team' is available." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAnnual = billingCycle === "annual";
    const priceEnvKey = isAnnual ? "STRIPE_TEAM_ANNUAL_PRICE_ID" : "STRIPE_TEAM_MONTHLY_PRICE_ID";
    const fallbackAmount = isAnnual ? 1499900 : 149900; // cents
    const fallbackInterval = isAnnual ? "year" : "month";

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const origin = req.headers.get("origin") || "https://orchestra-compliance-hub.vercel.app";

    const priceId = Deno.env.get(priceEnvKey);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "usd",
              unit_amount: fallbackAmount,
              recurring: { interval: fallbackInterval as "month" | "year" },
              product_data: {
                name: "Orchestra AI — Team Plan",
                description: isAnnual
                  ? "Unlimited Mexico land freight pre-filing validations. 3 seats. $14,999/year."
                  : "Unlimited Mexico land freight pre-filing validations. 3 seats. $1,499/month.",
              },
            },
            quantity: 1,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: userEmail || undefined,
      line_items: lineItems,
      metadata: {
        userId: userId || "",
        plan: "team",
        billingCycle: isAnnual ? "annual" : "monthly",
        subscription_tier: "black",
      },
      subscription_data: {
        metadata: {
          userId: userId || "",
          plan: "team",
          billingCycle: isAnnual ? "annual" : "monthly",
          subscription_tier: "black",
        },
      },
      success_url:
        successUrl ||
        `${origin}/intake?subscribed=true&plan=team&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${origin}/intake`,
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-subscription] error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
