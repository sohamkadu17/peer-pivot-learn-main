import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sentiment analysis helper (simple, no external API)
function analyzeSentiment(text: string): number {
  const positive = ['good', 'great', 'excellent', 'amazing', 'helpful', 'thanks', 'love'];
  const negative = ['bad', 'poor', 'terrible', 'hate', 'difficult', 'hard', 'confuse'];
  
  const lower = text.toLowerCase();
  let score = 0;
  positive.forEach(word => { if (lower.includes(word)) score += 1; });
  negative.forEach(word => { if (lower.includes(word)) score -= 1; });
  
  return score;
}

// Local intent matching (saves OpenAI credits)
async function findLocalIntent(text: string, supabase: any) {
  try {
    const { data: intents } = await supabase.from('chat_intents').select('*');
    if (!intents) return null;
    
    const lower = text.toLowerCase();
    for (const intent of intents) {
      for (const pattern of (intent.patterns || [])) {
        if (lower.includes(pattern.toLowerCase())) {
          const responses = intent.responses || [];
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          return { response: randomResponse, intent: intent.name };
        }
      }
    }
  } catch (error) {
    console.error('Intent matching error:', error);
  }
  return null;
}

// Local fallback generator (no API call)
function generateLocalFallback(text: string): string {
  const sentiment = analyzeSentiment(text);
  let mood = '';
  if (sentiment >= 2) mood = "🌟 That's great to hear!";
  else if (sentiment <= -2) mood = "⚠️ I sense some frustration. Let me help!";
  
  const lower = text.toLowerCase();
  
  // Pattern matching for common queries
  if (lower.includes('how') && (lower.includes('work') || lower.includes('use'))) {
    return `Great question! ${mood}\n\nExplore the Dashboard to see all features. Try joining a Challenge or browsing the Leaderboard!`;
  }
  
  if (lower.includes('help') || lower.includes('stuck')) {
    return `I'm here to help! ${mood}\n\nTry these:\n- "study tips" for learning advice\n- "join challenge" for weekly goals\n- "earn badges" for achievements`;
  }
  
  const fallbacks = [
    `I didn't quite catch that. ${mood}\n\nTry: "study tips", "challenges", or "how to earn badges"`,
    `Not sure about that one. ${mood}\n\nAsk: "What challenges can I join?" or "Give me study tips"`
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// Call OpenAI (only when local fallback doesn't work)
async function callOpenAI(text: string, apiKey: string): Promise<string> {
  const systemPrompt = `You are StudyBot, a friendly AI assistant for Study Circle - a peer learning platform.

Help students with:
- Study tips and learning strategies
- Information about challenges, badges, and leaderboard
- Peer learning advice
- Session guidance

Keep responses SHORT (2-3 sentences max) and encouraging. If asked about features, mention: Challenges page, Leaderboard, Achievements, and Dashboard.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Cheapest model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.3, // Low for consistency
      max_tokens: 250, // Keep it short to save credits
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, user_id = null, session_id = null, use_ai = false } = await req.json();
    
    if (!text || typeof text !== 'string' || text.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Invalid text (max 2000 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let botReply = '';
    let source = 'local';

    // Step 1: Try local intent matching first (FREE)
    const intentMatch = await findLocalIntent(text, supabase);
    if (intentMatch) {
      botReply = intentMatch.response;
      source = `local_intent:${intentMatch.intent}`;
      console.log('✅ Matched local intent:', intentMatch.intent);
    } 
    // Step 2: If use_ai flag is true, use OpenAI (PAID)
    else if (use_ai) {
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiKey) {
        throw new Error('OpenAI API key not configured');
      }
      
      try {
        botReply = await callOpenAI(text, openaiKey);
        source = 'openai:gpt-4o-mini';
        console.log('💰 Used OpenAI API');
      } catch (error) {
        console.error('OpenAI failed, using local fallback:', error);
        botReply = generateLocalFallback(text);
        source = 'local_fallback:openai_error';
      }
    } 
    // Step 3: Use local fallback (FREE)
    else {
      botReply = generateLocalFallback(text);
      source = 'local_fallback';
      console.log('✅ Used local fallback');
    }

    // Save to database
    if (user_id) {
      const { error: insertError } = await supabase.from('ai_chats').insert({
        user_id,
        session_id,
        user_message: text,
        assistant_reply: botReply,
      });
      
      if (insertError) {
        console.error('Failed to save chat:', insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        reply: botReply, 
        source,
        tip: !use_ai ? '💡 Set use_ai:true for smarter AI responses (uses credits)' : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-chat-helper:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Sorry, something went wrong. Try rephrasing your question.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});