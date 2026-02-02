import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/bot';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        await bot.handleUpdate(body);
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        console.error('Bot Error:', error.message);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Bot is active' });
}