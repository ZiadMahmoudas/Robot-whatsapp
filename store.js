(function () {
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const fa = document.createElement("link");
    fa.rel = "stylesheet";
    fa.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css";
    document.head.appendChild(fa);
  }
})();

/* ── Products ── */
let products = getProducts();

/* ────────────────────────────────────
   PLACEHOLDER IMAGE
──────────────────────────────────── */
function placeholderImg(name) {
  return `https://via.placeholder.com/400x400/161624/f0c040?text=${encodeURIComponent(name)}`;
}

/* ────────────────────────────────────
   RENDER PRODUCT GRIDS
──────────────────────────────────── */
function renderGrid(catKey) {
  const grid = document.getElementById("grid-" + catKey);
  if (!grid) return;

  const list = products.filter((p) => p.cat === catKey);

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="e-icon"><i class="fa-solid fa-box-open"></i></span>
        <h3>لا توجد منتجات في هذا القسم بعد</h3>
        <p>يمكنك إضافة منتجات من لوحة التحكم</p>
      </div>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (p) => `
    <div class="product-card" onclick="handleOrder(${p.id})">
      <div class="product-img-wrap">
        <img src="${p.img || placeholderImg(p.name)}" alt="${p.name}" loading="lazy"
             onerror="this.src='${placeholderImg(p.name)}'">
        ${p.badge ? `<div class="product-badge ${p.badge}">${p.badge === "new" ? "جديد" : "خصم"}</div>` : ""}
        <div class="product-overlay">
          <button class="overlay-btn">
            <i class="fa-brands fa-whatsapp"></i> اطلب الآن
          </button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-footer">
          <div class="product-price">${p.price}<span> جنيه</span></div>
          <button class="order-btn" onclick="event.stopPropagation();handleOrder(${p.id})">
            اطلب
          </button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

/* ────────────────────────────────────
   ORDER HANDLER
──────────────────────────────────── */
function handleOrder(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  openWhatsApp(p);
  showToast("تم فتح واتساب!", "success");
}

/* ────────────────────────────────────
   CATEGORY COUNTS
──────────────────────────────────── */
function updateCounts() {
  ["kitchen", "kids", "electric", "phones", "decor"].forEach((cat) => {
    const el = document.getElementById("cnt-" + cat);
    if (el)
      el.textContent = products.filter((p) => p.cat === cat).length + " منتج";
  });
}

/* ────────────────────────────────────
   INIT ALL GRIDS
──────────────────────────────────── */
function initGrids() {
  ["kitchen", "kids", "electric", "phones", "decor"].forEach(renderGrid);
  updateCounts();
}

/* ────────────────────────────────────
   WA FLOAT BUTTON
──────────────────────────────────── */
function initWAFloat() {
  const btn = document.getElementById("wa-float");
  if (btn) {
    btn.href = `https://wa.me/${CONFIG.waNumber.replace(/\D/g, "")}`;
    btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i>';
  }
}

/* ────────────────────────────────────
   NAVBAR SCROLL
──────────────────────────────────── */
const navbar = document.getElementById("navbar");
window.addEventListener(
  "scroll",
  () => {
    navbar.classList.toggle("scrolled", window.scrollY > 60);
    updateProgressNav();
    highlightNavLink();
  },
  { passive: true },
);

/* ────────────────────────────────────
   MOBILE HAMBURGER
──────────────────────────────────── */
const hamburger = document.getElementById("hamburger");
const mobileNav = document.getElementById("mobile-nav");

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("open");
  mobileNav.classList.toggle("open");
  document.body.style.overflow = mobileNav.classList.contains("open")
    ? "hidden"
    : "";
});

function closeMobileNav() {
  hamburger.classList.remove("open");
  mobileNav.classList.remove("open");
  document.body.style.overflow = "";
}

/* ────────────────────────────────────
   PROGRESS NAV (left dots)
──────────────────────────────────── */
const sections = [
  "sec-kitchen",
  "sec-kids",
  "sec-electric",
  "sec-phones",
  "sec-decor",
];
const progDots = document.querySelectorAll(".prog-dot");

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
  closeMobileNav();
}

function updateProgressNav() {
  let active = 0;
  sections.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - window.innerHeight / 2)
      active = i;
  });
  progDots.forEach((d, i) => d.classList.toggle("active", i === active));
}

function highlightNavLink() {
  let current = "";
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === "#" + current);
  });
}


function registerCardAnimations() {
  ["kitchen", "kids", "electric", "phones", "decor"].forEach((cat) => {
    const grid = document.getElementById("grid-" + cat);
    if (!grid) return;

    const cards = grid.querySelectorAll(".product-card");
    if (!cards.length) return;

    gsap.from(cards, {
      scrollTrigger: {
        trigger: grid,
        start: "top 88%",
        once: true,
      },
      y: 38,
      opacity: 0,
      duration: 0.55,
      stagger: 0.08,
      ease: "power2.out",
      clearProps: "all",
    });
  });
}

