-- 整理券発券システム データベーススキーマ
-- 作成日: 2024-01-01

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. events（企画テーブル）
-- ============================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('time_slot', 'sequential')),
    capacity_per_slot INTEGER,
    slot_duration_minutes INTEGER,
    estimated_wait_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 時間枠定員制の場合は定員と枠時間が必須
    CONSTRAINT check_time_slot_params CHECK (
        type != 'time_slot' OR (capacity_per_slot IS NOT NULL AND slot_duration_minutes IS NOT NULL)
    ),
    -- 順次案内制の場合は推定待ち時間が必須
    CONSTRAINT check_sequential_params CHECK (
        type != 'sequential' OR estimated_wait_minutes IS NOT NULL
    )
);

-- インデックス
CREATE INDEX idx_events_type ON events(type);

-- コメント
COMMENT ON TABLE events IS '企画テーブル';
COMMENT ON COLUMN events.id IS '企画ID';
COMMENT ON COLUMN events.name IS '企画名';
COMMENT ON COLUMN events.location IS '企画場所';
COMMENT ON COLUMN events.type IS '企画タイプ（time_slot: 時間枠定員制, sequential: 順次案内制）';
COMMENT ON COLUMN events.capacity_per_slot IS '1枠あたりの定員（時間枠定員制のみ）';
COMMENT ON COLUMN events.slot_duration_minutes IS '1枠あたりの時間（分）（時間枠定員制のみ）';
COMMENT ON COLUMN events.estimated_wait_minutes IS '1番号あたりの推定待ち時間（分）（順次案内制のみ）';

-- ============================================
-- 2. event_dates（企画開催日テーブル）
-- ============================================
CREATE TABLE event_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'active', 'paused', 'full', 'ended')),
    next_ticket_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 同じ企画で同じ日付は重複不可
    UNIQUE (event_id, date)
);

-- インデックス
CREATE INDEX idx_event_dates_event_id ON event_dates(event_id);
CREATE INDEX idx_event_dates_date ON event_dates(date);
CREATE INDEX idx_event_dates_status ON event_dates(status);

-- コメント
COMMENT ON TABLE event_dates IS '企画開催日テーブル';
COMMENT ON COLUMN event_dates.id IS '企画開催日ID';
COMMENT ON COLUMN event_dates.event_id IS '企画ID';
COMMENT ON COLUMN event_dates.date IS '開催日';
COMMENT ON COLUMN event_dates.status IS 'ステータス（not_started, active, paused, full, ended）';
COMMENT ON COLUMN event_dates.next_ticket_number IS '次の整理番号';

-- ============================================
-- 3. time_slots（時間枠テーブル）
-- ============================================
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_date_id UUID NOT NULL REFERENCES event_dates(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'active', 'paused', 'full', 'ended')),
    current_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 開始時刻 < 終了時刻
    CONSTRAINT check_time_order CHECK (start_time < end_time)
);

-- インデックス
CREATE INDEX idx_time_slots_event_id ON time_slots(event_id);
CREATE INDEX idx_time_slots_event_date_id ON time_slots(event_date_id);
CREATE INDEX idx_time_slots_status ON time_slots(status);
CREATE INDEX idx_time_slots_start_time ON time_slots(start_time);

-- コメント
COMMENT ON TABLE time_slots IS '時間枠テーブル（時間枠定員制用）';
COMMENT ON COLUMN time_slots.id IS '時間枠ID';
COMMENT ON COLUMN time_slots.event_id IS '企画ID';
COMMENT ON COLUMN time_slots.event_date_id IS '企画開催日ID';
COMMENT ON COLUMN time_slots.start_time IS '開始時刻';
COMMENT ON COLUMN time_slots.end_time IS '終了時刻';
COMMENT ON COLUMN time_slots.status IS 'ステータス';
COMMENT ON COLUMN time_slots.current_count IS '現在の発券数';

