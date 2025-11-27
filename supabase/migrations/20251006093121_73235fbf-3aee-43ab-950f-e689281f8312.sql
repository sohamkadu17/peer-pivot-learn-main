-- Extend ai_chats for general conversations (not just session-based)
ALTER TABLE ai_chats ALTER COLUMN session_id DROP NOT NULL;

-- Add conversation context
ALTER TABLE ai_chats ADD COLUMN IF NOT EXISTS conversation_title text;
ALTER TABLE ai_chats ADD COLUMN IF NOT EXISTS is_resolved boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_chats_user_created ON ai_chats(user_id, created_at DESC);

-- Create intents table for local fallback
CREATE TABLE IF NOT EXISTS chat_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  patterns text[] DEFAULT ARRAY[]::text[],
  responses text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);

-- Seed common intents for local fallback (saves OpenAI credits)
INSERT INTO chat_intents (name, patterns, responses) VALUES
('greeting', 
 ARRAY['hello','hi','hey','good morning','good evening','namaste','howdy'],
 ARRAY['Hey! 👋 How can I help you today?', 'Hello! Ready to learn something new?', 'Hi there! Ask me about study tips or challenges!']),
('study_tips', 
 ARRAY['study tips','how to study','study help','study method','learning technique'],
 ARRAY['Try the Pomodoro Technique: 25 mins focus + 5 mins break. Want a schedule?','Start with one topic and create 3 questions about it.','Use active recall: test yourself instead of re-reading!']),
('challenge_info', 
 ARRAY['challenge','join challenge','weekly challenge','what challenges'],
 ARRAY['Go to the Challenges page to see active challenges. Join one to start earning badges!','Check out /challenges to see what''s available this week!','Weekly challenges help you stay motivated and earn rewards!']),
('badges', 
 ARRAY['badge','earn badge','what badges','get badge'],
 ARRAY['You can earn badges by completing challenges, teaching sessions, and helping peers!','View your badges on the Achievements page. Share them to show off!','Badges are earned automatically when you hit milestones!']),
('leaderboard', 
 ARRAY['leaderboard','top contributors','ranking','who is top'],
 ARRAY['Check the Leaderboard page to see top contributors!','Earn contribution score by teaching, helping peers, and completing challenges!']);

-- RLS policies for intents (read-only for all authenticated users)
ALTER TABLE chat_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Intents readable by authenticated users" ON chat_intents FOR SELECT USING (auth.uid() IS NOT NULL);