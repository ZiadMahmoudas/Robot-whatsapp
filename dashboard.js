/* ═══════════════════════════════════════════
   dashboard.js — Admin panel logic
   ✅ Dynamic categories  ✅ Customers (Supabase)
═══════════════════════════════════════════ */

let products  = getProducts();
let orders    = getOrders();
let editingId = null;

const SECTION_TITLES = {
  overview:       'نظرة عامة',
  products:       'إدارة المنتجات',
  'add-product':  'إضافة منتج',
  orders:         'إدارة الطلبات',
  categories:     'إدارة التصنيفات',
  customers:      'العملاء',
  settings:       'الإعدادات',
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
  if (name === 'categories')  renderCategoriesSection();
  if (name === 'customers')   renderCustomers();
  if (name === 'add-product' && !editingId) clearProductForm();
  if (name === 'settings')    loadSettings();
}

/* ── Sidebar toggle ── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
document.addEventListener('click', e => {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.querySelector('.sidebar-toggle');
  if (toggle && !sidebar.contains(e.target) && !toggle.contains(e.target))
    sidebar.classList.remove('open');
});

/* ════════════════════════════════════════════
   OVERVIEW
════════════════════════════════════════════ */
function renderOverview() {
  const pending = orders.filter(o => o.status === 'pending').length;
  document.getElementById('sv-orders').textContent   = orders.length;
  document.getElementById('sv-done').textContent     = orders.filter(o => o.status === 'done').length;
  document.getElementById('sv-products').textContent = products.length;
  document.getElementById('sv-pending').textContent  = pending;

  const badge = document.getElementById('pending-badge');
  if (pending > 0) { badge.style.display = ''; badge.textContent = pending; }
  else badge.style.display = 'none';

  const body   = document.getElementById('recent-orders-body');
  const recent = [...orders].reverse().slice(0, 6);
  if (!recent.length) {
    body.innerHTML = `<tr><td colspan="5" class="table-empty"><span class="te-icon">🛒</span>لا توجد طلبات بعد</td></tr>`;
    return;
  }
  body.innerHTML = recent.map(o => `
    <tr>
      <td style="font-family:monospace;color:var(--text3);font-size:11px;">#${String(o.id||o.order_id||'').slice(-6)}</td>
      <td style="font-weight:700;">${o.customer_name||'—'}</td>
      <td style="color:var(--text2);">${o.product_name||'—'}</td>
      <td style="color:var(--gold);font-weight:700;">${o.total_price||0} جنيه</td>
      <td>${statusBadge(o.status)}</td>
    </tr>
  `).join('');
}

/* ════════════════════════════════════════════
   CATEGORIES
════════════════════════════════════════════ */
function renderCategoriesSection() {
  const cats = getCategories();
  const body = document.getElementById('categories-list');
  if (!body) return;

  body.innerHTML = cats.map((c, idx) => `
    <div class="cat-row" id="cat-row-${c.key}">
      <div class="cat-row-info">
        <span class="cat-icon">${c.icon}</span>
        <div>
          <div class="cat-name">${c.name}</div>
          <div class="cat-meta">${c.key} — ${products.filter(p=>p.cat===c.key).length} منتج</div>
        </div>
      </div>
      <div class="cat-row-actions">
        <!-- Toggle enable/disable -->
        <label class="toggle-wrap" title="${c.enabled ? 'إيقاف التصنيف' : 'تفعيل التصنيف'}">
          <input type="checkbox" ${c.enabled ? 'checked' : ''} onchange="toggleCategory('${c.key}', this.checked)">
          <span class="toggle-track"><span class="toggle-thumb"></span></span>
          <span class="toggle-label">${c.enabled ? 'مفعّل' : 'موقوف'}</span>
        </label>
        <button class="action-btn" onclick="openEditCatModal('${c.key}')">✏️ تعديل</button>
        <button class="action-btn danger" onclick="deleteCategory('${c.key}')">🗑️</button>
      </div>
    </div>
  `).join('');

  /* عداد فوق */
  const activeCount = cats.filter(c => c.enabled).length;
  const el = document.getElementById('cats-active-count');
  if (el) el.textContent = activeCount + ' / ' + cats.length + ' مفعّل';
}

function toggleCategory(key, enabled) {
  const cats = getCategories();
  const cat  = cats.find(c => c.key === key);
  if (!cat) return;
  cat.enabled = enabled;
  saveCategories(cats);

  /* تحديث الـ label */
  const row = document.getElementById('cat-row-' + key);
  if (row) {
    const label = row.querySelector('.toggle-label');
    if (label) label.textContent = enabled ? 'مفعّل' : 'موقوف';
  }

  const el = document.getElementById('cats-active-count');
  if (el) {
    const allCats    = getCategories();
    const activeCount = allCats.filter(c => c.enabled).length;
    el.textContent   = activeCount + ' / ' + allCats.length + ' مفعّل';
  }

  showToast(enabled ? `✅ تم تفعيل "${cat.name}"` : `⏸️ تم إيقاف "${cat.name}" — المنتجات مخفية`, 'success');
}

