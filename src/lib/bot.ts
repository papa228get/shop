import { Telegraf, Markup } from 'telegraf';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const token = process.env.BOT_TOKEN;
const adminId = Number(process.env.ADMIN_ID);
const webAppUrl = process.env.WEBAPP_URL || '';

if (!token) throw new Error('BOT_TOKEN is missing');

const globalForBot = global as unknown as { bot: Telegraf };
export const bot = globalForBot.bot || new Telegraf(token);
if (process.env.NODE_ENV !== 'production') globalForBot.bot = bot;

const isAdmin = (id: number) => id === adminId;

const setAdminState = async (step: string, data: any = {}) => {
    await supabase.from('admin_states').upsert({ user_id: adminId, step, data });
};
const getAdminState = async () => {
    const { data } = await supabase.from('admin_states').select('*').eq('user_id', adminId).single();
    return data;
};
const clearAdminState = async () => {
    await supabase.from('admin_states').delete().eq('user_id', adminId);
};

const cancelKeyboard = Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'admin_cancel')]]);

const sendOrEdit = async (ctx: any, text: string, keyboard: any) => {
    try {
        if (ctx.callbackQuery?.message?.photo) {
            await ctx.deleteMessage().catch(() => {});
            return await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
        }
        return await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
    } catch (e) {
        return await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    }
};

const mediaGroups: { [key: string]: { photos: string[], timeout: NodeJS.Timeout } } = {};

