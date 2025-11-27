# AI-Based Toxicity Filter Implementation

## Overview
This toxicity filter screens user-generated content (reviews, comments, feedback) to maintain a positive learning environment, inspired by the Klaytab paper's approach.

## How It Works

### 1. **Interception Layer**
When a user submits a review or comment, the content is intercepted BEFORE being saved to the database.

### 2. **Classification**
The content is analyzed using:
- **Local Rule-Based Detection**: Pattern matching for common toxic keywords (profanity, insults, threats)
- **ML-Based Detection (Optional)**: Google's Perspective API for advanced toxicity detection

### 3. **Measured Alert System**
If toxicity is detected:
- A warning pop-up appears: *"Your comment appears to be non-constructive. Please revise it to be more helpful and respectful."*
- The submission is blocked
- The user can revise and resubmit

## Files Created

1. **`supabase/functions/toxicity-filter/index.ts`**
   - Supabase Edge Function for toxicity detection
   - Supports both local and ML-based (Perspective API) detection

2. **`src/hooks/useToxicityFilter.ts`**
   - React hook to easily integrate toxicity checking in any component

3. **`src/components/SessionReview.tsx`**
   - Example component showing the toxicity filter in action

## Setup Instructions

### Option 1: Local Rule-Based Detection (Free, No API Key)
Works immediately with pattern matching. No setup required.

### Option 2: ML-Based Detection with Google Perspective API (Recommended)

1. **Get a Perspective API Key**:
   - Go to https://developers.perspectiveapi.com/s/
   - Enable the API in Google Cloud Console
   - Create an API key

2. **Add the API key to Supabase**:
   ```bash
   # In Supabase dashboard, go to Settings > Edge Functions > Environment Variables
   # Add: PERSPECTIVE_API_KEY = your-api-key
   ```

3. **Deploy the function**:
   ```bash
   supabase functions deploy toxicity-filter
   ```

## Usage Example

```tsx
import { useToxicityFilter } from '@/hooks/useToxicityFilter';

function MyComponent() {
  const { checkToxicity, isChecking } = useToxicityFilter();

  const handleSubmit = async () => {
    const feedback = "User's comment here";
    
    // Check for toxicity BEFORE saving
    const isContentSafe = await checkToxicity(feedback);
    
    if (!isContentSafe) {
      // User will see a warning toast
      return; // Block submission
    }
    
    // Content is safe, save to database
    await saveToDatabase(feedback);
  };

  return (
    <button onClick={handleSubmit} disabled={isChecking}>
      Submit
    </button>
  );
}
```

## Integration Points

Add the toxicity filter to:
- ✅ Session reviews/ratings
- ✅ Q&A/doubts comments
- ✅ Chat messages
- ✅ Resource descriptions
- ✅ Profile bios

## Customization

### Adjust Sensitivity
Change the threshold (0-1):
```tsx
await checkToxicity(text, 0.5); // More strict (lower = more sensitive)
await checkToxicity(text, 0.9); // More lenient (higher = less sensitive)
```

### Add Custom Patterns
Edit `supabase/functions/toxicity-filter/index.ts`:
```typescript
const TOXIC_PATTERNS = {
  profanity: [...],
  insults: [...],
  // Add your custom categories
  academic_dishonesty: ['plagiarism', 'copy paste', 'cheat sheet'],
};
```

## Benefits

1. **Self-Correction**: Users can revise toxic comments before posting (educational)
2. **Positive Environment**: Maintains constructive discourse
3. **Fail-Safe**: If the API is down, it allows content (fail open)
4. **Privacy**: Text is analyzed but not stored by the filter

## Advanced: Training Your Own Model

For custom toxicity detection:
1. Collect labeled data (toxic/non-toxic comments)
2. Train a classifier using:
   - scikit-learn (LogisticRegression, SVM)
   - spaCy for NLP preprocessing
   - Transformers (BERT, DistilBERT) for state-of-the-art results
3. Deploy as a separate API endpoint
4. Update the `detectToxicityML` function to call your model

## References
- Klaytab paper: Measured alert system for toxicity
- Google Perspective API: https://perspectiveapi.com/
- Wikipedia Toxic Comments dataset: https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge
