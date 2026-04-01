/* ═══════════════════════════════════════════
   data.js — Shared state, config & utilities
   ✅ Categories dynamic  ✅ Customers in Supabase
═══════════════════════════════════════════ */

const CONFIG = {
  supabaseUrl: localStorage.getItem('supabase_url') || 'https://ijpdwjmevzxihziuxgmw.supabase.co',
  supabaseKey: localStorage.getItem('supabase_key') || 'sb_publishable_0L2vAQMsVxi1aYEmGTalxQ_iMZ3jnsz',
  waNumber:    localStorage.getItem('wa_number')    || '',
  sheetsUrl:   localStorage.getItem('sheets_url')   || 'https://script.google.com/macros/s/AKfycbzmJgm3GXKbMV65yeX5YWAxprnNg0uoheEMCHUr6J7SKgTssBX9MvKpStWNkaDHwz9J/exec',
};

/* ── Default categories (fallback لو Supabase مش متاح) ── */
const DEFAULT_CATEGORIES = [
  { key:'kitchen',  name:'أدوات مطبخ',     icon:'🍳', color:'gold',   enabled:true },
  { key:'kids',     name:'مستلزمات أطفال', icon:'🧸', color:'blue',   enabled:true },
  { key:'electric', name:'أدوات كهربائية', icon:'⚡', color:'green',  enabled:true },
  { key:'phones',   name:'مستلزمات هواتف',icon:'📱', color:'purple', enabled:true },
  { key:'decor',    name:'ديكور',           icon:'🏺', color:'red',    enabled:true },
];

/* ── CATEGORIES helpers ── */
function getCategories() {
  const raw = localStorage.getItem('categories');
  return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
}
function saveCategories(list) {
  localStorage.setItem('categories', JSON.stringify(list));
}
function getEnabledCategories() {
  return getCategories().filter(c => c.enabled);
}

/* ── CATEGORIES object (backward compat) ── */
const CATEGORIES = Object.fromEntries(
  DEFAULT_CATEGORIES.map(c => [c.key, { name: c.name, icon: c.icon, color: c.color }])
);

