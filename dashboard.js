/* ═══════════════════════════════════════════
   dashboard.js — Admin panel logic
═══════════════════════════════════════════ */

let products = getProducts();
let orders   = getOrders();
let editingId = null;

const SECTION_TITLES = {
  overview:    'نظرة عامة',
  products:    'إدارة المنتجات',
  'add-product': 'إضافة منتج',
  orders:      'إدارة الطلبات',
  settings:    'الإعدادات',
};

const CAT_NAMES = {
  kitchen:'أدوات مطبخ', kids:'مستلزمات أطفال',
  electric:'كهربائيات', phones:'موبايلات', decor:'ديكور',
};

/* ── Topbar date ── */
document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

/* ── Section nav ── */
function showSection(name, navEl) {
  document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  if (navEl) navEl.classList.add('active');

  document.getElementById('topbar-title').textContent = SECTION_TITLES[name] || name;

  if (name === 'overview')    renderOverview();
  if (name === 'products')    renderProductsTable();
  if (name === 'orders')      renderOrdersTable();
  if (name === 'add-product' && !editingId) clearProductForm();
  if (name === 'settings')    loadSettings();
}

/* ── Sidebar mobile toggle ── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
document.addEventListener('click', e => {
  const sidebar  = document.getElementById('sidebar');
  const toggle   = document.querySelector('.sidebar-toggle');
  if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

/* ────────────────────────────────────
   OVERVIEW
──────────────────────────────────── */
function renderOverview() {
  const pending = orders.filter(o => o.status === 'pending').length;
  document.getElementById('sv-orders').textContent   = orders.length;
  document.getElementById('sv-done').textContent     = orders.filter(o => o.status === 'done').length;
  document.getElementById('sv-products').textContent = products.length;
  document.getElementById('sv-pending').textContent  = pending;

  /* Pending badge in sidebar */
  const badge = document.getElementById('pending-badge');
  if (pending > 0) { badge.style.display = ''; badge.textContent = pending; }
  else badge.style.display = 'none';

  /* Recent orders */
  const body = document.getElementById('recent-orders-body');
  const recent = [...orders].reverse().slice(0, 6);
  if (!recent.length) {
    body.innerHTML = `<tr><td colspan="5" class="table-empty"><span class="te-icon">🛒</span>لا توجد طلبات بعد</td></tr>`;
    return;
  }
  body.innerHTML = recent.map(o => `
    <tr>
      <td style="font-family:monospace;color:var(--text3);font-size:11px;">#${String(o.id).slice(-6)}</td>
      <td style="font-weight:700;">${o.customer_name || '—'}</td>
      <td style="color:var(--text2);">${o.product_name || '—'}</td>
      <td style="color:var(--gold);font-weight:700;">${o.total_price || 0} جنيه</td>
      <td>${statusBadge(o.status)}</td>
    </tr>
  `).join('');
}

