-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  current_weight DECIMAL(5,2),
  target_weight DECIMAL(5,2) DEFAULT 90.0,
  start_weight DECIMAL(5,2) DEFAULT 105.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create weight_entries table
CREATE TABLE IF NOT EXISTS weight_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Create workout_entries table
CREATE TABLE IF NOT EXISTS workout_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  date DATE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in minutes
  intensity INTEGER DEFAULT 1, -- 1-4 scale
  workout_type TEXT DEFAULT 'general',
  completed BOOLEAN DEFAULT FALSE,
  actual_seconds INTEGER, -- actual workout time in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_entries_user_date ON workout_entries(user_id, date);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_entries ENABLE ROW LEVEL SECURITY;

-- Create policies (since this is a single-user app, we'll allow all operations for the fixed user)
CREATE POLICY "Allow all operations for fixed user" ON profiles
  FOR ALL USING (id = 'oat-fitness-journey');

CREATE POLICY "Allow all operations for fixed user" ON weight_entries
  FOR ALL USING (user_id = 'oat-fitness-journey');

CREATE POLICY "Allow all operations for fixed user" ON workout_entries
  FOR ALL USING (user_id = 'oat-fitness-journey');

-- Insert default profile
INSERT INTO profiles (id, current_weight, target_weight, start_weight)
VALUES ('oat-fitness-journey', 105.0, 90.0, 105.0)
ON CONFLICT (id) DO NOTHING;
