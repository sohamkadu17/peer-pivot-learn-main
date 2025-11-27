import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ToxicityResult {
  isToxic: boolean;
  score: number;
  categories: string[];
  suggestion?: string;
}

export function useToxicityFilter() {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkToxicity = async (text: string, threshold: number = 0.7): Promise<boolean> => {
    if (!text || text.trim().length === 0) {
      return true; // Empty text is OK
    }

    setIsChecking(true);

    try {
      const { data, error } = await supabase.functions.invoke('toxicity-filter', {
        body: { text, threshold }
      });

      if (error) {
        console.error('Toxicity check failed:', error);
        // On error, allow the content (fail open)
        return true;
      }

      const result: ToxicityResult = data;

      if (result.isToxic) {
        // Show measured alert to user
        toast({
          title: '⚠️ Content Warning',
          description: result.suggestion || 'Please revise your comment to be more constructive.',
          variant: 'destructive',
          duration: 6000,
        });
        return false; // Block submission
      }

      return true; // Allow submission
    } catch (err) {
      console.error('Toxicity filter error:', err);
      // On error, allow the content (fail open)
      return true;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    checkToxicity,
    isChecking
  };
}