/* ────────────────────────────────────
   PRODUCTS TABLE
──────────────────────────────────── */
function renderProductsTable(filter = '') {
  const list = filter ? products.filter(p => p.cat === filter) : products;
  const body = document.getElementById('products-table-body');
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="5" class="table-empty"><span class="te-icon">📦</span>لا توجد منتجات</td></tr>`;
    return;
  }
  body.innerHTML = list.map(p => `
    <tr>
      <td>
        <img src="${p.img || ''}" alt="${p.name}"
             style="width:44px;height:44px;object-fit:cover;border-radius:8px;background:var(--bg3);"
             onerror="this.style.background='var(--bg3)'">
      </td>
      <td style="font-weight:700;">${p.name}</td>
      <td><span class="status-badge cat-${p.cat}">${CAT_NAMES[p.cat] || p.cat}</span></td>
      <td style="color:var(--gold);font-weight:700;">${p.price} جنيه</td>
      <td>
        <button class="action-btn" onclick="startEditProduct(${p.id})">✏️ تعديل</button>
        <button class="action-btn danger" onclick="deleteProduct(${p.id})">🗑️ حذف</button>
      </td>
    </tr>
  `).join('');
}

/* ── Save (add or update) product ── */
async function saveProduct() {
  const name  = document.getElementById('p-name').value.trim();
  const cat   = document.getElementById('p-cat').value;
  const price = parseFloat(document.getElementById('p-price').value);
  const img   = document.getElementById('p-img').value.trim();
  const desc  = document.getElementById('p-desc').value.trim();
  const badge = document.getElementById('p-badge').value;
  const pid   = document.getElementById('edit-pid').value;

  if (!name || !price) { showToast('⚠️ يرجى ملء الاسم والسعر', 'error'); return; }

  if (pid) {
    /* Update existing */
    const idx = products.findIndex(p => String(p.id) === String(pid));
    if (idx !== -1) {
      products[idx] = { ...products[idx], name, cat, price, img, description: desc, badge };
      saveProducts(products);
      const sb = supaClient();
      if (sb) try { await sb.from('products').update({ name, cat, price, img, description: desc, badge }).eq('id', pid); } catch(e) {}
      showToast('✅ تم تحديث المنتج', 'success');
    }
  } else {
    /* New product */
    const newP = { id: Date.now(), name, cat, price, img, description: desc, badge };
    products.push(newP);
    saveProducts(products);
    const sb = supaClient();
    if (sb) try { await sb.from('products').insert({ name, cat, price, img, description: desc, badge }); } catch(e) {}
    await sendToSheets({ type: 'product', action: 'add', ...newP });
    showToast('✅ تمت إضافة المنتج', 'success');
  }

  editingId = null;
  clearProductForm();
  renderOverview();
}

function startEditProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('edit-pid').value    = id;
  document.getElementById('p-name').value      = p.name;
  document.getElementById('p-cat').value       = p.cat;
  document.getElementById('p-price').value     = p.price;
  document.getElementById('p-img').value       = p.img || '';
  document.getElementById('p-desc').value      = p.description || '';
  document.getElementById('p-badge').value     = p.badge || '';
  document.getElementById('product-form-title').textContent = '✏️ تعديل المنتج';
  showSection('add-product', null);
}

async function deleteProduct(id) {
  if (!confirm('هل تريد حذف هذا المنتج؟')) return;
  products = products.filter(p => p.id !== id);
  saveProducts(products);
  const sb = supaClient();
  if (sb) try { await sb.from('products').delete().eq('id', id); } catch(e) {}
  renderProductsTable();
  renderOverview();
  showToast('🗑️ تم حذف المنتج', 'success');
}

function clearProductForm() {
  editingId = null;
  document.getElementById('edit-pid').value = '';
  ['p-name','p-price','p-img','p-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('p-cat').value   = 'kitchen';
  document.getElementById('p-badge').value = '';
  document.getElementById('product-form-title').textContent = 'إضافة منتج جديد';
}

/* ────────────────────────────────────
   ORDERS TABLE
──────────────────────────────────── */
function renderOrdersTable(filter = '') {
  const list = filter ? orders.filter(o => o.status === filter) : orders;
  const body = document.getElementById('orders-table-body');
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="8" class="table-empty"><span class="te-icon">🛒</span>لا توجد طلبات</td></tr>`;
    return;
  }
  body.innerHTML = [...list].reverse().map(o => `
    <tr>
      <td style="font-family:monospace;color:var(--text3);font-size:11px;">#${String(o.id).slice(-6)}</td>
      <td style="font-size:12px;color:var(--text2);">${o.date || '—'}</td>
      <td style="font-weight:700;">${o.customer_name || '—'}</td>
      <td style="color:var(--text2);">${o.product_name || '—'}</td>
      <td style="text-align:center;">${o.quantity || 1}</td>
      <td style="color:var(--gold);font-weight:700;">${o.total_price || 0} جنيه</td>
      <td>
        <select class="form-select" style="padding:5px 8px;font-size:12px;width:140px;"
                onchange="updateOrderStatus(${o.id}, this.value)">
          <option value="pending"    ${o.status==='pending'    ?'selected':''}>قيد الانتظار</option>
          <option value="processing" ${o.status==='processing' ?'selected':''}>قيد التجهيز</option>
          <option value="done"       ${o.status==='done'       ?'selected':''}>منجز</option>
          <option value="cancelled"  ${o.status==='cancelled'  ?'selected':''}>ملغي</option>
        </select>
      </td>
      <td>
        <button class="action-btn" onclick="viewOrder(${o.id})">👁️</button>
      </td>
    </tr>
  `).join('');
}

async function updateOrderStatus(id, status) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  o.status = status;
  saveOrders(orders);
  const sb = supaClient();
  if (sb) try { await sb.from('orders').update({ status }).eq('id', id); } catch(e) {}
  await sendToSheets({ type: 'order_update', order_id: id, status });
  renderOverview();
  showToast('✅ تم تحديث حالة الطلب', 'success');
}

