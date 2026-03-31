// ════════════════════════════════════════════════════════════════
//  WhatsApp Bot Webhook — Node.js (Vercel / Railway / Render)
//  يستقبل رسائل العملاء ويجمع بيانات الطلب خطوة بخطوة
// ════════════════════════════════════════════════════════════════

const express = require('express');
const app = express();
app.use(express.json());

// ─── ENV VARIABLES (اعملهم في .env) ───
const WA_VERIFY_TOKEN   = process.env.WA_VERIFY_TOKEN   || 'my_secret_verify_token';
const WA_ACCESS_TOKEN   = process.env.WA_ACCESS_TOKEN   || 'EAAxxxxx...';
const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID || '12345678';
const SUPABASE_URL      = process.env.SUPABASE_URL      || 'https://xxxx.supabase.co';
const SUPABASE_KEY      = process.env.SUPABASE_KEY      || 'eyJhbGci...';
const SHEETS_URL        = process.env.SHEETS_URL        || 'https://script.google.com/macros/s/AKfycby2qzGnT3O1yJfCZoOPvTTMjYY0jlJycOx2VQInSGl-XfQe3AHM5RSwPaKL4U_WlLTZ/exec';

// ─── BOT SESSIONS (في الإنتاج استخدم Supabase أو Redis) ───
const sessions = new Map();

// مراحل المحادثة
const STEPS = {
  IDLE:     'idle',
  NAME:     'awaiting_name',
  PHONE:    'awaiting_phone',
  QUANTITY: 'awaiting_quantity',
  ADDRESS:  'awaiting_address',
  NOTES:    'awaiting_notes',
  DONE:     'done',
};

// ════════════════════════════════════════════════════════════════
//  GET /webhook  — Verification (Meta يتحقق من صحة الـ webhook)
// ════════════════════════════════════════════════════════════════
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WA_VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ════════════════════════════════════════════════════════════════
//  POST /webhook  — Receive Messages
// ════════════════════════════════════════════════════════════════
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // أرسل 200 فوراً لـ Meta

  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;

      const messages = change.value?.messages;
      if (!messages?.length) continue;

      for (const msg of messages) {
        if (msg.type !== 'text') {
          // لو الرسالة مش نص (صوت، صورة) نرد عليها
          await sendMessage(msg.from, 'عذراً، أرسل رداً نصياً فقط 😊');
          continue;
        }
        await handleMessage(msg.from, msg.text.body.trim());
      }
    }
  }
});

