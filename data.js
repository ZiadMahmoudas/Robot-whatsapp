/* ═══════════════════════════════════════════
   data.js — Shared state, config & utilities
═══════════════════════════════════════════ */

const CONFIG = {
  supabaseUrl: localStorage.getItem('supabase_url') || 'https://ijpdwjmevzxihziuxgmw.supabase.co',
  supabaseKey: localStorage.getItem('supabase_key') || 'sb_publishable_0L2vAQMsVxi1aYEmGTalxQ_iMZ3jnsz',
  waNumber:    localStorage.getItem('wa_number')    || '2011001348520',
  sheetsUrl:   localStorage.getItem('sheets_url')   || '',
};

const CATEGORIES = {
  kitchen:  { name: 'أدوات مطبخ',       icon: '🍳', color: 'gold'   },
  kids:     { name: 'مستلزمات أطفال',   icon: '🧸', color: 'blue'   },
  electric: { name: 'أدوات كهربائية',   icon: '⚡', color: 'green'  },
  phones:   { name: 'مستلزمات هواتف',  icon: '📱', color: 'purple' },
  decor:    { name: 'ديكور',             icon: '🏺', color: 'red'    },
};

const DEFAULT_PRODUCTS = [
  { id:1, name:'طاسة ضغط 10 لتر',    cat:'kitchen',  price:299, img:'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=400&fit=crop', badge:'new',  description:'طاسة ضغط عالية الجودة' },
  { id:2, name:'طقم سكاكين 6 قطع',   cat:'kitchen',  price:149, img:'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400&h=400&fit=crop', badge:'',    description:'طقم سكاكين ستانلس ستيل' },
  { id:3, name:'مسطرة فرن غير لاصقة',cat:'kitchen',  price:89,  img:'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop', badge:'sale', description:'مسطرة فرن مقاس 30×40' },
  { id:4, name:'كرسي أطفال قابل للطي',cat:'kids',     price:199, img:'https://images.unsplash.com/photo-1566996533071-2c578080c06e?w=400&h=400&fit=crop', badge:'new',  description:'كرسي متعدد الاستخدامات' },
  { id:5, name:'مجموعة ألعاب تعليمية',cat:'kids',     price:120, img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', badge:'',    description:'ألعاب تعليمية 3-8 سنوات' },
  { id:6, name:'شاحن سريع 65W',       cat:'electric', price:249, img:'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400&h=400&fit=crop', badge:'new',  description:'شاحن USB-C سريع 65 واط' },
  { id:7, name:'مروحة USB صغيرة',     cat:'electric', price:79,  img:'https://images.unsplash.com/photo-1563291074-2bf8677ac0e5?w=400&h=400&fit=crop', badge:'',    description:'مروحة USB للمكتب أو السيارة' },
  { id:8, name:'كفر موبايل iPhone 15',cat:'phones',   price:69,  img:'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop', badge:'',    description:'كفر حماية عالية الجودة' },
  { id:9, name:'سماعة بلوتوث TWS',    cat:'phones',   price:189, img:'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop', badge:'sale', description:'سماعة لاسلكية صوت نقي' },
  { id:10,name:'إطار صور خشبي',       cat:'decor',    price:45,  img:'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&h=400&fit=crop', badge:'',    description:'إطار خشبي مقاس 20×30' },
  { id:11,name:'شمعة عطرية فاخرة',    cat:'decor',    price:99,  img:'https://images.unsplash.com/photo-1602178566655-8d1a2e0ef8e5?w=400&h=400&fit=crop', badge:'new',  description:'شمعة عطرية تدوم 50 ساعة' },
];

/* ── Local storage helpers ── */
function getProducts() {
  return JSON.parse(localStorage.getItem('products') || 'null') || DEFAULT_PRODUCTS;
}
function saveProducts(list) {
  localStorage.setItem('products', JSON.stringify(list));
}
function getOrders() {
  return JSON.parse(localStorage.getItem('orders') || '[]');
}
function saveOrders(list) {
  localStorage.setItem('orders', JSON.stringify(list));
}

/* ── Supabase minimal client ── */
function supaClient() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) return null;
  const h = { 'apikey': CONFIG.supabaseKey, 'Authorization': 'Bearer ' + CONFIG.supabaseKey, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
  return {
    from: (t) => ({
      select: () => fetch(`${CONFIG.supabaseUrl}/rest/v1/${t}?select=*`, { headers: h }).then(r => r.json()),
      insert: (d) => fetch(`${CONFIG.supabaseUrl}/rest/v1/${t}`, { method:'POST', headers:h, body:JSON.stringify(d) }).then(r=>r.json()),
      update: (d) => ({ eq: (c,v) => fetch(`${CONFIG.supabaseUrl}/rest/v1/${t}?${c}=eq.${v}`, { method:'PATCH', headers:h, body:JSON.stringify(d) }).then(r=>r.json()) }),
      delete: ()  => ({ eq: (c,v) => fetch(`${CONFIG.supabaseUrl}/rest/v1/${t}?${c}=eq.${v}`, { method:'DELETE', headers:h }) }),
    })
  };
}

/* ── Google Sheets ── */
async function sendToSheets(data) {
  const url = CONFIG.sheetsUrl || localStorage.getItem('sheets_url');
  if (!url) return;
  try { await fetch(url, { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); } catch(e) {}
}

/* ── WhatsApp order ── */
function openWhatsApp(product) {
  const msg = encodeURIComponent(`مرحباً! أنا مهتم بطلب:\n\n📦 المنتج: ${product.name}\n💰 السعر: ${product.price} جنيه\n\nهل المنتج متاح؟`);
  const num = CONFIG.waNumber.replace(/\D/g,'');
  window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
}

/* ── Toast ── */
let _toastTimer;
function showToast(msg, type = 'success') {
  let el = document.getElementById('global-toast');
  if (!el) return;
  el.querySelector('.toast-msg').textContent = msg;
  el.querySelector('.toast-icon').textContent = type === 'success' ? '✅' : '⚠️';
  el.className = `g-toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}