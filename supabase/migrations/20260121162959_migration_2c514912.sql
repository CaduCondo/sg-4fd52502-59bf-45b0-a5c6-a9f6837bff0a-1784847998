CREATE TABLE IF NOT EXISTS user_fee_exemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_user_fee_exemptions_user_id ON user_fee_exemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fee_exemptions_location_id ON user_fee_exemptions(location_id);

ALTER TABLE user_fee_exemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fee exemptions" ON user_fee_exemptions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM system_users WHERE id = auth.uid() AND role = 'admin'
  )
);