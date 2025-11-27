-- Add unique constraints and sample data
ALTER TABLE subjects ADD CONSTRAINT subjects_name_unique UNIQUE (name);
ALTER TABLE badges ADD CONSTRAINT badges_name_unique UNIQUE (name);

-- Add some sample subjects for testing
INSERT INTO subjects (name, description) VALUES 
('Mathematics', 'Algebra, Calculus, Statistics'),
('Computer Science', 'Programming, Data Structures, Algorithms'),
('Physics', 'Classical Mechanics, Thermodynamics, Quantum Physics'),
('Chemistry', 'Organic, Inorganic, Physical Chemistry'),
('English', 'Literature, Writing, Grammar'),
('History', 'World History, American History');