// ════════════════════════════════════════════════════════════════
//  HANDLE MESSAGE — State Machine
// ════════════════════════════════════════════════════════════════
async function handleMessage(phone, text) {
  let session = sessions.get(phone);

  // لو مفيش session ومحتاج نبدأ محادثة جديدة
  // الرسالة الأولى بتيجي من الموقع وفيها "أنا مهتم بطلب:"
  if (!session) {
    if (text.includes('أنا مهتم بطلب:')) {
      // استخرج اسم المنتج والسعر من الرسالة
      const productMatch = text.match(/المنتج: (.+)/);
      const priceMatch   = text.match(/السعر: ([\d.]+)/);
      const product = productMatch ? productMatch[1].trim() : 'غير محدد';
      const price   = priceMatch   ? parseFloat(priceMatch[1]) : 0;

      session = {
        phone,
        step: STEPS.NAME,
        product,
        price,
        order_id: `ORD-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      sessions.set(phone, session);

      await sendMessage(phone,
        `أهلاً بك في متجرنا! 🛍️\n\nاستلمنا طلبك على:\n📦 *${product}*\n💰 السعر: ${price} جنيه\n\n` +
        `لإتمام الطلب، نحتاج بعض البيانات:\n\n👤 ما اسمك الكريم؟`
      );
    } else {
      await sendMessage(phone,
        'مرحباً! 👋\nزور موقعنا واختر منتجك وسيبدأ الطلب تلقائياً.\n\n🌐 [رابط الموقع]'
      );
    }
    return;
  }

  // معالجة كل خطوة
  switch (session.step) {

    case STEPS.NAME:
      if (text.length < 2) {
        await sendMessage(phone, '⚠️ يرجى إدخال اسم صحيح (حرفين على الأقل)');
        return;
      }
      session.name = text;
      session.step = STEPS.PHONE;
      sessions.set(phone, session);
      await sendMessage(phone, `شكراً ${text}! 😊\n\n📱 ما رقم هاتفك للتواصل؟ (مثال: 01012345678)`);
      break;

    case STEPS.PHONE:
      // تحقق من رقم مصري
      const cleanPhone = text.replace(/\s|-/g, '');
      if (!/^(\+20|0020|0)?1[0125]\d{8}$/.test(cleanPhone)) {
        await sendMessage(phone, '⚠️ يرجى إدخال رقم هاتف مصري صحيح\nمثال: 01012345678');
        return;
      }
      session.customer_phone = cleanPhone;
      session.step = STEPS.QUANTITY;
      sessions.set(phone, session);
      await sendMessage(phone, `✅ تم تسجيل رقمك.\n\n🔢 كم الكمية المطلوبة من *${session.product}*؟`);
      break;

    case STEPS.QUANTITY:
      const qty = parseInt(text);
      if (isNaN(qty) || qty < 1 || qty > 100) {
        await sendMessage(phone, '⚠️ يرجى إدخال كمية صحيحة (رقم بين 1 و 100)');
        return;
      }
      session.quantity = qty;
      session.total_price = session.price * qty;
      session.step = STEPS.ADDRESS;
      sessions.set(phone, session);
      await sendMessage(phone, `🛒 ممتاز! ${qty} قطعة بإجمالي *${session.total_price} جنيه*\n\n📍 ما عنوانك التفصيلي للتوصيل؟\n(المحافظة - الحي - الشارع)`);
      break;

    case STEPS.ADDRESS:
      if (text.length < 10) {
        await sendMessage(phone, '⚠️ يرجى إدخال عنوان تفصيلي أكثر (10 أحرف على الأقل)');
        return;
      }
      session.address = text;
      session.step = STEPS.NOTES;
      sessions.set(phone, session);
      await sendMessage(phone, `📝 هل لديك أي ملاحظات إضافية على الطلب؟\n(لون، مقاس، أي تفضيل...)\n\nأو اكتب "لا" إذا لم يكن لديك ملاحظات`);
      break;

    case STEPS.NOTES:
      session.notes = text.toLowerCase() === 'لا' ? '' : text;
      session.step = STEPS.DONE;
      sessions.set(phone, session);

      // ── أرسل ملخص الطلب ──
      const summary = `
✅ *تم تأكيد طلبك!*

📋 *ملخص الطلب:*
━━━━━━━━━━━━━━━━━
🆔 رقم الطلب: ${session.order_id}
👤 الاسم: ${session.name}
📱 الهاتف: ${session.customer_phone}
📦 المنتج: ${session.product}
🔢 الكمية: ${session.quantity}
💰 الإجمالي: ${session.total_price} جنيه
📍 العنوان: ${session.address}
📝 ملاحظات: ${session.notes || 'لا توجد'}
━━━━━━━━━━━━━━━━━
سيتواصل معك فريقنا خلال 24 ساعة لتأكيد الموعد 🚀

شكراً لثقتك في متجرنا! 🛍️❤️
      `.trim();

      await sendMessage(phone, summary);

      // ── حفظ الطلب ──
      await saveOrder(session);

      // امسح الـ session بعد 5 دقائق
      setTimeout(() => sessions.delete(phone), 5 * 60 * 1000);
      break;

    case STEPS.DONE:
      // إذا كتب العميل رسالة بعد اكتمال الطلب
      if (text.includes('طلب جديد') || text.includes('أنا مهتم')) {
        sessions.delete(phone);
        await handleMessage(phone, text); // أعد من البداية
      } else {
        await sendMessage(phone,
          `طلبك قيد المعالجة! 🔄\nرقم طلبك: *${session.order_id}*\n\nللطلب مرة أخرى زور موقعنا. شكراً! 😊`
        );
      }
      break;
  }
}

// ════════════════════════════════════════════════════════════════
//  SEND WHATSAPP MESSAGE
// ════════════════════════════════════════════════════════════════
async function sendMessage(to, text) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${WA_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text, preview_url: false },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) console.error('❌ WhatsApp Error:', data);
    return data;
  } catch (err) {
    console.error('❌ sendMessage error:', err);
  }
}

// ════════════════════════════════════════════════════════════════
//  SAVE ORDER TO SUPABASE + GOOGLE SHEETS
// ════════════════════════════════════════════════════════════════
async function saveOrder(session) {
  const order = {
    order_id:      session.order_id,
    date:          new Date().toLocaleString('ar-EG'),
    customer_name: session.name,
    phone:         session.customer_phone,
    product_name:  session.product,
    price:         session.price,
    quantity:      session.quantity,
    total_price:   session.total_price,
    address:       session.address,
    notes:         session.notes || '',
    status:        'pending',
    source:        'whatsapp_bot',
  };

  // 1️⃣ حفظ في Supabase
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(order),
    });
    if (res.ok) console.log('✅ Order saved to Supabase');
    else console.error('❌ Supabase error:', await res.text());
  } catch (e) {
    console.error('❌ Supabase save error:', e);
  }

  // 2️⃣ إرسال لـ Google Sheets
  try {
    await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'new_order', ...order }),
    });
    console.log('✅ Order sent to Google Sheets');
  } catch (e) {
    console.error('❌ Sheets error:', e);
  }
}

// ════════════════════════════════════════════════════════════════
//  START SERVER
// ════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Bot running on port ${PORT}`));

module.exports = app; // for Vercel