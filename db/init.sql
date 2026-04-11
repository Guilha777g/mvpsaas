-- ══════════════════════════════════════════════════════════════
-- CRM SaaS — Schema Completo + Trigger de Sync do Agente
-- ══════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════ INVITE CODES ══════
CREATE TABLE IF NOT EXISTS invite_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  tenant_name   TEXT NOT NULL,
  email         TEXT,
  max_uses      INTEGER DEFAULT 1,
  used_count    INTEGER DEFAULT 0,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ══════ TENANTS ══════
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  plan          TEXT DEFAULT 'basic',
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ══════ USERS ══════
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT DEFAULT 'member',
  avatar_url    TEXT,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_idx ON users(tenant_id, email);

-- ══════ AGENT_LEADS (tabela do n8n — mantida) ══════
CREATE TABLE IF NOT EXISTS agent_leads (
  id                      SERIAL PRIMARY KEY,
  tenant_id               UUID NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  id_wp                   TEXT,
  number                  TEXT,
  info                    TEXT,
  crm                     INTEGER,
  ultimamsg_ia            TIMESTAMPTZ,
  ultimamsg_lead          TIMESTAMPTZ,
  ultimamsg_atendente     TIMESTAMPTZ,
  ultimamsg_from          TEXT,
  followup                INTEGER,
  tempo_resposta_enviado  BOOLEAN DEFAULT FALSE,
  temporesposta           TEXT,
  synced_contact_id       UUID
);
CREATE INDEX IF NOT EXISTS agent_leads_tenant_idx ON agent_leads(tenant_id);
CREATE INDEX IF NOT EXISTS agent_leads_number_idx ON agent_leads(tenant_id, number);

-- ══════ CONTACTS ══════
CREATE TABLE IF NOT EXISTS contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'Novo Lead',
  phone         TEXT,
  email         TEXT,
  company       TEXT,
  source        TEXT DEFAULT 'whatsapp',
  tags          TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS contacts_tenant_idx ON contacts(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_phone_idx ON contacts(tenant_id, phone);

-- ══════ PIPELINES ══════
CREATE TABLE IF NOT EXISTS pipelines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'Pipeline Principal',
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ══════ PIPELINE_STAGES ══════
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id   UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT DEFAULT '#C9A84C',
  position      INTEGER NOT NULL,
  is_system     BOOLEAN DEFAULT FALSE,
  spin_value    INTEGER,
  stage_type    TEXT DEFAULT 'open',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stages_position_idx ON pipeline_stages(pipeline_id, position);

-- ══════ DEALS ══════
CREATE TABLE IF NOT EXISTS deals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id    UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  pipeline_id   UUID NOT NULL REFERENCES pipelines(id),
  stage_id      UUID NOT NULL REFERENCES pipeline_stages(id),
  title         TEXT NOT NULL,
  value         DECIMAL(12,2) DEFAULT 0,
  status        TEXT DEFAULT 'open',
  lost_reason   TEXT,
  assigned_to   UUID REFERENCES users(id),
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS deals_tenant_idx ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS deals_stage_idx ON deals(stage_id);
CREATE INDEX IF NOT EXISTS deals_contact_idx ON deals(contact_id);

-- ══════ ACTIVITIES ══════
CREATE TABLE IF NOT EXISTS activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id       UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id    UUID REFERENCES contacts(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  content       TEXT,
  metadata      JSONB DEFAULT '{}',
  author_type   TEXT DEFAULT 'system',
  author_id     UUID,
  deleted_at    TIMESTAMPTZ DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activities_deal_idx ON activities(deal_id);
CREATE INDEX IF NOT EXISTS activities_contact_idx ON activities(contact_id);

-- ══════ TASKS ══════
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id       UUID REFERENCES deals(id) ON DELETE CASCADE,
  contact_id    UUID REFERENCES contacts(id),
  assigned_to   UUID REFERENCES users(id),
  title         TEXT NOT NULL,
  due_date      TIMESTAMPTZ,
  completed     BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON tasks(assigned_to, completed);


-- ══════════════════════════════════════════════════════════════
-- TRIGGER: Auto-sync agent_leads → contacts + deals + activities
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_sync_agent_to_crm()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id  UUID;
  v_pipeline_id UUID;
  v_stage_id    UUID;
  v_deal_id     UUID;
BEGIN
  -- 1. Upsert contact pelo número
  INSERT INTO contacts (tenant_id, name, phone, source)
  VALUES (NEW.tenant_id, 'Lead ' || NEW.number, NEW.number, 'whatsapp')
  ON CONFLICT (tenant_id, phone)
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_contact_id;

  -- 2. Atualizar info do contact se agente enviou
  IF NEW.info IS NOT NULL AND NEW.info <> '' THEN
    UPDATE contacts
    SET custom_fields = jsonb_set(
      COALESCE(custom_fields, '{}'),
      '{agent_info}',
      to_jsonb(NEW.info)
    ),
    updated_at = NOW()
    WHERE id = v_contact_id;
  END IF;

  -- 3. Buscar pipeline default do tenant
  SELECT id INTO v_pipeline_id
  FROM pipelines
  WHERE tenant_id = NEW.tenant_id AND is_default = TRUE
  LIMIT 1;

  -- 4. Mapear crm (SPIN 1-4) para stage
  IF NEW.crm IS NOT NULL AND v_pipeline_id IS NOT NULL THEN
    SELECT id INTO v_stage_id
    FROM pipeline_stages
    WHERE pipeline_id = v_pipeline_id
      AND is_system = TRUE
      AND spin_value = NEW.crm
    LIMIT 1;
  END IF;

  -- 5. Upsert deal (um deal por contact no pipeline)
  IF v_stage_id IS NOT NULL THEN
    SELECT id INTO v_deal_id
    FROM deals
    WHERE contact_id = v_contact_id
      AND pipeline_id = v_pipeline_id
      AND status = 'open'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_deal_id IS NULL THEN
      INSERT INTO deals (tenant_id, contact_id, pipeline_id, stage_id, title, status)
      VALUES (NEW.tenant_id, v_contact_id, v_pipeline_id, v_stage_id,
              'Lead ' || NEW.number, 'open')
      RETURNING id INTO v_deal_id;
    ELSE
      UPDATE deals SET stage_id = v_stage_id, updated_at = NOW()
      WHERE id = v_deal_id;
    END IF;
  END IF;

  -- 6. Log de atividade
  INSERT INTO activities (tenant_id, deal_id, contact_id, type, content, metadata, author_type)
  VALUES (
    NEW.tenant_id,
    v_deal_id,
    v_contact_id,
    CASE
      WHEN NEW.ultimamsg_from = 'atendente' THEN 'handoff'
      ELSE 'agent_update'
    END,
    CASE
      WHEN NEW.ultimamsg_from = 'atendente' THEN 'Handoff para atendente'
      ELSE 'Agente atualizou — SPIN fase ' || COALESCE(NEW.crm::text, '?')
    END,
    jsonb_build_object(
      'spin_phase', NEW.crm,
      'ultimamsg_from', NEW.ultimamsg_from,
      'followup', NEW.followup
    ),
    'agent'
  );

  -- 7. Marcar como sincronizado
  NEW.synced_contact_id := v_contact_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger (drop se existir para idempotência)
DROP TRIGGER IF EXISTS trg_agent_sync ON agent_leads;
CREATE TRIGGER trg_agent_sync
BEFORE INSERT OR UPDATE ON agent_leads
FOR EACH ROW EXECUTE FUNCTION fn_sync_agent_to_crm();
