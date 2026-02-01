import { Telegraf, Markup } from 'telegraf';
import { NextRequest, NextResponse } from 'next/server';

const token = process.env.BOT_TOKEN;
let bot: Telegraf | null = null;

if (token) {
    bot = new Telegraf(token);

    // Basic command to start the bot
    bot.command('start', (ctx) => {
        ctx.reply(
            'Welcome to the Fashion Store! Click the button below to start shopping.',
            Markup.keyboard([
                Markup.button.webApp('Open Shop', process.env.WEBAPP_URL || 'https://google.com')
            ]).resize()
        );
    });
}

// Create a webhook handler for Next.js
export async function POST(req: NextRequest) {
    if (!bot) {
        return NextResponse.json({ error: 'Bot not configured' }, { status: 500 });
    }
    
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error handling update', error);
    return NextResponse.json({ ok: false, error: 'Failed to handle update' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Telegram Bot Webhook is active' });
}