-- ============================================
-- 4. tickets（整理券テーブル）
-- ============================================
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_date_id UUID NOT NULL REFERENCES event_dates(id) ON DELETE CASCADE,
    time_slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
    ticket_number INTEGER NOT NULL,
    medium_type TEXT NOT NULL CHECK (medium_type IN ('paper', 'digital')),
    qr_token TEXT UNIQUE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_event_date_id ON tickets(event_date_id);
CREATE INDEX idx_tickets_time_slot_id ON tickets(time_slot_id);
CREATE INDEX idx_tickets_qr_token ON tickets(qr_token);
CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);

-- コメント
COMMENT ON TABLE tickets IS '整理券テーブル';
COMMENT ON COLUMN tickets.id IS '整理券ID';
COMMENT ON COLUMN tickets.event_id IS '企画ID';
COMMENT ON COLUMN tickets.event_date_id IS '企画開催日ID';
COMMENT ON COLUMN tickets.time_slot_id IS '時間枠ID（順次案内制の場合はNULL）';
COMMENT ON COLUMN tickets.ticket_number IS '整理番号';
COMMENT ON COLUMN tickets.medium_type IS '媒体種類（paper: 紙, digital: 電子）';
COMMENT ON COLUMN tickets.qr_token IS '電子媒体用トークン';
COMMENT ON COLUMN tickets.issued_at IS '発券日時';

-- ============================================
-- 5. call_status（呼び出し状態テーブル）
-- ============================================
CREATE TABLE call_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_date_id UUID NOT NULL REFERENCES event_dates(id) ON DELETE CASCADE,
    current_call_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 同じ企画・日付の組み合わせは1つのみ
    UNIQUE (event_id, event_date_id)
);

-- インデックス
CREATE INDEX idx_call_status_event_id ON call_status(event_id);
CREATE INDEX idx_call_status_event_date_id ON call_status(event_date_id);

-- コメント
COMMENT ON TABLE call_status IS '呼び出し状態テーブル（順次案内制用）';
COMMENT ON COLUMN call_status.id IS '呼び出し状態ID';
COMMENT ON COLUMN call_status.event_id IS '企画ID';
COMMENT ON COLUMN call_status.event_date_id IS '企画開催日ID';
COMMENT ON COLUMN call_status.current_call_number IS '現在の呼び出し番号';

-- ============================================
-- 6. ticket_logs（発券ログテーブル）
-- ============================================
CREATE TABLE ticket_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    action TEXT NOT NULL DEFAULT 'issued',
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB
);

-- インデックス
CREATE INDEX idx_ticket_logs_ticket_id ON ticket_logs(ticket_id);
CREATE INDEX idx_ticket_logs_performed_at ON ticket_logs(performed_at);

-- コメント
COMMENT ON TABLE ticket_logs IS '発券ログテーブル';
COMMENT ON COLUMN ticket_logs.id IS 'ログID';
COMMENT ON COLUMN ticket_logs.ticket_id IS '整理券ID';
COMMENT ON COLUMN ticket_logs.action IS 'アクション';
COMMENT ON COLUMN ticket_logs.performed_at IS '実行日時';
COMMENT ON COLUMN ticket_logs.details IS '詳細情報（JSON）';

-- ============================================
-- 更新日時自動更新トリガー
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- eventsテーブル
CREATE TRIGGER trigger_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- event_datesテーブル
CREATE TRIGGER trigger_event_dates_updated_at
    BEFORE UPDATE ON event_dates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- time_slotsテーブル
CREATE TRIGGER trigger_time_slots_updated_at
    BEFORE UPDATE ON time_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- call_statusテーブル
CREATE TRIGGER trigger_call_status_updated_at
    BEFORE UPDATE ON call_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security (RLS) の設定
-- 認証不要のため、全てのユーザーにアクセスを許可
-- ============================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_logs ENABLE ROW LEVEL SECURITY;

-- 全てのテーブルに対して全アクセスを許可するポリシー
CREATE POLICY "Allow all access to events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to event_dates" ON event_dates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to time_slots" ON time_slots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to tickets" ON tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to call_status" ON call_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ticket_logs" ON ticket_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Realtime有効化（呼び出し状態のリアルタイム更新用）
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE call_status;
