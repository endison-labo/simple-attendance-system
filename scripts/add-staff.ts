/**
 * スタッフ追加スクリプト
 * 
 * 使用方法:
 * 1. .env.local に Supabase の環境変数を設定
 * 2. npx tsx scripts/add-staff.ts <名前> <時給> <PIN> [clinic_id]
 * 
 * 例:
 * npx tsx scripts/add-staff.ts "山田太郎" 1200 1234
 * 
 * clinic_id が指定されない場合、最初のクリニックを使用します
 */

import { createClient } from '@supabase/supabase-js'
import { hashPin } from '../lib/utils/pin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addStaff() {
  // コマンドライン引数の取得
  const args = process.argv.slice(2)
  
  if (args.length < 3) {
    console.error('使用方法: npx tsx scripts/add-staff.ts <名前> <時給> <PIN> [clinic_id]')
    console.error('例: npx tsx scripts/add-staff.ts "山田太郎" 1200 1234')
    process.exit(1)
  }

  const name = args[0]
  const hourlyWage = parseFloat(args[1])
  const pin = args[2]
  const clinicIdArg = args[3]

  // バリデーション
  if (!name || name.trim() === '') {
    console.error('エラー: 名前が指定されていません')
    process.exit(1)
  }

  if (isNaN(hourlyWage) || hourlyWage < 0) {
    console.error('エラー: 時給が正しくありません')
    process.exit(1)
  }

  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    console.error('エラー: PINは4桁の数字である必要があります')
    process.exit(1)
  }

  // クリニックIDの取得
  let clinicId: string

  if (clinicIdArg) {
    clinicId = clinicIdArg
  } else {
    // 最初のクリニックを取得
    const { data: clinics, error: clinicError } = await supabase
      .from('clinics')
      .select('id')
      .limit(1)
      .single()

    if (clinicError || !clinics) {
      console.error('エラー: クリニックが見つかりません')
      console.error('まず init-clinic.ts を実行してクリニックを作成してください')
      process.exit(1)
    }

    clinicId = clinics.id
  }

  // PINをハッシュ化
  console.log('PINをハッシュ化しています...')
  const pinHash = await hashPin(pin)

  // スタッフを追加
  console.log('スタッフを追加しています...')
  const { data, error } = await supabase
    .from('staffs')
    .insert({
      clinic_id: clinicId,
      name: name.trim(),
      hourly_wage: hourlyWage,
      pin_hash: pinHash,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('エラー:', error.message)
    process.exit(1)
  }

  console.log('\n✅ スタッフの追加が完了しました:')
  console.log(JSON.stringify({
    id: data.id,
    name: data.name,
    hourly_wage: data.hourly_wage,
    is_active: data.is_active,
    clinic_id: data.clinic_id
  }, null, 2))
  console.log('\n⚠️  PINは表示されません（セキュリティのため）')
}

addStaff()
  .then(() => {
    console.log('\n完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error)
    process.exit(1)
  })

