import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { bot } from '@/lib/bot';

const ADMIN_ID = process.env.ADMIN_ID;

export async function POST(req: NextRequest) {
  try {
    const { items, total, user: webappUser } = await req.json();

    // 1. Ищем пользователя в базе
    let { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', webappUser.id)
      .single();

    // 2. Если в базе нет username, пробуем запросить данные у самого Telegram API
    if (!dbUser || !dbUser.username) {
      try {
        const chat = await bot.telegram.getChat(webappUser.id);
        const tgUser = chat as any;
        
        // Сразу обновляем базу, чтобы больше не спрашивать
        const { data: updatedUser } = await supabase.from('users').upsert({
          id: webappUser.id,
          username: tgUser.username || null,
          first_name: tgUser.first_name || 'Покупатель',
          last_name: tgUser.last_name || null,
          updated_at: new Date().toISOString()
        }).select().single();
        
        if (updatedUser) dbUser = updatedUser;
      } catch (e) {
        console.error('Ошибка получения данных из TG API:', e);
      }
    }

    const user = dbUser || webappUser;

    // 3. Сохраняем заказ
    const { data: orderData, error } = await supabase
      .from('orders')
      .insert([{ 
          user_id: user.id,
          user_name: user.username || user.first_name,
          items: items,
          total_amount: total,
          status: 'new'
      }])
      .select();

    if (error) throw error;
    const orderId = orderData[0].id;

    // 4. Формируем сообщение
    const itemsText = items
      .map((item: any) => `▫️ [${item.name}](${process.env.WEBAPP_URL}/product/${item.id}) ${item.is_preorder ? '(🟣 Предзаказ)' : ''} — ${item.quantity} шт. (${item.price} ₽)`)
      .join('\n');

    const userDisplay = user.username ? `@${user.username}` : `[Нет юзернейма]`
    const profileUrl = `tg://user?id=${user.id}`;

    const message = `🚀 *НОВЫЙ ЗАКАЗ #${orderId}*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 *Покупатель:* ${user.first_name} ${user.last_name || ''}\n` +
      `🔗 *Контакт:* ${userDisplay}\n` +
      `🆔 *ID:* 
${user.id}\n\n` +
      `📦 *Состав заказа:*
${itemsText}\n\n` +
      `💰 *ИТОГО К ОПЛАТЕ: ${total.toFixed(0)} ₽*\n` +
      `━━━━━━━━━━━━━━━━━━`;

    if (ADMIN_ID) {
      await bot.telegram.sendMessage(ADMIN_ID, message, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [{ text: '👤 Посмотреть профиль', url: profileUrl }],
            [{ text: '✅ Подтвердить', callback_data: `confirm_order_${orderId}` }]
          ]
        }
      });
    }

    return NextResponse.json({ ok: true, orderId });
  } catch (error: any) {
    console.error('Order error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}