function deleteCategory(key) {
  const cats    = getCategories();
  const cat     = cats.find(c => c.key === key);
  const prodCnt = products.filter(p => p.cat === key).length;
  if (!cat) return;

  const msg = prodCnt > 0
    ? `هل تريد حذف تصنيف "${cat.name}"؟\n⚠️ يوجد ${prodCnt} منتج في هذا التصنيف — المنتجات لن تُحذف لكنها ستُخفى.`
    : `هل تريد حذف تصنيف "${cat.name}"؟`;

  if (!confirm(msg)) return;
  saveCategories(cats.filter(c => c.key !== key));
  renderCategoriesSection();
  showToast(`🗑️ تم حذف التصنيف "${cat.name}"`, 'success');
}

/* ── Add Category modal ── */
function openAddCatModal() {
  document.getElementById('cat-modal-title').textContent = 'إضافة تصنيف جديد';
  document.getElementById('cat-key-wrap').style.display  = '';
  document.getElementById('cm-key').value   = '';
  document.getElementById('cm-name').value  = '';
  document.getElementById('cm-icon').value  = '';
  document.getElementById('cm-color').value = 'gold';
  document.getElementById('cm-edit-key').value = '';
  document.getElementById('cat-modal').classList.add('open');
}

function openEditCatModal(key) {
  const cat = getCategories().find(c => c.key === key);
  if (!cat) return;
  document.getElementById('cat-modal-title').textContent = 'تعديل التصنيف';
  document.getElementById('cat-key-wrap').style.display  = 'none';
  document.getElementById('cm-name').value   = cat.name;
  document.getElementById('cm-icon').value   = cat.icon;
  document.getElementById('cm-color').value  = cat.color || 'gold';
  document.getElementById('cm-edit-key').value = key;
  document.getElementById('cat-modal').classList.add('open');
}

function saveCategoryModal() {
  const editKey = document.getElementById('cm-edit-key').value.trim();
  const name    = document.getElementById('cm-name').value.trim();
  const icon    = document.getElementById('cm-icon').value.trim() || '📦';
  const color   = document.getElementById('cm-color').value;

  if (!name) { showToast('⚠️ أدخل اسم التصنيف', 'error'); return; }

  const cats = getCategories();

  if (editKey) {
    /* تعديل */
    const cat = cats.find(c => c.key === editKey);
    if (cat) { cat.name = name; cat.icon = icon; cat.color = color; }
  } else {
    /* إضافة جديد */
    const key = document.getElementById('cm-key').value.trim()
      .toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!key) { showToast('⚠️ أدخل مفتاح التصنيف (بالإنجليزية)', 'error'); return; }
    if (cats.find(c => c.key === key)) { showToast('⚠️ هذا المفتاح موجود بالفعل', 'error'); return; }
    cats.push({ key, name, icon, color, enabled: true });

    /* أضف الـ key للـ select في فورم المنتج */
    refreshCatSelects();
  }

  saveCategories(cats);
  closeModal('cat-modal');
  renderCategoriesSection();
  refreshCatSelects();
  showToast('✅ تم حفظ التصنيف', 'success');
}

/* تحديث كل الـ select المتعلقة بالتصنيفات */
function refreshCatSelects() {
  const cats = getCategories();
  const opts = cats.map(c => `<option value="${c.key}">${c.icon} ${c.name}</option>`).join('');

  ['p-cat', 'products-cat-filter'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const prev = el.value;
    if (id === 'products-cat-filter') {
      el.innerHTML = '<option value="">كل الأقسام</option>' + opts;
    } else {
      el.innerHTML = opts;
    }
    el.value = prev;
  });
}