/* ────────────────────────────────────
   SWIPER TESTIMONIALS
──────────────────────────────────── */
const REVIEWS = [
  {
    name: "سارة محمد",
    city: "القاهرة",
    stars: 5,
    text: "طاسة الضغط وصلت في يومين بس وكانت معبأة حلو جداً، الجودة فوق التوقعات بكتير!",
  },
  {
    name: "أحمد خالد",
    city: "الإسكندرية",
    stars: 5,
    text: "اشتريت شاحن 65W وعمل بشكل مثالي مع اللاب توب والموبايل، التوصيل كان سريع.",
  },
  {
    name: "منى علي",
    city: "الجيزة",
    stars: 4,
    text: "الألعاب التعليمية ولادي بحبوها جداً، الألوان والجودة ممتازة. هشتري تاني بالتأكيد.",
  },
  {
    name: "محمود حسن",
    city: "المنصورة",
    stars: 5,
    text: "السماعة TWS صوتها نقي جداً والباطاري بتدوم طول اليوم. أفضل شراء عملته.",
  },
  {
    name: "رانيا إبراهيم",
    city: "أسيوط",
    stars: 5,
    text: "الشمعة العطرية ريحتها جميلة جداً وبتدوم فترة طويلة. مش هشتري من غير هنا.",
  },
  {
    name: "كريم طارق",
    city: "طنطا",
    stars: 4,
    text: "طقم السكاكين احترافي وجاي في علبة هدية حلوة، كان هدية زواج ممتازة.",
  },
];

function starIcons(n) {
  return Array.from(
    { length: n },
    () => '<i class="fa-solid fa-star"></i>',
  ).join("");
}

