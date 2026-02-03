-- 時間枠テーブルに開始番号カラムを追加
-- 作成日: 2024-01-02

-- ============================================
-- 1. start_ticket_number カラムを追加
-- ============================================
ALTER TABLE time_slots
ADD COLUMN start_ticket_number INTEGER NOT NULL DEFAULT 1;

-- コメント
COMMENT ON COLUMN time_slots.start_ticket_number IS 'この時間枠の開始整理番号';

-- ============================================
-- 2. 既存データの start_ticket_number を計算して更新
-- ============================================
-- 各企画開催日の時間枠に対して、開始番号を計算
-- 定員 × 時間枠のインデックス + 1

DO $$
DECLARE
    event_date_record RECORD;
    slot_record RECORD;
    capacity INTEGER;
    slot_index INTEGER;
    start_num INTEGER;
BEGIN
    -- 各企画開催日をループ
    FOR event_date_record IN
        SELECT DISTINCT ed.id as event_date_id, e.capacity_per_slot
        FROM event_dates ed
        JOIN events e ON ed.event_id = e.id
        WHERE e.type = 'time_slot'
    LOOP
        capacity := event_date_record.capacity_per_slot;
        slot_index := 0;

        -- その開催日の時間枠を開始時刻順で取得してループ
        FOR slot_record IN
            SELECT id
            FROM time_slots
            WHERE event_date_id = event_date_record.event_date_id
            ORDER BY start_time ASC
        LOOP
            -- 開始番号 = 定員 × インデックス + 1
            -- 例: 定員50、インデックス0 → 1
            --     定員50、インデックス1 → 51
            --     定員50、インデックス2 → 101
            start_num := (capacity * slot_index) + 1;

            -- 更新
            UPDATE time_slots
            SET start_ticket_number = start_num
            WHERE id = slot_record.id;

            slot_index := slot_index + 1;
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- 3. インデックスを追加
-- ============================================
CREATE INDEX idx_time_slots_start_ticket_number ON time_slots(start_ticket_number);