/* ════════════════════════════════════════════
   CUSTOMERS
════════════════════════════════════════════ */
async function renderCustomers() {
  const body = document.getElementById('customers-table-body');
  if (!body) return;
  body.innerHTML = `<tr><td colspan="6" class="table-empty">⏳ جاري التحميل...</td></tr>`;

  try {
    const sb = supaClient();
    if (!sb) throw new Error('Supabase غير متصل');

    const customers = await sb.from('customers').select();
    if (!customers || customers.length === 0) {
      body.innerHTML = `<tr><td colspan="6" class="table-empty"><span class="te-icon">👤</span>لا يوجد عملاء مسجلين بعد</td></tr>`;
      return;
    }

    body.innerHTML = [...customers]
      .sort((a,b) => new Date(b.last_seen||0) - new Date(a.last_seen||0))
      .map(c => `
        <tr>
          <td style="font-weight:700;">${c.name || '<span style="color:var(--text3)">—</span>'}</td>
          <td style="font-family:monospace;direction:ltr;">${c.phone || '—'}</td>
          <td style="color:var(--text2);font-size:12px;">${c.address || '<span style="color:var(--text3)">غير محدد</span>'}</td>
          <td style="text-align:center;color:var(--gold);font-weight:700;">${c.order_count || 0}</td>
          <td style="font-size:12px;color:var(--text3);">${c.last_seen ? new Date(c.last_seen).toLocaleDateString('ar-EG') : '—'}</td>
          <td>
            <button class="action-btn" onclick="viewCustomerOrders('${c.phone}')">🛒 طلباته</button>
            <button class="action-btn" onclick="openWhatsAppDirect('${c.phone}')">💬 واتساب</button>
          </td>
        </tr>
      `).join('');

    document.getElementById('sv-customers').textContent = customers.length;
  } catch(e) {
    body.innerHTML = `<tr><td colspan="6" class="table-empty">❌ ${e.message}</td></tr>`;
  }
}

function openWhatsAppDirect(phone) {
  if (!phone) return;
  window.open(`https://wa.me/${phone.replace(/\D/g,'')}`, '_blank');
}