const DEFAULT_PRODUCTS = [
  { id:1,  name:'طاسة ضغط 10 لتر',     cat:'kitchen',  price:299, img:'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=400&fit=crop', badge:'new',  description:'طاسة ضغط عالية الجودة' },
  { id:2,  name:'طقم سكاكين 6 قطع',    cat:'kitchen',  price:149, img:'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400&h=400&fit=crop', badge:'',    description:'طقم سكاكين ستانلس ستيل' },
  { id:3,  name:'مسطرة فرن غير لاصقة', cat:'kitchen',  price:89,  img:'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop', badge:'sale', description:'مسطرة فرن مقاس 30×40' },
  { id:4,  name:'كرسي أطفال قابل للطي',cat:'kids',     price:199, img:'https://images.unsplash.com/photo-1566996533071-2c578080c06e?w=400&h=400&fit=crop', badge:'new',  description:'كرسي متعدد الاستخدامات' },
  { id:5,  name:'مجموعة ألعاب تعليمية',cat:'kids',     price:120, img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', badge:'',    description:'ألعاب تعليمية 3-8 سنوات' },
  { id:6,  name:'شاحن سريع 65W',        cat:'electric', price:249, img:'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop', badge:'new',  description:'شاحن USB-C سريع 65 واط' },
  { id:7,  name:'مروحة USB صغيرة',      cat:'electric', price:79,  img:'https://images.unsplash.com/photo-1563291074-2bf8677ac0e5?w=400&h=400&fit=crop', badge:'',    description:'مروحة USB للمكتب أو السيارة' },
  { id:8,  name:'كفر موبايل iPhone 15', cat:'phones',   price:69,  img:'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop', badge:'',    description:'كفر حماية عالية الجودة' },
  { id:9,  name:'سماعة بلوتوث TWS',     cat:'phones',   price:189, img:'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop', badge:'sale', description:'سماعة لاسلكية صوت نقي' },
  { id:10, name:'إطار صور خشبي',        cat:'decor',    price:45,  img:'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&h=400&fit=crop', badge:'',    description:'إطار خشبي مقاس 20×30' },
  { id:11, name:'شمعة عطرية فاخرة',     cat:'decor',    price:99,  img:'https://images.unsplash.com/photo-1602178566655-8d1a2e0ef8e5?w=400&h=400&fit=crop', badge:'new',  description:'شمعة عطرية تدوم 50 ساعة' },
];

/* ── PRODUCTS helpers ── */
function getProducts() {
  return JSON.parse(localStorage.getItem('products') || 'null') || DEFAULT_PRODUCTS;
}
function saveProducts(list) { localStorage.setItem('products', JSON.stringify(list)); }

/* ── بيرجع بس المنتجات اللي تصنيفها enabled ── */
function getVisibleProducts() {
  const enabledKeys = new Set(getEnabledCategories().map(c => c.key));
  return getProducts().filter(p => enabledKeys.has(p.cat));
}

function getOrders() { return JSON.parse(localStorage.getItem('orders') || '[]'); }
function saveOrders(list) { localStorage.setItem('orders', JSON.stringify(list)); }

/* ════════════════════════════════════════════
   CUSTOMERS — Supabase
════════════════════════════════════════════ */
async function getCustomerByPhone(phone) {
  if (!phone) return null;
  const sb = supaClient();
  if (!sb) return null;
  try {
    const rows = await sb.from('customers').selectWhere('phone', phone);
    return rows && rows[0] ? rows[0] : null;
  } catch(e) { return null; }
}

async function upsertCustomer(phone, data) {
  if (!phone) return null;
  const sb = supaClient();
  if (!sb) return null;
  try {
    const existing = await getCustomerByPhone(phone);
    if (existing) {
      /* تحديث البيانات الموجودة بدون ما تمسح الفاضية */
      const update = {};
      if (data.name    && data.name    !== existing.name)    update.name    = data.name;
      if (data.address && data.address !== existing.address) update.address = data.address;
      update.last_seen = new Date().toISOString();
      update.order_count = (existing.order_count || 0) + 1;
      if (Object.keys(update).length) {
        await sb.from('customers').update(update).eq('phone', phone);
      }
      return { ...existing, ...update };
    } else {
      const newCustomer = {
        phone,
        name:        data.name    || '',
        address:     data.address || '',
        order_count: 1,
        last_seen:   new Date().toISOString(),
        created_at:  new Date().toISOString(),
      };
      await sb.from('customers').insert(newCustomer);
      return newCustomer;
    }
  } catch(e) { console.warn('upsertCustomer error:', e); return null; }
}

/* ════════════════════════════════════════════
   SUPABASE CLIENT
════════════════════════════════════════════ */
function supaClient() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) return null;
  const h = {
    'apikey':        CONFIG.supabaseKey,
    'Authorization': 'Bearer ' + CONFIG.supabaseKey,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };
  const base = CONFIG.supabaseUrl + '/rest/v1';
  return {
    from: (t) => ({
      select:      ()    => fetch(`${base}/${t}?select=*`, { headers: h }).then(r => r.json()),
      selectWhere: (col, val) => fetch(`${base}/${t}?${col}=eq.${encodeURIComponent(val)}&select=*`, { headers: h }).then(r => r.json()),
      insert:      (d)   => fetch(`${base}/${t}`, { method:'POST', headers:h, body:JSON.stringify(d) }).then(r => r.json()),
      update:      (d)   => ({ eq: (c,v) => fetch(`${base}/${t}?${c}=eq.${encodeURIComponent(v)}`, { method:'PATCH', headers:h, body:JSON.stringify(d) }).then(r => r.json()) }),
      delete:      ()    => ({ eq: (c,v) => fetch(`${base}/${t}?${c}=eq.${encodeURIComponent(v)}`, { method:'DELETE', headers:h }) }),
    })
  };
}

/* ════════════════════════════════════════════
   GOOGLE SHEETS
════════════════════════════════════════════ */
async function sendToSheets(data) {
  const url = CONFIG.sheetsUrl;
  if (!url) return;
  try {
    await fetch(url, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
  } catch(e) { console.warn('Sheets send failed:', e); }
}

/* ════════════════════════════════════════════
   WHATSAPP ORDER
════════════════════════════════════════════ */
function openWhatsApp(product) {
  const msg = encodeURIComponent(
    `مرحباً! أنا مهتم بطلب:\n\n` +
    `📦 المنتج: ${product.name}\n` +
    `💰 السعر: ${product.price} جنيه\n\n` +
    `هل المنتج متاح؟`
  );
  const num = CONFIG.waNumber.replace(/\D/g, '');
  window.open(`https://wa.me/${num}?text=${msg}`, '_blank');

  const orderId   = 'ORD-' + Date.now();
  const orderData = {
    type:          'new_order',
    order_id:      orderId,
    date:          new Date().toLocaleString('ar-EG'),
    customer_name: 'عميل واتساب',
    phone:         '',
    product_name:  product.name,
    cat:           product.cat   || '',
    price:         product.price || 0,
    quantity:      1,
    total_price:   product.price || 0,
    address:       '',
    notes:         '',
    status:        'pending',
    source:        'whatsapp',
  };

  const orders = getOrders();
  orders.unshift(orderData);
  saveOrders(orders);
  sendToSheets(orderData);
}

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */
let _toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('global-toast');
  if (!el) return;
  el.querySelector('.toast-msg').textContent = msg;
  el.querySelector('.toast-icon').textContent = type === 'success' ? '✅' : '⚠️';
  el.className = `g-toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}