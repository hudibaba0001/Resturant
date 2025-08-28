import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Plan limits (messages per month)
const PLAN_LIMITS = {
  lite: 100,
  standard: 1000,
  pro: 10000,
  unlimited: -1 // -1 means no limit
};

export interface PlanLimits {
  messages: number;
  tokens: number;
}

export async function getPlanLimits(restaurantId: string): Promise<PlanLimits> {
  try {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('plan')
      .eq('id', restaurantId)
      .single();

    const plan = restaurant?.plan || 'lite';
    const messageLimit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.lite;
    
    return {
      messages: messageLimit,
      tokens: messageLimit * 50 // Rough estimate: 50 tokens per message
    };
  } catch (error) {
    console.error('Failed to get plan limits:', error);
    return {
      messages: PLAN_LIMITS.lite,
      tokens: PLAN_LIMITS.lite * 50
    };
  }
}

export async function getUsage(restaurantId: string, period: string) {
  try {
    const { data } = await supabase
      .from('usage_counters')
      .select('messages_used, tokens_used')
      .eq('restaurant_id', restaurantId)
      .eq('period', period)
      .single();

    return {
      messages: data?.messages_used || 0,
      tokens: data?.tokens_used || 0
    };
  } catch (error) {
    console.error('Failed to get usage:', error);
    return { messages: 0, tokens: 0 };
  }
}

export async function incrementUsage(
  restaurantId: string, 
  period: string, 
  messages: number = 1,
  tokens: number = 0
) {
  try {
    // First get current usage
    const { data: current } = await supabase
      .from('usage_counters')
      .select('messages_used, tokens_used')
      .eq('restaurant_id', restaurantId)
      .eq('period', period)
      .single();

    const currentMessages = current?.messages_used || 0;
    const currentTokens = current?.tokens_used || 0;

    // Upsert with incremented values
    const { error } = await supabase
      .from('usage_counters')
      .upsert({
        restaurant_id: restaurantId,
        period,
        messages_used: currentMessages + messages,
        tokens_used: currentTokens + tokens
      }, {
        onConflict: 'restaurant_id,period'
      });

    if (error) {
      console.error('Failed to increment usage:', error);
    }
  } catch (error) {
    console.error('Failed to increment usage:', error);
  }
}

export async function checkQuota(restaurantId: string): Promise<{
  allowed: boolean;
  reason?: string;
  usage: { messages: number; tokens: number };
  limits: PlanLimits;
}> {
  try {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const [usage, limits] = await Promise.all([
      getUsage(restaurantId, period),
      getPlanLimits(restaurantId)
    ]);

    const messagesAllowed = limits.messages === -1 || usage.messages < limits.messages;
    const tokensAllowed = limits.tokens === -1 || usage.tokens < limits.tokens;

    const result: {
      allowed: boolean;
      reason?: string;
      usage: { messages: number; tokens: number };
      limits: PlanLimits;
    } = {
      allowed: messagesAllowed && tokensAllowed,
      usage,
      limits
    };

    if (!messagesAllowed) {
      result.reason = 'Message quota exceeded';
    } else if (!tokensAllowed) {
      result.reason = 'Token quota exceeded';
    }

    return result;
  } catch (error) {
    console.error('Failed to check quota:', error);
    // Fail open - allow usage if quota check fails
    return {
      allowed: true,
      usage: { messages: 0, tokens: 0 },
      limits: { messages: 100, tokens: 5000 }
    };
  }
}
