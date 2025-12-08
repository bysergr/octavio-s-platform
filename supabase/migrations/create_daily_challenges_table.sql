-- Crear tabla para rastrear challenges diarios completados
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pillar TEXT NOT NULL CHECK (pillar IN ('interpretacion', 'inferencia', 'reflexion', 'argumentacion')),
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('multiple_choice', 'open_ended')),
  question TEXT NOT NULL,
  user_answer TEXT,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  feedback TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_date, pillar)
);

-- Índice para búsquedas rápidas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user ON daily_challenges(user_id);

-- Comentarios en la tabla
COMMENT ON TABLE daily_challenges IS 'Rastrea los challenges diarios completados por cada usuario';
COMMENT ON COLUMN daily_challenges.challenge_date IS 'Fecha del challenge (permite máximo 5 challenges por día)';
COMMENT ON COLUMN daily_challenges.pillar IS 'Pilar de lectura crítica: interpretacion, inferencia, reflexion, argumentacion';
COMMENT ON COLUMN daily_challenges.stars IS 'Estrellas obtenidas (1-5)';

