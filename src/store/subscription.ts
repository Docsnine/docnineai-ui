/**
 * subscription.ts — Zustand store for the current user's subscription state.
 *
 * Backed by GET /billing/subscription (requires auth).
 * Loaded lazily on first access — not fetched on app startup.
 */
import { create } from "zustand";
import {
  billingApi,
  BillingPlan,
  SubscriptionData,
  UsageData,
} from "@/lib/api";

interface SubscriptionState {
  subscription: SubscriptionData | null;
  usage: UsageData | null;
  plans: BillingPlan[];
  loading: boolean;
  error: string | null;

  // Load subscription + usage for the authenticated user
  load: () => Promise<void>;
  // Load available plans (public — no auth)
  loadPlans: () => Promise<void>;
  // Reset on logout
  reset: () => void;
  // Refresh subscription after a plan change
  refresh: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: null,
  usage: null,
  plans: [],
  loading: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await billingApi.getSubscription();
      set({ subscription: data.subscription, usage: data.usage });
    } catch (err: any) {
      set({ error: err.message ?? "Failed to load subscription" });
    } finally {
      set({ loading: false });
    }
  },

  loadPlans: async () => {
    try {
      const data = await billingApi.getPlans();
      set({ plans: data.plans });
    } catch {
      // Silently fail — pricing page will show error state
    }
  },

  refresh: async () => {
    try {
      const data = await billingApi.getSubscription();
      set({ subscription: data.subscription, usage: data.usage });
    } catch {
      // Swallow — page already has data
    }
  },

  reset: () => set({ subscription: null, usage: null, plans: [], error: null }),
}));

// ── Convenience selectors ─────────────────────────────────────────────────────

/** True when the user's plan is above free (active, trialing, or past_due) */
export function isPaidPlan(sub: SubscriptionData | null): boolean {
  if (!sub) return false;
  return sub.plan !== "free";
}

/** Returns effective plan ID, accounting for paused state */
export function effectivePlan(sub: SubscriptionData | null): string {
  if (!sub) return "free";
  if (sub.status === "paused") return "free";
  return sub.plan;
}

/** Check if the user's plan has a specific feature */
export function hasFeature(
  sub: SubscriptionData | null,
  featureKey: keyof SubscriptionData["features"],
): boolean {
  if (!sub) return false;
  return !!sub.features?.[featureKey];
}

/** Plan level for comparison — higher = more powerful */
export const PLAN_LEVEL: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  team: 3,
};

/** True if the user's plan meets or exceeds the minimum */
export function meetsMinPlan(
  sub: SubscriptionData | null,
  minPlan: string,
): boolean {
  const current = effectivePlan(sub);
  return (PLAN_LEVEL[current] ?? 0) >= (PLAN_LEVEL[minPlan] ?? 0);
}
