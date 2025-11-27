-- Add unique constraints only
ALTER TABLE subjects ADD CONSTRAINT subjects_name_unique UNIQUE (name);
ALTER TABLE badges ADD CONSTRAINT badges_name_unique UNIQUE (name);

-- Add sample badges for achievements
INSERT INTO badges (name, icon, description, criteria) VALUES
('First Session', 'trophy', 'Complete your first study session', '{"sessions_completed": 1}'),
('Mentor Master', 'star', 'Teach 5 successful sessions', '{"sessions_taught": 5}'),
('Dedicated Learner', 'book', 'Attend 10 study sessions', '{"sessions_attended": 10}'),
('Subject Expert', 'graduation-cap', 'Maintain 4.5+ rating with 20+ sessions', '{"avg_rating": 4.5, "sessions_taught": 20}')
ON CONFLICT (name) DO NOTHING;