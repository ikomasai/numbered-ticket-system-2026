/**
 * 電子整理券確認ページ Edge Function
 * QRコードから呼び出され、整理券情報を表示するHTMLページを返す
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

/** CORSヘッダー */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 日付をフォーマット
 * @param dateStr - 日付文字列
 * @returns フォーマット済み日付
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const dayOfWeek = dayNames[date.getDay()];
  return `${month}月${day}日(${dayOfWeek})`;
};

/**
 * 時刻をフォーマット
 * @param timeStr - 時刻文字列
 * @returns フォーマット済み時刻
 */
const formatTime = (timeStr: string): string => {
  return timeStr.substring(0, 5);
};

/**
 * HTMLページを生成
 * @param ticket - 整理券データ
 * @returns HTMLテンプレート
 */
const generateHTML = (ticket: any): string => {
  const eventName = ticket.events?.name || '不明';
  const eventLocation = ticket.events?.location || '不明';
  const eventDate = ticket.event_dates?.date ? formatDate(ticket.event_dates.date) : '不明';
  const ticketNumber = ticket.ticket_number;
  const timeSlot = ticket.time_slots
    ? `${formatTime(ticket.time_slots.start_time)}〜${formatTime(ticket.time_slots.end_time)}`
    : null;

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>整理券 - ${eventName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .ticket-card {
      background: white;
      border-radius: 20px;
      padding: 40px 30px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    .ticket-header {
      color: #667eea;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
      letter-spacing: 2px;
    }
    .ticket-number {
      font-size: 72px;
      font-weight: 800;
      color: #333;
      margin-bottom: 20px;
      line-height: 1;
    }
    .ticket-number span {
      font-size: 24px;
      color: #666;
    }
    .event-name {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }
    .event-location {
      font-size: 14px;
      color: #888;
      margin-bottom: 20px;
    }
    .divider {
      border-top: 2px dashed #eee;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    .info-label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    .time-slot {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      font-size: 20px;
      font-weight: 700;
      margin-top: 20px;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #aaa;
    }
    .save-hint {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 10px;
      margin-top: 20px;
      font-size: 13px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="ticket-card">
    <div class="ticket-header">整理券</div>
    <div class="ticket-number">
      <span>No.</span>${ticketNumber}
    </div>
    <div class="event-name">${eventName}</div>
    <div class="event-location">${eventLocation}</div>

    <div class="divider"></div>

    <div class="info-row">
      <span class="info-label">日付</span>
      <span class="info-value">${eventDate}</span>
    </div>

    ${timeSlot ? `<div class="time-slot">${timeSlot}</div>` : ''}

    <div class="save-hint">
      このページをスクリーンショットまたはブックマークで保存してください
    </div>

    <div class="footer">
      大学祭実行委員会
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * エラーページを生成
 * @param message - エラーメッセージ
 * @returns HTMLテンプレート
 */
const generateErrorHTML = (message: string): string => {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>エラー - 整理券</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .error-card {
      background: white;
      border-radius: 20px;
      padding: 40px 30px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    .error-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    .error-title {
      font-size: 24px;
      font-weight: 700;
      color: #333;
      margin-bottom: 10px;
    }
    .error-message {
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="error-card">
    <div class="error-icon">⚠️</div>
    <div class="error-title">エラー</div>
    <div class="error-message">${message}</div>
  </div>
</body>
</html>
  `;
};

serve(async (req) => {
  // CORSプリフライト対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // URLからQRトークンを取得
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const qrToken = pathParts[pathParts.length - 1];

    if (!qrToken || qrToken === 'ticket') {
      return new Response(
        generateErrorHTML('整理券が見つかりません'),
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
          status: 400,
        }
      );
    }

    // Supabaseクライアントを作成
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 整理券を取得
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        events:event_id (
          name,
          location,
          type
        ),
        event_dates:event_date_id (
          date
        ),
        time_slots:time_slot_id (
          start_time,
          end_time
        )
      `)
      .eq('qr_token', qrToken)
      .single();

    if (error || !ticket) {
      return new Response(
        generateErrorHTML('整理券が見つかりません'),
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
          status: 404,
        }
      );
    }

    // HTMLページを返す
    return new Response(
      generateHTML(ticket),
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      generateErrorHTML('サーバーエラーが発生しました'),
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        status: 500,
      }
    );
  }
});