function viewCustomerOrders(phone) {
  const customerOrders = orders.filter(o => o.phone === phone);
  const name = customerOrders[0]?.customer_name || phone;

  document.getElementById('order-modal-num').textContent = `— ${name}`;
  if (!customerOrders.length) {
    document.getElementById('order-modal-content').innerHTML =
      '<p style="color:var(--text3);text-align:center;padding:24px">لا توجد طلبات مسجلة لهذا العميل</p>';
  } else {
    document.getElementById('order-modal-content').innerHTML = `
      <table class="data-table" style="margin-top:8px;">
        <thead><tr><th>المنتج</th><th>الإجمالي</th><th>التاريخ</th><th>الحالة</th></tr></thead>
        <tbody>
          ${customerOrders.map(o => `
            <tr>
              <td>${o.product_name||'—'}</td>
              <td style="color:var(--gold);font-weight:700;">${o.total_price||0} جنيه</td>
              <td style="font-size:12px;color:var(--text3);">${o.date||'—'}</td>
              <td>${statusBadge(o.status)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  document.getElementById('order-modal').classList.add('open');
}

/* ════════════════════════════════════════════
   PRODUCTS TABLE
════════════════════════════════════════════ */
function renderProductsTable(filter = '') {
  const allCats = getCategories();
  const list    = filter ? products.filter(p => p.cat === filter) : products;
  const body    = document.getElementById('products-table-body');
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="6" class="table-empty"><span class="te-icon">📦</span>لا توجد منتجات</td></tr>`;
    return;
  }
  body.innerHTML = list.map(p => {
    const cat     = allCats.find(c => c.key === p.cat);
    const catName = cat ? `${cat.icon} ${cat.name}` : p.cat;
    const hidden  = cat && !cat.enabled;
    return `
      <tr style="${hidden ? 'opacity:.45;' : ''}">
        <td>
          <img src="${p.img||''}" alt="${p.name}"
               style="width:44px;height:44px;object-fit:cover;border-radius:8px;background:var(--bg3);"
               onerror="this.style.background='var(--bg3)'">
        </td>
        <td style="font-weight:700;">${p.name} ${hidden ? '<span style="font-size:11px;color:var(--text3)">(مخفي)</span>' : ''}</td>
        <td><span class="status-badge cat-${p.cat}">${catName}</span></td>
        <td style="color:var(--gold);font-weight:700;">${p.price} جنيه</td>
        <td>${p.badge ? `<span class="status-badge ${p.badge}">${p.badge==='new'?'جديد':'خصم'}</span>` : '—'}</td>
        <td>
          <button class="action-btn" onclick="startEditProduct(${p.id})">✏️ تعديل</button>
          <button class="action-btn danger" onclick="deleteProduct(${p.id})">🗑️ حذف</button>
        </td>
      </tr>
    `;
  }).join('');
}

/* ── Save product ── */
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
    const idx = products.findIndex(p => String(p.id) === String(pid));
    if (idx !== -1) {
      products[idx] = { ...products[idx], name, cat, price, img, description: desc, badge };
      saveProducts(products);
      const sb = supaClient();
      if (sb) try { await sb.from('products').update({ name, cat, price, img, description: desc, badge }).eq('id', pid); } catch(e){}
      showToast('✅ تم تحديث المنتج');
    }
  } else {
    const newP = { id: Date.now(), name, cat, price, img, description: desc, badge };
    products.push(newP);
    saveProducts(products);
    const sb = supaClient();
    if (sb) try { await sb.from('products').insert({ name, cat, price, img, description: desc, badge }); } catch(e){}
    await sendToSheets({ type: 'product', action: 'add', ...newP });
    showToast('✅ تمت إضافة المنتج');
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
  if (sb) try { await sb.from('products').delete().eq('id', id); } catch(e){}
  renderProductsTable();
  renderOverview();
  showToast('🗑️ تم حذف المنتج');
}

function clearProductForm() {
  editingId = null;
  document.getElementById('edit-pid').value = '';
  ['p-name','p-price','p-img','p-desc'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const catEl = document.getElementById('p-cat');
  if (catEl) catEl.value = getCategories()[0]?.key || 'kitchen';
  const badgeEl = document.getElementById('p-badge');
  if (badgeEl) badgeEl.value = '';
  document.getElementById('product-form-title').textContent = 'إضافة منتج جديد';
}

/* ════════════════════════════════════════════
   ORDERS TABLE
════════════════════════════════════════════ */
function renderOrdersTable(filter = '') {
  const list = filter ? orders.filter(o => o.status === filter) : orders;
  const body = document.getElementById('orders-table-body');
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="8" class="table-empty"><span class="te-icon">🛒</span>لا توجد طلبات</td></tr>`;
    return;
  }
  body.innerHTML = [...list].reverse().map(o => `
    <tr>
      <td style="font-family:monospace;color:var(--text3);font-size:11px;">#${String(o.id||o.order_id||'').slice(-6)}</td>
      <td style="font-size:12px;color:var(--text2);">${o.date||'—'}</td>
      <td style="font-weight:700;">${o.customer_name||'—'}</td>
      <td style="color:var(--text2);">${o.product_name||'—'}</td>
      <td style="text-align:center;">${o.quantity||1}</td>
      <td style="color:var(--gold);font-weight:700;">${o.total_price||0} جنيه</td>
      <td>
        <select class="form-select" style="padding:5px 8px;font-size:12px;width:140px;"
                onchange="updateOrderStatus(${o.id||0}, this.value)">
          <option value="pending"    ${o.status==='pending'    ?'selected':''}>قيد الانتظار</option>
          <option value="processing" ${o.status==='processing' ?'selected':''}>قيد التجهيز</option>
          <option value="done"       ${o.status==='done'       ?'selected':''}>منجز</option>
          <option value="cancelled"  ${o.status==='cancelled'  ?'selected':''}>ملغي</option>
        </select>
      </td>
      <td>
        <button class="action-btn" onclick="viewOrder(${o.id||0})">👁️</button>
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
  if (sb) try { await sb.from('orders').update({ status }).eq('id', id); } catch(e){}
  await sendToSheets({ type: 'order_update', order_id: id, status });
  renderOverview();
  showToast('✅ تم تحديث حالة الطلب');
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
      ${o.phone ? `<a href="https://wa.me/${o.phone.replace(/\D/g,'')}" target="_blank" class="btn-gold" style="text-decoration:none;">💬 تواصل واتساب</a>` : ''}
      <button class="btn-ghost" onclick="closeModal('order-modal')">إغلاق</button>
    </div>
  `;
  document.getElementById('order-modal').classList.add('open');
}

window.handleBotOrder = function(data) {
  const o = {
    id: Date.now(),
    date: new Date().toLocaleDateString('ar-EG'),
    customer_name: data.name || 'غير محدد',
    phone: data.phone || '',
    product_name: data.product || '',
    quantity: data.quantity || 1,
    total_price: (data.price||0) * (data.quantity||1),
    address: data.address || '',
    notes: data.notes || '',
    status: 'pending',
    source: 'whatsapp',
  };
  orders.push(o);
  saveOrders(orders);
  sendToSheets({ type: 'new_order', ...o });
  if (o.phone) upsertCustomer(o.phone, { name: o.customer_name, address: o.address });
  renderOverview();
  return o;
};

/* ════════════════════════════════════════════
   SETTINGS
════════════════════════════════════════════ */
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
  showToast('✅ تم حفظ الإعدادات');
}

async function testConnection() {
  if (!CONFIG.supabaseUrl) { showToast('⚠️ أدخل Supabase URL أولاً', 'error'); return; }
  try {
    const res = await fetch(CONFIG.supabaseUrl + '/rest/v1/', { headers: { apikey: CONFIG.supabaseKey } });
    res.ok ? showToast('✅ الاتصال ناجح!') : showToast('❌ فشل الاتصال', 'error');
  } catch(e) { showToast('❌ تعذر الاتصال', 'error'); }
}

/* ════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════ */
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
refreshCatSelects();
renderOverview();