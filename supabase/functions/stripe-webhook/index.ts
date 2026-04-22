/**
 * stripe-webhook — handles Stripe events to activate subscriptions.
 *
 * Events handled:
 *   checkout.session.completed     → activates subscription, upgrades tier
 *   customer.subscription.deleted  → downgrades to free tier on cancellation
 *   customer.subscription.updated  → handles plan changes
 *
 * Required Supabase secrets:
 *   STRIPE_SECRET_KEY          — your Stripe secret key
 *   STRIPE_WEBHOOK_SECRET      — signing secret from Stripe Dashboard → Webhooks
 *
 * Setup in Stripe Dashboard:
 *   1. Go to Developers → Webhooks → Add endpoint
 *   2. Endpoint URL: https://<your-project>.supabase.co/functions/v1/stripe-webhook
 *   3. Events to listen: checkout.session.completed,
 *                        customer.subscription.deleted,
 *                        customer.subscription.updated
 *   4. Copy the signing secret → set as STRIPE_WEBHOOK_SECRET
 */

import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Maps Stripe plan metadata to our subscription_tier enum
const TIER_MAP: Record<string, "gold" | "black" | "free"> = {
  starter: "gold",
  team: "black",
  gold: "gold",
  black: "black",
};

const PLAN_NAME_MAP: Record<string, string> = {
  starter: "Starter",
  team: "Team",
  gold: "Starter",
  black: "Team",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey || !webhookSecret) {
    console.error("[stripe-webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

  // Verify Stripe webhook signature
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use service role key to bypass RLS for profile updates
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  console.log(`[stripe-webhook] Processing event: ${event.type}`);

  try {
    switch (event.type) {
      // ── Payment completed → activate subscription ──────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription") break;

        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const subscriptionTier = TIER_MAP[plan ?? ""] ?? "gold";
        const planName = PLAN_NAME_MAP[plan ?? ""] ?? "Starter";
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!userId) {
          console.error("[stripe-webhook] No userId in session metadata");
          break;
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_tier: subscriptionTier,
            subscription_status: "active",
            plan_name: planName,
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            // Paid subscribers get effectively unlimited credits
            credits_remaining: 999999,
          } as any)
          .eq("id", userId);

        if (error) {
          console.error("[stripe-webhook] Failed to update profile:", error);
          throw error;
        }

        console.log(`[stripe-webhook] Activated ${planName} for user ${userId}`);
        break;
      }

      // ── Subscription cancelled → downgrade to free ─────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          // Try to find user by stripe_customer_id
          const customerId = subscription.customer as string;
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (!profile) {
            console.error("[stripe-webhook] Could not find user for subscription deletion");
            break;
          }

          await supabase
            .from("profiles")
            .update({
              subscription_tier: "free",
              subscription_status: "cancelled",
              plan_name: "Free",
              // Give them 5 credits back when they cancel (goodwill)
              credits_remaining: 5,
              stripe_subscription_id: null,
            } as any)
            .eq("id", profile.id);

          console.log(`[stripe-webhook] Downgraded user ${profile.id} to free tier`);
          break;
        }

        await supabase
          .from("profiles")
          .update({
            subscription_tier: "free",
            subscription_status: "cancelled",
            plan_name: "Free",
            credits_remaining: 5,
            stripe_subscription_id: null,
          } as any)
          .eq("id", userId);

        console.log(`[stripe-webhook] Downgraded user ${userId} to free tier`);
        break;
      }

      // ── Subscription updated (plan change, renewal, etc.) ──────────────────
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const plan = subscription.metadata?.plan;

        if (!userId || !plan) break;

        const subscriptionTier = TIER_MAP[plan] ?? "gold";
        const planName = PLAN_NAME_MAP[plan] ?? "Starter";
        const isActive = subscription.status === "active";

        await supabase
          .from("profiles")
          .update({
            subscription_tier: isActive ? subscriptionTier : "free",
            subscription_status: subscription.status,
            plan_name: isActive ? planName : "Free",
            credits_remaining: isActive ? 999999 : 5,
          } as any)
          .eq("id", userId);

        console.log(`[stripe-webhook] Updated subscription for ${userId}: ${subscription.status}`);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Handler error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