function viewOrder(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  document.getElementById('order-modal-num').textContent = `#${String(id).slice(-6)}`;
  document.getElementById('order-modal-content').innerHTML = `
    <div class="form-grid">
      <div class="form-group"><div class="form-label">اسم العميل</div><div style="margin-top:6px;font-weight:700;">${o.customer_name||'—'}</div></div>
      <div class="form-group"><div class="form-label">رقم الهاتف</div><div style="margin-top:6px;font-weight:700;">${o.phone||'—'}</div></div>
      <div class="form-group"><div class="form-label">المنتج</div><div style="margin-top:6px;">${o.product_name||'—'}</div></div>
      <div class="form-group"><div class="form-label">الكمية</div><div style="margin-top:6px;">${o.quantity||1}</div></div>
      <div class="form-group"><div class="form-label">الإجمالي</div><div style="margin-top:6px;color:var(--gold);font-weight:700;">${o.total_price||0} جنيه</div></div>
      <div class="form-group"><div class="form-label">التاريخ</div><div style="margin-top:6px;color:var(--text2);">${o.date||'—'}</div></div>
      <div class="form-group full"><div class="form-label">العنوان</div><div style="margin-top:6px;">${o.address||'لم يُحدد'}</div></div>
      <div class="form-group full"><div class="form-label">ملاحظات</div><div style="margin-top:6px;color:var(--text2);">${o.notes||'لا توجد'}</div></div>
      <div class="form-group full"><div class="form-label">الحالة</div><div style="margin-top:8px;">${statusBadge(o.status)}</div></div>
    </div>
    <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">
      ${o.phone ? `<a href="https://wa.me/${o.phone}" target="_blank" class="btn-gold" style="text-decoration:none;">💬 تواصل واتساب</a>` : ''}
      <button class="btn-ghost" onclick="closeModal('order-modal')">إغلاق</button>
    </div>
  `;
  document.getElementById('order-modal').classList.add('open');
}

/* ── Bot webhook handler (external) ── */
window.handleBotOrder = function(data) {
  const o = {
    id: Date.now(),
    date: new Date().toLocaleDateString('ar-EG'),
    customer_name: data.name || 'غير محدد',
    phone: data.phone || '',
    product_name: data.product || '',
    quantity: data.quantity || 1,
    total_price: (data.price || 0) * (data.quantity || 1),
    address: data.address || '',
    notes: data.notes || '',
    status: 'pending',
    source: 'whatsapp',
  };
  orders.push(o);
  saveOrders(orders);
  sendToSheets({ type: 'new_order', ...o });
  renderOverview();
  return o;
};

/* ────────────────────────────────────
   SETTINGS
──────────────────────────────────── */
function loadSettings() {
  document.getElementById('cfg-url').value    = CONFIG.supabaseUrl;
  document.getElementById('cfg-key').value    = CONFIG.supabaseKey;
  document.getElementById('cfg-wa').value     = CONFIG.waNumber;
  document.getElementById('cfg-sheets').value = CONFIG.sheetsUrl;
}

function saveSettings() {
  CONFIG.supabaseUrl = document.getElementById('cfg-url').value.trim();
  CONFIG.supabaseKey = document.getElementById('cfg-key').value.trim();
  CONFIG.waNumber    = document.getElementById('cfg-wa').value.trim();
  CONFIG.sheetsUrl   = document.getElementById('cfg-sheets').value.trim();
  localStorage.setItem('supabase_url', CONFIG.supabaseUrl);
  localStorage.setItem('supabase_key', CONFIG.supabaseKey);
  localStorage.setItem('wa_number',    CONFIG.waNumber);
  localStorage.setItem('sheets_url',   CONFIG.sheetsUrl);
  showToast('✅ تم حفظ الإعدادات', 'success');
}

async function testConnection() {
  if (!CONFIG.supabaseUrl) { showToast('⚠️ أدخل Supabase URL أولاً', 'error'); return; }
  try {
    const res = await fetch(CONFIG.supabaseUrl + '/rest/v1/', { headers: { apikey: CONFIG.supabaseKey } });
    res.ok ? showToast('✅ الاتصال ناجح!', 'success') : showToast('❌ فشل الاتصال', 'error');
  } catch(e) { showToast('❌ تعذر الاتصال', 'error'); }
}

/* ────────────────────────────────────
   HELPERS
──────────────────────────────────── */
function statusBadge(s) {
  const map = { pending:'قيد الانتظار', processing:'قيد التجهيز', done:'منجز', cancelled:'ملغي' };
  return `<span class="status-badge ${s}">${map[s]||s}</span>`;
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

/* ── Init ── */
renderOverview();