if (!(bot as any)._isInitialized) {
    bot.command('start', async (ctx) => {
        const { id, username, first_name, last_name } = ctx.from;
        const cleanUsername = username ? username.trim() : null;

        await supabase.from('users').upsert({
            id,
            username: cleanUsername,
            first_name: first_name || 'Без имени',
            last_name: last_name || null,
            updated_at: new Date().toISOString()
        });

        console.log(`👤 Пользователь ${id} обновлен в базе. Username: ${cleanUsername}`);

        ctx.reply(`Привет, ${first_name}! Твой профиль обновлен. \n\n🛍️ Чтобы открыть магазин, нажми на кнопку *«Магазин»* слева от поля ввода текста.`, 
            Markup.removeKeyboard()
        );
    });

    bot.command('admin', async (ctx) => {
        if (!isAdmin(ctx.from.id)) return;
        await clearAdminState();
        await ctx.reply('🔧 *Панель управления*', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('➕ Добавить товар', 'admin_add')],
                [Markup.button.callback('📦 Список товаров', 'admin_list')]
            ])
        });
    });

    bot.action('admin_cancel', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        if (!isAdmin(ctx.from?.id || 0)) return;
        await clearAdminState();
        await sendOrEdit(ctx, '🔧 *Панель управления*', Markup.inlineKeyboard([
            [Markup.button.callback('➕ Добавить товар', 'admin_add')],
            [Markup.button.callback('📦 Список товаров', 'admin_list')]
        ]));
    });

    bot.action('admin_add', async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        if (!isAdmin(ctx.from?.id || 0)) return;
        await setAdminState('WAIT_CATEGORY');
        await sendOrEdit(ctx, '📁 *Выберите категорию товара:*', Markup.inlineKeyboard([
            [Markup.button.callback('👕 Одежда', 'cat_Clothes')],
            [Markup.button.callback('👟 Обувь', 'cat_Shoes')],
            [Markup.button.callback('👜 Аксессуары', 'cat_Accs')],
            [Markup.button.callback('❌ Отмена', 'admin_cancel')]
        ]));
    });

    bot.action(/^cat_(.+)$/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const catMap: any = { 'Clothes': 'Одежда', 'Shoes': 'Обувь', 'Accs': 'Аксессуары' };
        const category = catMap[ctx.match[1]];
        await setAdminState('WAIT_NAME', { category });
        await sendOrEdit(ctx, `📂 Категория: *${category}*

📝 *Введите название товара:*`, cancelKeyboard);
    });

    bot.action(/^admin_list(_(\d+))?$/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        if (!isAdmin(ctx.from?.id || 0)) return;
        const page = parseInt(ctx.match?.[2] || '0');
        const limit = 5;
        const offset = page * limit;
        const { data: products, count } = await supabase.from('products').select('id, name', { count: 'exact' }).order('id', { ascending: false }).range(offset, offset + limit - 1);
        if (!products || products.length === 0) return ctx.reply('Список товаров пуст.');
        const buttons = (products || []).map(p => [Markup.button.callback(p.name, `view_${p.id}`)]);
        const nav = [];
        if (page > 0) nav.push(Markup.button.callback('⬅️ Пред.', `admin_list_${page - 1}`));
        if (count && offset + limit < count) nav.push(Markup.button.callback('След. ➡️', `admin_list_${page + 1}`));
        if (nav.length > 0) buttons.push(nav);
        buttons.push([Markup.button.callback('🏠 В меню', 'admin_cancel')]);
        await sendOrEdit(ctx, `📦 *Список товаров (Стр. ${page + 1})*`, Markup.inlineKeyboard(buttons));
    });

    bot.action(/^view_(\d+)$/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const productId = ctx.match[1];
        const { data: p } = await supabase.from('products').select('*').eq('id', productId).single();
        if (!p) return;
        const mainImage = p.images && p.images.length > 0 ? p.images[0] : null;
        const caption = `📂 *${p.category}* ${p.is_preorder ? '| 🟣 ПРЕДЗАКАЗ' : ''}\n📦 *${p.name}*\n💬 ${p.description || 'Нет описания'}\n💰 Цена: ${p.price} ₽${p.old_price ? ` (Скидка)` : ''}\n🔢 В наличии: ${p.quantity} шт.`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📝 Изменить', `edit_${p.id}`), Markup.button.callback('🗑 Удалить', `del_${p.id}`)],
            [Markup.button.callback('⬅️ К списку', 'admin_list')]
        ]);
        await ctx.deleteMessage().catch(() => {});
        if (mainImage) await ctx.replyWithPhoto(mainImage, { caption, parse_mode: 'Markdown', ...keyboard });
        else await ctx.reply(caption, { parse_mode: 'Markdown', ...keyboard });
    });

    // РЕДАКТИРОВАНИЕ ТОВАРА
    bot.action(/^edit_(\d+)$/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const productId = ctx.match[1];
        const { data: p } = await supabase.from('products').select('*').eq('id', productId).single();
        if (!p) return;

        const text = `⚙️ *Редактирование:* ${p.name}\nВыберите поле для изменения:`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📝 Название', `editfield_name_${productId}`), Markup.button.callback('💰 Цена', `editfield_price_${productId}`)],
            [Markup.button.callback('📸 Фото', `editfield_photo_${productId}`), Markup.button.callback('🔢 Кол-во', `editfield_qty_${productId}`)],
            [Markup.button.callback('🏷 Скидка', `editfield_discount_${productId}`)],
            [Markup.button.callback(p.is_preorder ? '🟣 Убрать предзаказ' : '🟣 Сделать предзаказом', `toggle_preorder_${productId}`)],
            [Markup.button.callback('⬅️ Назад', `view_${productId}`)]
        ]);

        if ((ctx.callbackQuery?.message as any)?.photo) {
            await ctx.editMessageCaption(text, { parse_mode: 'Markdown', ...keyboard });
        } else {
            await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
        }
    });

    bot.action(/^editfield_(name|price|photo|discount|qty)_(\d+)$/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const field = ctx.match[1];
        const productId = ctx.match[2];
        let prompt = '';
        let step = '';
        if (field === 'name') { prompt = 'Введите новое название:'; step = `EDIT_NAME_${productId}`; }
        if (field === 'price') { prompt = 'Введите новую цену:'; step = `EDIT_PRICE_${productId}`; }
        if (field === 'photo') { prompt = 'Отправьте новое фото (одно или группу):'; step = `EDIT_PHOTO_${productId}`; }
        if (field === 'qty') { prompt = 'Введите новое количество:'; step = `EDIT_QTY_${productId}`; }
        if (field === 'discount') { prompt = 'Укажите старую цену для скидки (или 0 для удаления):'; step = `EDIT_DISCOUNT_${productId}`; }

        await setAdminState(step, { productId });
        await ctx.reply(prompt, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Отмена', `edit_${productId}`)]]));
    });

    bot.action(/^del_(\d+)$/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const productId = ctx.match[1];
        const text = '⚠️ *Вы уверены, что хотите удалить этот товар?*';
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('✅ Да, удалить', `confirm_del_${productId}`)],
            [Markup.button.callback('❌ Нет, отмена', `view_${productId}`)]
        ]);
        if ((ctx.callbackQuery?.message as any)?.photo) await ctx.editMessageCaption(text, { parse_mode: 'Markdown', ...keyboard });
        else await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard });
    });

    bot.action(/^confirm_del_(\d+)$/, async (ctx) => {
        await ctx.answerCbQuery().catch(() => {});
        const productId = ctx.match[1];
        const { data: p } = await supabase.from('products').select('images').eq('id', productId).single();
        await supabase.from('products').delete().eq('id', productId);
        if (p?.images) {
            for (const img of p.images) {
                const fileName = img.split('/').pop();
                if (fileName) await supabase.storage.from('product-images').remove([fileName]);
            }
        }
        await ctx.deleteMessage().catch(() => {});
        await ctx.reply('🗑 Удалено.', Markup.inlineKeyboard([[Markup.button.callback('📦 К списку', 'admin_list')]]));
    });

    // ПОДТВЕРЖДЕНИЕ ЗАКАЗА (С УМЕНЬШЕНИЕМ ОСТАТКОВ)
    bot.action(/^confirm_order_(\d+)$/, async (ctx) => {
        await ctx.answerCbQuery();
        const orderId = ctx.match[1];
        
        // 1. Получаем данные заказа
        const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (!order || order.status === 'confirmed') return;

        // 2. Уменьшаем количество товаров в базе
        for (const item of order.items) {
            const { data: product } = await supabase.from('products').select('quantity').eq('id', item.id).single();
            if (product) {
                const newQty = Math.max(0, product.quantity - item.quantity);
                await supabase.from('products').update({ quantity: newQty }).eq('id', item.id);
            }
        }

        // 3. Обновляем статус заказа
        await supabase.from('orders').update({ status: 'confirmed' }).eq('id', orderId);
        
        const currentText = (ctx.callbackQuery.message as any).text;
        await ctx.editMessageText(currentText + '\n\n✅ *ЗАКАЗ ПОДТВЕРЖДЕН (Остатки обновлены)*', {
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: true }
        });
    });

    bot.on('message', async (ctx: any) => {
        if (!isAdmin(ctx.from.id)) return;
        const state = await getAdminState();
        if (!state) return;
        const text = ctx.message.text;
        const photo = ctx.message.photo;
        const mediaGroupId = ctx.message.media_group_id;

        // ЛОГИКА ДОБАВЛЕНИЯ
        if (state.step === 'WAIT_NAME' && text) {
            await setAdminState('WAIT_DESC', { ...state.data, name: text });
            await ctx.reply(`✅ Имя: ${text}\n📝 Введите описание:`, cancelKeyboard);
        } else if (state.step === 'WAIT_DESC' && text) {
            await setAdminState('WAIT_PRICE', { ...state.data, description: text });
            await ctx.reply(`✅ Описание сохранено\n💰 Введите цену:`, cancelKeyboard);
        } else if (state.step === 'WAIT_PRICE' && text) {
            const p = parseFloat(text);
            if (isNaN(p)) return ctx.reply('Нужно число!');
            await setAdminState('WAIT_QTY', { ...state.data, price: p });
            await ctx.reply(`✅ Цена: ${p} ₽\n🔢 Введите количество:`, cancelKeyboard);
        } else if (state.step === 'WAIT_QTY' && text) {
            const q = parseInt(text);
            if (isNaN(q)) return ctx.reply('Нужно число!');
            await setAdminState('WAIT_PHOTO', { ...state.data, quantity: q, images: [] });
            await ctx.reply(`✅ Кол-во: ${q} шт.\n📸 Отправьте фото:`, cancelKeyboard);
        } else if (state.step === 'WAIT_PHOTO' && photo) {
            const fileId = photo[photo.length - 1].file_id;
            const link = await ctx.telegram.getFileLink(fileId);
            const res = await fetch(link.href);
            const fname = `${uuidv4()}.jpg`;
            await supabase.storage.from('product-images').upload(fname, await res.arrayBuffer(), { contentType: 'image/jpeg' });
            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fname);

            if (mediaGroupId) {
                if (!mediaGroups[mediaGroupId]) mediaGroups[mediaGroupId] = { photos: [], timeout: null as any };
                mediaGroups[mediaGroupId].photos.push(publicUrl);
                clearTimeout(mediaGroups[mediaGroupId].timeout);
                mediaGroups[mediaGroupId].timeout = setTimeout(async () => {
                    const finalImages = mediaGroups[mediaGroupId].photos;
                    await setAdminState('ASK_DISCOUNT', { ...state.data, images: finalImages });
                    await ctx.reply(`📸 Загружено ${finalImages.length} фото. Есть скидка?`, Markup.inlineKeyboard([
                        [Markup.button.callback('Да', 'ask_discount_yes'), Markup.button.callback('Нет', 'ask_discount_no')],
                        [Markup.button.callback('❌ Отмена', 'admin_cancel')]
                    ]));
                    delete mediaGroups[mediaGroupId];
                }, 1500);
            } else {
                await setAdminState('ASK_DISCOUNT', { ...state.data, images: [publicUrl] });
                await ctx.reply('📸 Фото получено. Есть скидка?', Markup.inlineKeyboard([
                    [Markup.button.callback('Да', 'ask_discount_yes'), Markup.button.callback('Нет', 'ask_discount_no')],
                    [Markup.button.callback('❌ Отмена', 'admin_cancel')]
                ]));
            }
        } else if (state.step === 'WAIT_OLD_PRICE' && text) {
            const oldP = parseFloat(text);
            await setAdminState('ASK_PREORDER', { ...state.data, old_price: oldP });
            await ctx.reply('🟣 *Это товар по предзаказу?*', {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('Да', 'ask_preorder_yes'), Markup.button.callback('Нет', 'ask_preorder_no')],
                    [Markup.button.callback('❌ Отмена', 'admin_cancel')]
                ])
            });
        } 
        
        // ЛОГИКА РЕДАКТИРОВАНИЯ
        else if (state.step.startsWith('EDIT_')) {
            const parts = state.step.split('_');
            const field = parts[1];
            const productId = parts[2];
            const updateData: any = {};

            if (field === 'NAME' && text) updateData.name = text;
            if (field === 'PRICE' && text) updateData.price = parseFloat(text);
            if (field === 'QTY' && text) updateData.quantity = parseInt(text);
            if (field === 'DISCOUNT' && text) updateData.old_price = parseFloat(text) === 0 ? null : parseFloat(text);
            
            if (field === 'PHOTO' && photo) {
                const fileId = photo[photo.length - 1].file_id;
                const link = await ctx.telegram.getFileLink(fileId);
                const res = await fetch(link.href);
                const fname = `${uuidv4()}.jpg`;
                await supabase.storage.from('product-images').upload(fname, await res.arrayBuffer(), { contentType: 'image/jpeg' });
                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fname);
                
                if (mediaGroupId) {
                    if (!mediaGroups[mediaGroupId]) mediaGroups[mediaGroupId] = { photos: [], timeout: null as any };
                    mediaGroups[mediaGroupId].photos.push(publicUrl);
                    clearTimeout(mediaGroups[mediaGroupId].timeout);
                    mediaGroups[mediaGroupId].timeout = setTimeout(async () => {
                        await supabase.from('products').update({ images: mediaGroups[mediaGroupId].photos }).eq('id', productId);
                        await clearAdminState();
                        await ctx.reply('✅ Изменения сохранены!', Markup.inlineKeyboard([[Markup.button.callback('📦 К списку', 'admin_list')]]));
                        delete mediaGroups[mediaGroupId];
                    }, 1500);
                    return;
                } else {
                    updateData.images = [publicUrl];
                }
            }

            if (Object.keys(updateData).length > 0) {
                await supabase.from('products').update(updateData).eq('id', productId);
                await clearAdminState();
                await ctx.reply('✅ Изменения сохранены!', Markup.inlineKeyboard([[Markup.button.callback('📦 К списку', 'admin_list')]]));
            }
        }
    });

    bot.action(/^toggle_preorder_(\d+)$/, async (ctx) => {
        await ctx.answerCbQuery('Обновляю...').catch(() => {});
        const productId = ctx.match[1];
        const { data: p } = await supabase.from('products').select('is_preorder').eq('id', productId).single();
        if (!p) return;
        const newStatus = !p.is_preorder;
        await supabase.from('products').update({ is_preorder: newStatus }).eq('id', productId);
        
        const { data: p_updated } = await supabase.from('products').select('*').eq('id', productId).single();
        if (!p_updated) return;
    
        const text = `⚙️ *Редактирование:* ${p_updated.name}\nСтатус предзаказа обновлен.\nВыберите поле для изменения:`;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('📝 Название', `editfield_name_${productId}`), Markup.button.callback('💰 Цена', `editfield_price_${productId}`)],
            [Markup.button.callback('📸 Фото', `editfield_photo_${productId}`), Markup.button.callback('🔢 Кол-во', `editfield_qty_${productId}`)],
            [Markup.button.callback('🏷 Скидка', `editfield_discount_${productId}`)],
            [Markup.button.callback(p_updated.is_preorder ? '🟣 Убрать предзаказ' : '🟣 Сделать предзаказом', `toggle_preorder_${productId}`)],
            [Markup.button.callback('⬅️ Назад', `view_${p_updated.id}`)]
        ]);
    
        if ((ctx.callbackQuery?.message as any)?.photo) {
            await ctx.editMessageCaption(text, { parse_mode: 'Markdown', ...keyboard }).catch(()=>{});
        } else {
            await ctx.editMessageText(text, { parse_mode: 'Markdown', ...keyboard }).catch(()=>{});
        }
    });

    bot.action('ask_discount_no', async (ctx) => {
        await ctx.answerCbQuery();
        const state = await getAdminState();
        await setAdminState('ASK_PREORDER', state.data);
        await sendOrEdit(ctx, '🟣 *Это товар по предзаказу?*', {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('Да', 'ask_preorder_yes'), Markup.button.callback('Нет', 'ask_preorder_no')],
                [Markup.button.callback('❌ Отмена', 'admin_cancel')]
            ])
        });
    });

    bot.action('ask_discount_yes', async (ctx) => {
        await ctx.answerCbQuery();
        const state = await getAdminState();
        await setAdminState('WAIT_OLD_PRICE', state.data);
        await ctx.reply('📉 Укажите старую цену (в рублях):', cancelKeyboard);
    });

    bot.action('ask_preorder_yes', async (ctx) => {
        await ctx.answerCbQuery();
        const state = await getAdminState();
        if (!state) return;
        const { error } = await supabase.from('products').insert([{ ...state.data, is_preorder: true }]);
        if (error) {
            console.error('Ошибка при создании товара:', error);
            return ctx.reply(`❌ Ошибка базы данных: ${error.message}`);
        }
        await clearAdminState();
        await sendOrEdit(ctx, '✅ Товар добавлен как *предзаказ*!', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('📦 К списку', 'admin_list')]]) });
    });

    bot.action('ask_preorder_no', async (ctx) => {
        await ctx.answerCbQuery();
        const state = await getAdminState();
        if (!state) return;
        const { error } = await supabase.from('products').insert([{ ...state.data, is_preorder: false }]);
        if (error) {
            console.error('Ошибка при создании товара:', error);
            return ctx.reply(`❌ Ошибка базы данных: ${error.message}`);
        }
        await clearAdminState();
        await sendOrEdit(ctx, '✅ Товар добавлен!', { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('📦 К списку', 'admin_list')]]) });
    });

    (bot as any)._isInitialized = true;
}
