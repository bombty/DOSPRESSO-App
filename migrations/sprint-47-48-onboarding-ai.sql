-- ═══════════════════════════════════════════════════════════════════
-- Sprint 47-48 Migration (Aslan 13 May 2026)
-- AI-Native Onboarding + Daily Brief + AI Alerts
-- ═══════════════════════════════════════════════════════════════════

-- 1. ONBOARDING CONVERSATIONS
CREATE TABLE IF NOT EXISTS onboarding_conversations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'active' NOT NULL,
  current_step VARCHAR(50) DEFAULT 'welcome',
  total_steps INTEGER DEFAULT 7,
  version INTEGER DEFAULT 1 NOT NULL,
  archived_reason VARCHAR(100),
  archived_at TIMESTAMP,
  archived_by_id VARCHAR REFERENCES users(id),
  user_preferences JSONB DEFAULT '{}',
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  skipped_at TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS onboarding_user_idx ON onboarding_conversations(user_id);
CREATE INDEX IF NOT EXISTS onboarding_status_idx ON onboarding_conversations(status);
CREATE INDEX IF NOT EXISTS onboarding_role_idx ON onboarding_conversations(role);

-- 2. ONBOARDING MESSAGES
CREATE TABLE IF NOT EXISTS onboarding_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES onboarding_conversations(id) ON DELETE CASCADE NOT NULL,
  sender VARCHAR(20) NOT NULL,
  step VARCHAR(50),
  content TEXT NOT NULL,
  quick_replies JSONB,
  selected_reply VARCHAR(100),
  ai_model VARCHAR(50),
  token_count INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS onboarding_msg_conv_idx ON onboarding_messages(conversation_id);
CREATE INDEX IF NOT EXISTS onboarding_msg_created_idx ON onboarding_messages(created_at);

-- 3. ONBOARDING TEMPLATES
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL UNIQUE,
  role_display_name VARCHAR(100) NOT NULL,
  system_prompt TEXT NOT NULL,
  steps JSONB NOT NULL,
  daily_brief_prompt TEXT,
  version INTEGER DEFAULT 1 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS onboarding_template_role_idx ON onboarding_templates(role);

-- 4. DAILY AI BRIEFS
CREATE TABLE IF NOT EXISTS daily_briefs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(50) NOT NULL,
  branch_id INTEGER,
  brief_date DATE NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  content TEXT NOT NULL,
  summary VARCHAR(500),
  priority_items JSONB,
  data_snapshot JSONB,
  ai_model VARCHAR(50),
  token_count INTEGER,
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMP,
  reaction VARCHAR(20),
  reaction_at TIMESTAMP,
  items_clicked JSONB DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS daily_brief_user_idx ON daily_briefs(user_id);
CREATE INDEX IF NOT EXISTS daily_brief_date_idx ON daily_briefs(brief_date);
CREATE INDEX IF NOT EXISTS daily_brief_role_idx ON daily_briefs(role);

-- 5. AI ALERTS
CREATE TABLE IF NOT EXISTS ai_alerts (
  id SERIAL PRIMARY KEY,
  target_role VARCHAR(50),
  target_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label VARCHAR(100),
  source_table VARCHAR(100),
  source_id INTEGER,
  metadata JSONB,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  resolved_at TIMESTAMP,
  resolved_by_id VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_alerts_target_role_idx ON ai_alerts(target_role);
CREATE INDEX IF NOT EXISTS ai_alerts_target_user_idx ON ai_alerts(target_user_id);
CREATE INDEX IF NOT EXISTS ai_alerts_status_idx ON ai_alerts(status);
CREATE INDEX IF NOT EXISTS ai_alerts_type_idx ON ai_alerts(alert_type);
CREATE INDEX IF NOT EXISTS ai_alerts_severity_idx ON ai_alerts(severity);

-- ═══════════════════════════════════════════════════════════════════
-- Test data: Onboarding template (satinalma) — placeholder
-- ═══════════════════════════════════════════════════════════════════
-- Detaylı sistem prompt'lar Sprint 47.4'te eklenecek
-- Şimdilik minimum satinalma için placeholder
INSERT INTO onboarding_templates (role, role_display_name, system_prompt, steps, daily_brief_prompt)
VALUES (
  'satinalma',
  'Satın Alma Sorumlusu',
  'Sen Mr. Dobody, DOSPRESSO satın alma yeni başlayan sorumlusunu karşılıyorsun. Samimi, profesyonel, kısa cümleli konuş. Türkçe yaz. Her cevap maksimum 3 paragraf.',
  '[
    {"id":"welcome","title":"Karşılama","prompt":"Merhaba! DOSPRESSO ailesine hoş geldin. Birkaç dakikalık bir tanışma yapacağız."},
    {"id":"experience","title":"Deneyim","prompt":"Daha önce satın alma veya tedarik yönetiminde çalıştın mı?"},
    {"id":"focus","title":"Odak","prompt":"En çok hangi konularda destek istersin?"},
    {"id":"modules","title":"Modüller","prompt":"Satın alma modüllerini tanıyalım: Tedarikçiler, Ürünler, Siparişler, Puanlama"},
    {"id":"first-task","title":"İlk görev","prompt":"Hadi ilk görevimizi yapalım: tedarikçi kartı oluşturma"},
    {"id":"mr-dobody","title":"Mr. Dobody","prompt":"Her sayfada bana ulaşabilirsin"},
    {"id":"completion","title":"Tamam","prompt":"Onboarding tamamlandı! Günlük brief 09:00 da aktif."}
  ]'::jsonb,
  'Sen Mr. Dobody, satın alma sorumlusu için günün özetini hazırlıyorsun. Kısa, eyleme dökülebilir mesajlar.'
);
