import { Telegraf, Markup } from 'telegraf';
import { NextRequest, NextResponse } from 'next/server';

const token = process.env.BOT_TOKEN;
let bot: Telegraf | null = null;

if (token) {
    bot = new Telegraf(token);

    // 1. Command for private chat: Start
    bot.command('start', (ctx) => {
        ctx.reply(
            'Welcome! To open the shop, click the button below.',
            Markup.keyboard([
                Markup.button.webApp('🛍️ Open Shop', process.env.WEBAPP_URL || 'https://google.com')
            ]).resize()
        );
    });

    // 2. Command to post the Shop Button to a Channel
    // Usage: /post @my_channel_username
    bot.command('post', async (ctx) => {
        const channelUsername = ctx.payload.trim(); // Gets the text after /post

        if (!channelUsername) {
            return ctx.reply('⚠️ Please specify the channel username.\nExample: /post @my_fashion_channel');
        }

        try {
            await ctx.telegram.sendMessage(
                channelUsername,
                '🔥 *New Collection is Here!*\n\nClick the button below to browse our exclusive items directly in Telegram.',
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        Markup.button.webApp('🛍️ Open Store', process.env.WEBAPP_URL || 'https://google.com')
                    ])
                }
            );
            ctx.reply(`✅ Successfully posted to ${channelUsername}`);
        } catch (error) {
            console.error(error);
            ctx.reply('❌ Failed to post. Make sure the bot is an Admin in the channel!');
        }
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
