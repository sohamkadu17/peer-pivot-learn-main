import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ToxicityCheckRequest {
  text: string;
  threshold?: number; // 0-1, default 0.7
}

interface ToxicityResult {
  isToxic: boolean;
  score: number;
  categories: string[];
  suggestion?: string;
}

// Toxicity patterns and keywords (expandable)
const TOXIC_PATTERNS = {
  profanity: ['fuck', 'shit', 'damn', 'bitch', 'ass', 'idiot', 'stupid'],
  insults: ['dumb', 'moron', 'loser', 'worthless', 'useless', 'pathetic', 'trash'],
  threats: ['kill', 'hurt', 'harm', 'attack', 'destroy'],
  discrimination: ['hate', 'racist', 'sexist'],
  aggression: ['shut up', 'die', 'kys', 'nobody cares', 'you suck']
};

// Simple rule-based toxicity detector (can be replaced with ML model)
function detectToxicityLocal(text: string, threshold: number = 0.7): ToxicityResult {
  const lowerText = text.toLowerCase();
  let score = 0;
  const detectedCategories: string[] = [];
  
  // Check each category
  for (const [category, keywords] of Object.entries(TOXIC_PATTERNS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += 0.3;
        if (!detectedCategories.includes(category)) {
          detectedCategories.push(category);
        }
      }
    }
  }
  
  // Normalize score to 0-1
  score = Math.min(score, 1);
  
  const isToxic = score >= threshold;
  
  return {
    isToxic,
    score,
    categories: detectedCategories,
    suggestion: isToxic 
      ? "Your comment may contain non-constructive language. Please revise it to be more helpful and respectful."
      : undefined
  };
}

// Advanced ML-based toxicity check using custom ML service or Perspective API
async function detectToxicityML(text: string, threshold: number = 0.7): Promise<ToxicityResult> {
  const customMlUrl = Deno.env.get('CUSTOM_ML_SERVICE_URL');
  const perspectiveApiKey = Deno.env.get('PERSPECTIVE_API_KEY');
  
  // Try custom ML service first (if configured)
  if (customMlUrl) {
    try {
      console.log('Using custom ML service for toxicity detection');
      const response = await fetch(`${customMlUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, threshold })
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          isToxic: data.isToxic,
          score: data.score,
          categories: data.categories || [],
          suggestion: data.suggestion
        };
      }
    } catch (error) {
      console.warn('Custom ML service failed, trying Perspective API:', error);
    }
  }
  
  // Fallback to Perspective API
  if (perspectiveApiKey) {
    try {
      console.log('Using Perspective API for toxicity detection');
      const response = await fetch(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${perspectiveApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comment: { text },
            requestedAttributes: {
              TOXICITY: {},
              SEVERE_TOXICITY: {},
              INSULT: {},
              PROFANITY: {},
              THREAT: {},
              IDENTITY_ATTACK: {}
            },
            languages: ['en']
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Perspective API error: ${response.status}`);
      }
      
      const data = await response.json();
      const toxicityScore = data.attributeScores.TOXICITY.summaryScore.value;
      const categories: string[] = [];
      
      // Check which categories exceeded threshold
      for (const [attr, scores] of Object.entries(data.attributeScores)) {
        if ((scores as any).summaryScore.value >= threshold) {
          categories.push(attr.toLowerCase());
        }
      }
      
      const isToxic = toxicityScore >= threshold;
      
      return {
        isToxic,
        score: toxicityScore,
        categories,
        suggestion: isToxic
          ? "Your comment appears to be non-constructive. Please revise it to be more helpful and respectful."
          : undefined
      };
    } catch (error) {
      console.error('Perspective API failed, using local fallback:', error);
    }
  }
  
  // Final fallback to local detection
  console.warn('No ML services available, using local rule-based detection');
  return detectToxicityLocal(text, threshold);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, threshold = 0.7 }: ToxicityCheckRequest = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid text input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (text.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Text too long (max 5000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Use ML-based detection (falls back to local if API key not available)
    const result = await detectToxicityML(text, threshold);
    
    console.log(`Toxicity check: ${result.isToxic ? 'TOXIC' : 'CLEAN'} (score: ${result.score.toFixed(2)})`);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in toxicity filter:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze content',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