function initSwiper() {
  const wrapper = document.getElementById("reviews-wrapper");
  if (!wrapper) return;

  wrapper.innerHTML = REVIEWS.map(
    (r) => `
    <div class="swiper-slide">
      <div class="review-card">
        <div class="review-stars">${starIcons(r.stars)}</div>
        <p class="review-text">${r.text}</p>
        <div class="review-author">
          <div class="review-avatar">${r.name[0]}</div>
          <div>
            <div class="review-name">${r.name}</div>
            <div class="review-city">
              <i class="fa-solid fa-location-dot"></i> ${r.city}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  ).join("");

  /* Update prev/next button icons */
  const prevBtn = document.getElementById("sw-prev");
  const nextBtn = document.getElementById("sw-next");
  if (prevBtn) prevBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  if (nextBtn) nextBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';

  new Swiper(".swiper-testimonials", {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    autoplay: {
      delay: 4500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    pagination: { el: ".swiper-pagination", clickable: true },
    navigation: { prevEl: "#sw-prev", nextEl: "#sw-next" },
    breakpoints: {
      600: { slidesPerView: 2 },
      1024: { slidesPerView: 3 },
    },
  });
}

/* ────────────────────────────────────
   REPLACE NAV ICONS WITH FONT AWESOME
──────────────────────────────────── */
function patchNavIcons() {
  const iconMap = {
    مطبخ: "fa-solid fa-utensils",
    أطفال: "fa-solid fa-baby",
    كهربائيات: "fa-solid fa-bolt",
    موبايلات: "fa-solid fa-mobile-screen",
    ديكور: "fa-solid fa-couch",
  };

  document.querySelectorAll(".nav-links a").forEach((a) => {
    const text = a.textContent.trim();
    for (const [label, cls] of Object.entries(iconMap)) {
      if (text.includes(label)) {
        a.innerHTML = `<i class="${cls}"></i> ${label}`;
        break;
      }
    }
  });

  /* Hero category pills */
  const pillIconMap = {
    kitchen: "fa-solid fa-utensils",
    kids: "fa-solid fa-baby",
    electric: "fa-solid fa-bolt",
    phones: "fa-solid fa-mobile-screen",
    decor: "fa-solid fa-couch",
  };
  ["kitchen", "kids", "electric", "phones", "decor"].forEach((cat) => {
    const pill = document.querySelector(
      `.hero-cat-pill[href="#sec-${cat}"] .pill-icon`,
    );
    if (pill) pill.innerHTML = `<i class="${pillIconMap[cat]}"></i>`;
  });

  /* Features strip */
  const featureIconMap = [
    ["توصيل سريع", "fa-solid fa-truck-fast"],
    ["جودة مضمونة", "fa-solid fa-gem"],
    ["سياسة الاسترجاع", "fa-solid fa-rotate-left"],
    ["دعم على واتساب", "fa-brands fa-whatsapp"],
  ];
  document.querySelectorAll(".feature-item").forEach((item) => {
    const title =
      item.querySelector(".feature-title")?.textContent.trim() || "";
    const iconEl = item.querySelector(".feature-icon");
    if (!iconEl) return;
    for (const [label, cls] of featureIconMap) {
      if (title.includes(label.slice(0, 5))) {
        iconEl.innerHTML = `<i class="${cls}"></i>`;
        break;
      }
    }
  });

  /* Footer social buttons */
  const socialMap = [
    ["فيسبوك", "fa-brands fa-facebook-f"],
    ["انستغرام", "fa-brands fa-instagram"],
    ["تيك توك", "fa-brands fa-tiktok"],
    ["واتساب", "fa-brands fa-whatsapp"],
  ];
  document.querySelectorAll(".footer-social .social-btn").forEach((btn) => {
    const title = btn.getAttribute("title") || "";
    for (const [label, cls] of socialMap) {
      if (title.includes(label)) {
        btn.innerHTML = `<i class="${cls}"></i>`;
        break;
      }
    }
  });

  /* Logo mark */
  const logoMarks = document.querySelectorAll(".logo-mark");
  logoMarks.forEach((lm) => {
    lm.innerHTML = '<i class="fa-solid fa-bag-shopping"></i>';
  });

  /* Mobile nav icons */
  const mobileIconMap = {
    "أدوات مطبخ": "fa-solid fa-utensils",
    "مستلزمات أطفال": "fa-solid fa-baby",
    "أدوات كهربائية": "fa-solid fa-bolt",
    "مستلزمات هواتف": "fa-solid fa-mobile-screen",
    ديكور: "fa-solid fa-couch",
    "لوحة التحكم": "fa-solid fa-gear",
  };
  document.querySelectorAll(".mobile-nav a").forEach((a) => {
    const text = a.textContent.trim();
    for (const [label, cls] of Object.entries(mobileIconMap)) {
      if (text.includes(label)) {
        a.innerHTML = `<i class="${cls}"></i> ${label}`;
        break;
      }
    }
  });

  /* nav-dashboard button */
  const dashBtn = document.querySelector(".nav-dashboard");
  if (dashBtn)
    dashBtn.innerHTML = '<i class="fa-solid fa-gear"></i> لوحة التحكم';

  /* Scroll indicator text */
  const scrollLabel = document.querySelector(".hero-scroll span");
  if (scrollLabel)
    scrollLabel.innerHTML =
      '<i class="fa-solid fa-angles-down"></i> اسكرول للأسفل';
}

/* ────────────────────────────────────
   INIT
──────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initGrids();

  patchNavIcons();

  initWAFloat();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      /* double-rAF ensures DOM is fully painted */
      initGSAP();
      initSwiper();
    });
  });
});


function initGSAP() {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.defaults({
    invalidateOnRefresh: true,
  });

  /* Hero */
  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from(".hero-eyebrow", { y: -24, opacity: 0, duration: 0.7 })
    .from(".hero h1", { y: 40, opacity: 0, duration: 0.9 }, "-=0.45")
    .from(".hero-sub", { y: 24, opacity: 0, duration: 0.75 }, "-=0.55")
    .from(".hero-cats .hero-cat-pill", {
      y: 22,
      opacity: 0,
      duration: 0.55,
      stagger: 0.08,
      ease: "power2.out",
    }, "-=0.45")
    .from(".hero-scroll", { opacity: 0, y: 10, duration: 0.6 }, "-=0.3");

  /* Features strip */
  gsap.from(".feature-item", {
    scrollTrigger: {
      trigger: ".features-strip",
      start: "top 82%",
      once: true,
    },
    y: 26,
    opacity: 0,
    duration: 0.65,
    stagger: 0.12,
    ease: "power2.out",
  });

  /* Section headers */
  ["kitchen", "kids", "electric", "phones", "decor"].forEach((cat) => {
    const sec = document.getElementById("sec-" + cat);
    const header = sec?.querySelector(".section-header");
    if (!sec || !header) return;

    gsap.from(header, {
      scrollTrigger: {
        trigger: sec,
        start: "top 80%",
        once: true,
      },
      y: 32,
      opacity: 0,
      duration: 0.7,
      ease: "power3.out",
    });
  });

  /* Testimonials */
  const testimonialHeader = document.querySelector("#sec-testimonials .section-header");
  if (testimonialHeader) {
    gsap.from(testimonialHeader, {
      scrollTrigger: {
        trigger: "#sec-testimonials",
        start: "top 82%",
        once: true,
      },
      y: 28,
      opacity: 0,
      duration: 0.7,
      ease: "power3.out",
    });
  }

  registerCardAnimations();

  ScrollTrigger.refresh();
}