-- Add some sample subjects for testing
INSERT INTO subjects (name, description) VALUES 
('Mathematics', 'Algebra, Calculus, Statistics'),
('Computer Science', 'Programming, Data Structures, Algorithms'),
('Physics', 'Classical Mechanics, Thermodynamics, Quantum Physics'),
('Chemistry', 'Organic, Inorganic, Physical Chemistry'),
('English', 'Literature, Writing, Grammar'),
('History', 'World History, American History')
ON CONFLICT (name) DO NOTHING;

-- Add some sample badges for the achievement system
INSERT INTO badges (name, icon, description, criteria) VALUES
('First Session', 'trophy', 'Complete your first study session', '{"sessions_completed": 1}'),
('Mentor Master', 'star', 'Teach 5 successful sessions', '{"sessions_taught": 5}'),
('Dedicated Learner', 'book', 'Attend 10 study sessions', '{"sessions_attended": 10}'),
('Subject Expert', 'graduation-cap', 'Maintain 4.5+ rating with 20+ sessions', '{"avg_rating": 4.5, "sessions_taught": 20}')
ON CONFLICT (name) DO NOTHING;