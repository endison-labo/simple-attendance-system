'use client'

import { useState } from 'react'
import PinInput from '@/components/terminal/PinInput'

type ClockState = 'idle' | 'authenticated' | 'success' | 'error'

interface ClockResult {
  success: boolean
  message: string
  staffName?: string
  clockType?: 'in' | 'out'
  actualTime?: string
  effectiveTime?: string
}

export default function Home() {
  const [state, setState] = useState<ClockState>('idle')
  const [result, setResult] = useState<ClockResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handlePinSubmit = async (pin: string) => {
    setIsLoading(true)
    setState('authenticated')

    try {
      // TODO: Phase 3で実装予定のServer Actionを呼び出す
      // const result = await clockInByPin(pin) または clockOutByPin(pin)
      
      // 現在はプレースホルダー
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // エラーメッセージを表示（実装が完了するまで）
      setResult({
        success: false,
        message: '打刻機能は実装中です。Phase 3で実装予定です。',
      })
      setState('error')
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'エラーが発生しました',
      })
      setState('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setState('idle')
    setResult(null)
    setIsLoading(false)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">勤怠管理システム</h1>
          <p className="text-gray-600">PINを入力してください</p>
        </div>

        {state === 'idle' && (
          <PinInput onPinSubmit={handlePinSubmit} isLoading={isLoading} />
        )}

        {state === 'authenticated' && isLoading && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">処理中...</p>
          </div>
        )}

        {state === 'error' && result && (
          <div className="text-center">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-4">
              <p className="text-red-800 font-semibold mb-2">エラー</p>
              <p className="text-red-700">{result.message}</p>
            </div>
            <button
              onClick={handleReset}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              もう一度試す
            </button>
          </div>
        )}

        {state === 'success' && result && (
          <div className="text-center">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-4">
              <p className="text-green-800 font-semibold text-xl mb-2">
                {result.clockType === 'in' ? '出勤' : '退勤'}しました
              </p>
              {result.staffName && (
                <p className="text-green-700 text-lg mb-2">{result.staffName}さん</p>
              )}
              {result.actualTime && (
                <p className="text-green-700">打刻時刻: {result.actualTime}</p>
              )}
              {result.effectiveTime && (
                <p className="text-green-600 text-sm">丸め後: {result.effectiveTime}</p>
              )}
            </div>
            <p className="text-gray-600 mb-4">5秒後に自動的にPIN入力画面に戻ります</p>
          </div>
        )}
      </div>
    </main>
  )
}
