-- スタッフ追加用SQLスクリプト
-- Supabase SQL Editor で実行してください

-- pgcrypto拡張機能を有効化（既に有効な場合はスキップ）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- スタッフ追加（そのまま実行できます）
-- ============================================

-- 方法1: 最初のクリニックを自動取得して追加（推奨）
INSERT INTO public.staffs (clinic_id, name, hourly_wage, pin_hash, is_active)
SELECT 
  (SELECT id FROM public.clinics LIMIT 1),  -- 最初のクリニックを使用
  '山田太郎',                                -- スタッフ名（変更可）
  1200,                                      -- 時給（変更可）
  crypt('1234', gen_salt('bf', 10)),        -- PINをハッシュ化（'1234'を変更可）
  true;                                      -- アクティブ

-- ============================================
-- 複数のスタッフを一度に追加する場合
-- ============================================
-- INSERT INTO public.staffs (clinic_id, name, hourly_wage, pin_hash, is_active)
-- SELECT 
--   (SELECT id FROM public.clinics LIMIT 1),
--   name,
--   hourly_wage,
--   crypt(pin, gen_salt('bf', 10)),
--   true
-- FROM (VALUES
--   ('山田太郎', 1200, '1234'),
--   ('佐藤花子', 1100, '5678'),
--   ('鈴木一郎', 1300, '9012')
-- ) AS staff_data(name, hourly_wage, pin);

-- ============================================
-- 追加したスタッフを確認
-- ============================================
SELECT id, name, hourly_wage, is_active, created_at 
FROM public.staffs 
ORDER BY created_at DESC 
LIMIT 10;

