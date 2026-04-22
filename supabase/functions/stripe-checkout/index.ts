/**
 * stripe-checkout — creates a Stripe Checkout Session for per-shipment validation billing.
 *
 * Pricing: $15.00 per shipment (configurable via STRIPE_PRICE_CENTS env var).
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY  — your Stripe secret key (sk_live_... or sk_test_...)
 *
 * Optional:
 *   STRIPE_PRICE_CENTS — override price per shipment in cents (default: 1500 = $15.00)
 */

import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error:
            "Stripe is not configured. Set STRIPE_SECRET_KEY in Supabase secrets.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      shipmentId,
      shipmentRef,
      userId,
      userEmail,
      successUrl,
      cancelUrl,
    } = await req.json();

    if (!shipmentId) {
      return new Response(
        JSON.stringify({ error: "shipmentId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-06-20",
    });

    const priceInCents = parseInt(
      Deno.env.get("STRIPE_PRICE_CENTS") ?? "1500",
      10
    );

    const displayRef = shipmentRef || `SHP-${shipmentId.slice(0, 8).toUpperCase()}`;
    const origin = req.headers.get("origin") || "https://app.orchestraai.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: priceInCents,
            product_data: {
              name: "Orchestra AI — Pre-Filing Validation Report",
              description: `Shipment ${displayRef}: Document cross-match, HTS pre-validation, and OFAC sanctions screening. Your licensed forwarder remains the agent of record.`,
              metadata: {
                type: "shipment_validation",
              },
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        shipmentId,
        shipmentRef: displayRef,
        userId: userId || "",
      },
      success_url:
        successUrl ||
        `${origin}/intake?shipment=${shipmentId}&report=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancelUrl || `${origin}/intake?shipment=${shipmentId}`,
      // Allow promotion codes for early pilots
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-checkout] error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
