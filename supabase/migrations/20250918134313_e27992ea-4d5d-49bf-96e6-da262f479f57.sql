-- Create AI chats table for storing AI conversation history
create table if not exists public.ai_chats (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  user_id uuid,
  user_message text not null,
  assistant_reply text,
  created_at timestamptz default now()
);

-- Index for better performance
create index if not exists idx_ai_chats_session on public.ai_chats(session_id);
create index if not exists idx_ai_chats_user on public.ai_chats(user_id);

-- Enable RLS
alter table public.ai_chats enable row level security;

-- Policy: Users can view their own AI chats
create policy "Users can view their own AI chats" on public.ai_chats
  for select using (auth.uid() = user_id);

-- Policy: Users can insert their own AI chats
create policy "Users can insert their own AI chats" on public.ai_chats
  for insert with check (auth.uid() = user_id);