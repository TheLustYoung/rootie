// Rootie storefront: structure and logic modelled on nike.com (utility bar, mega menu, promo bar, home with trending/carousels, product list with
// filters and sort, product page with gallery/size/accordions/related, favorites, bag, search overlay, footer). Hash routes, no build step.
import { mountSketchfab } from './hero-embed.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' AMD';
const CART = 'rootie-cart-v3', FAVS = 'rootie-favs-v1';
let data, cart = read(CART, []), favs = new Set(read(FAVS, [])), promoI = 0;

function read(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }
const find = (id) => data.products.find((p) => p.id === id);
const priceText = (p) => (p.price == null ? 'Цена по запросу' : (p.priceFrom ? 'от ' : '') + fmt(p.price));
const wa = (text) => `https://wa.me/${data.contacts.whatsapp}?text=${encodeURIComponent(text)}`;
const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2400); };

// ---------------------------------------------------------------- shared pieces
const heart = (p) => `<button class="fav ${favs.has(p.id) ? 'on' : ''}" data-fav="${p.id}" aria-label="В избранное" aria-pressed="${favs.has(p.id)}"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button>`;

const colorsWord = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'цвет' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'цвета' : 'цветов'}`;
function card(p) {
  const cols = p.colors, n = cols.length;
  return `<article class="card" data-id="${p.id}">
    ${heart(p)}
    <a class="card-hit" href="#/p/${p.id}">
      <div class="photo"><img class="a" alt="${esc(p.name)}" src="${cols[0].image}" loading="lazy"></div>
    </a>
    ${n > 1 ? `<div class="dots" aria-label="Цвета">${cols.slice(0, 6).map((c, i) => `<i class="dot ${i ? '' : 'on'}" data-dot="${i}" data-img="${c.image}" title="${esc(c.name)}" style="background:${c.hex}"></i>`).join('')}${n > 6 ? `<span class="more">+${n - 6}</span>` : ''}</div>` : '<div class="dots"></div>'}
    <a class="card-hit" href="#/p/${p.id}">
      ${p.tag ? `<p class="tag">${esc(p.tag)}</p>` : ''}
      <h3>${esc(p.name)}</h3><p class="sub">${esc(p.subtitle || '')}</p>${n > 1 ? `<p class="cat">${colorsWord(n)}</p>` : ''}
      <p class="price">${priceText(p)}</p>
    </a></article>`;
}
const row = (title, products, link) => `<section class="band"><div class="band-head"><h2>${title}</h2><div class="arrows">${link ? `<a class="btn small ghost" href="${link}">Смотреть все</a>` : ''}<button data-scroll="-1" aria-label="Назад">‹</button><button data-scroll="1" aria-label="Вперёд">›</button></div></div><div class="track">${products.map(card).join('')}</div></section>`;

// ---------------------------------------------------------------- views
function viewHome() {
  const brands = data.brands.map((b) => ({ b, p: data.products.find((p) => p.brand === b) })).filter((x) => x.p);
  const news = data.products.filter((p) => p.new);
  const cats = data.categories.map((c) => ({ c, p: data.products.find((p) => p.category === c) }));
  return `
    <section class="band"><div class="band-head"><h2>В тренде</h2></div>
      <div class="trend">${brands.map(({ b, p }) => `<a class="trend-tile" href="#/shop?brand=${encodeURIComponent(b)}"><div class="photo"><img alt="" src="${p.images[0]}" loading="lazy"></div><span>${esc(b)}</span></a>`).join('')}</div></section>
    ${row('Новинки недели', news, '#/shop/new')}
    <section class="band two">
      <a class="banner" href="#/store"><img alt="" src="img/banner-store.jpg" loading="lazy"><div><p class="kick">Магазин в Ереване</p><h3>Сарьяна, 4</h3><span class="btn light">Как добраться</span></div></a>
      <a class="banner" href="#/store"><img alt="" src="img/banner-care.jpg" loading="lazy"><div><p class="kick">Услуга</p><h3>Чистка и реставрация обуви</h3><span class="btn light">Узнать больше</span></div></a>
    </section>
    <section class="band"><div class="band-head"><h2>Выберите раздел</h2></div>
      <div class="cat-tiles">${cats.map(({ c, p }) => `<a class="cat-tile" href="#/shop/${encodeURIComponent(c)}"><div class="photo"><img alt="" src="${p.images[0]}" loading="lazy"></div><span>${c}</span></a>`).join('')}</div></section>
    ${row('Все товары', data.products, '#/shop')}`;
}

function parseQuery(q) { const o = {}; (q || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); o[decodeURIComponent(k)] = decodeURIComponent(v || ''); }); return o; }

function viewShop(seg, q) {
  const f = parseQuery(q);
  let cat = seg ? decodeURIComponent(seg) : '';
  const isNew = cat === 'new';
  let list = data.products.filter((p) => (!cat || isNew || p.category === cat) && (!isNew || p.new) && (!f.brand || p.brand === f.brand) && (!f.avail || p.availability === f.avail));
  const sort = f.sort || 'rec';
  if (sort === 'new') list = [...list].sort((a, b) => (b.new ? 1 : 0) - (a.new ? 1 : 0));
  if (sort === 'asc' || sort === 'desc') list = [...list].sort((a, b) => ((a.price ?? 1e12) - (b.price ?? 1e12)) * (sort === 'asc' ? 1 : -1));
  const title = isNew ? 'Новинки' : cat || 'Все товары';
  const base = `#/shop${cat ? '/' + encodeURIComponent(cat) : ''}`;
  const url = (patch) => { const n = { ...f, ...patch }; Object.keys(n).forEach((k) => !n[k] && delete n[k]); const s = Object.entries(n).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'); return base + (s ? '?' + s : ''); };
  const brands = [...new Set(data.products.filter((p) => !cat || isNew || p.category === cat).map((p) => p.brand))];
  const avails = [...new Set(data.products.map((p) => p.availability))];
  const hide = read('rootie-hide-filters', innerWidth < 1000);          // on phones the filters start collapsed
  return `
    <div class="plp ${hide ? 'no-filters' : ''}">
      <div class="plp-head"><h1>${esc(title)} <span>(${list.length})</span></h1>
        <div class="plp-tools"><button id="toggleFilters">${hide ? 'Показать фильтры' : 'Скрыть фильтры'}</button>
          <label class="sort">Сортировка: <select id="sortSel">${[['rec', 'Рекомендуемые'], ['new', 'Сначала новинки'], ['asc', 'Цена: по возрастанию'], ['desc', 'Цена: по убыванию']].map(([v, t]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div></div>
      <div class="plp-body">
        <aside class="filters">
          <nav class="cat-list"><a href="#/shop" class="${!cat ? 'on' : ''}">Все товары</a><a href="#/shop/new" class="${isNew ? 'on' : ''}">Новинки</a>${data.categories.map((c) => `<a href="#/shop/${encodeURIComponent(c)}" class="${c === cat ? 'on' : ''}">${c}</a>`).join('')}</nav>
          <details open><summary>Бренд</summary>${brands.map((b) => `<label class="chk"><input type="checkbox" data-url="${url({ brand: f.brand === b ? '' : b })}" ${f.brand === b ? 'checked' : ''}> ${esc(b)}</label>`).join('')}</details>
          <details open><summary>Наличие</summary>${avails.map((a) => `<label class="chk"><input type="checkbox" data-url="${url({ avail: f.avail === a ? '' : a })}" ${f.avail === a ? 'checked' : ''}> ${esc(a)}</label>`).join('')}</details>
          ${f.brand || f.avail ? `<a class="clear" href="${base}">Сбросить фильтры</a>` : ''}
        </aside>
        <div class="grid">${list.length ? list.map(card).join('') : '<p class="muted empty">Ничего не найдено. Сбросьте фильтры или напишите нам: подберём вручную.</p>'}</div>
      </div></div>`;
}

function viewProduct(id) {
  const p = find(id); if (!p) return viewNotFound();
  document.title = `${p.name} — Rootie`;
  const related = data.products.filter((x) => x.id !== p.id && (x.brand === p.brand || x.category === p.category)).slice(0, 8);
  const cols = p.colors;
  return `
    <div class="pdp" data-id="${p.id}" data-color="0">
      <nav class="crumbs"><a href="#/">Главная</a> / <a href="#/shop/${encodeURIComponent(p.category)}">${p.category}</a> / <span>${esc(p.name)}</span></nav>
      <div class="pdp-grid">
        <div class="stage-img"><img id="pdpMain" alt="${esc(p.name)}" src="${cols[0].image}"></div>
        <div class="pdp-info">
          ${p.tag ? `<p class="tag">${esc(p.tag)}</p>` : ''}
          <h1>${esc(p.name)}</h1><p class="sub">${esc(p.subtitle || '')}</p>
          <p class="pdp-price">${priceText(p)}</p>
          <p class="avail">${esc(p.availability)}</p>
          <p class="colname">Цвет: <b id="colName">${esc(cols[0].name)}</b></p>
          <div class="color-thumbs" id="colorThumbs">${cols.map((c, i) => `<button type="button" class="cthumb ${i ? '' : 'on'}" data-color="${i}" title="${esc(c.name)}" aria-label="${esc(c.name)}"><img alt="" src="${c.image}"></button>`).join('')}</div>
          ${p.sizes.length ? `<div class="sizebox"><div class="size-head"><b>Выберите размер</b></div><div class="sizes" id="sizes">${p.sizes.map((s) => `<button type="button" class="size" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div><p class="msg" id="sizeMsg" role="alert"></p></div>` : ''}
          <button class="btn wide big" id="addBag">Добавить в корзину</button>
          <p class="hint">Цену и наличие по всем товарам из корзины можно уточнить одним сообщением в WhatsApp.</p>
          <button class="btn ghost wide big fav-big ${favs.has(p.id) ? 'on' : ''}" data-fav="${p.id}">${favs.has(p.id) ? 'В избранном ♥' : 'В избранное ♡'}</button>
          <p class="desc">${esc(p.description || '')}</p>
          <details class="acc" open><summary>Подробнее о товаре</summary><ul><li>Бренд: ${esc(p.brand)}</li><li>Раздел: ${esc(p.category)}</li><li>Цветов: ${cols.length}</li><li>Наличие: ${esc(p.availability)}</li></ul></details>
          <details class="acc"><summary>Доставка и самовывоз</summary><p>Самовывоз из магазина: Ереван, ул. Сарьяна, 4, ежедневно 11:00–22:00. Доставку и сроки уточняйте у менеджера в WhatsApp или Telegram.</p></details>
          <details class="acc"><summary>Оплата</summary><p>Картой, наличными или банковским переводом. Для товаров под заказ возможна предоплата: условия подтвердит менеджер.</p></details>
          <details class="acc"><summary>Уход и реставрация</summary><p>В магазине доступны чистка и реставрация обуви, а также средства по уходу. <a href="#/store">Подробнее</a></p></details>
        </div>
      </div>
      ${related.length ? row('Вам также может понравиться', related) : ''}
    </div>`;
}

function viewFavorites() {
  const list = data.products.filter((p) => favs.has(p.id));
  return `<div class="plp"><div class="plp-head"><h1>Избранное <span>(${list.length})</span></h1></div>${list.length ? `<div class="grid fav-grid">${list.map(card).join('')}</div>` : '<div class="emptybox"><p>Здесь пока пусто. Нажмите ♡ на карточке, чтобы сохранить товар.</p><a class="btn" href="#/shop">Перейти в каталог</a></div>'}</div>`;
}

const cartTotal = () => cart.reduce((s, r) => s + (find(r.id)?.price || 0) * r.qty, 0);
function viewBag() {
  if (!cart.length) return `<div class="plp"><div class="plp-head"><h1>Корзина</h1></div><div class="emptybox"><p>В корзине пока ничего нет.</p><a class="btn" href="#/shop">Перейти в каталог</a></div></div>`;
  const unpriced = cart.some((r) => find(r.id).price == null), from = cart.some((r) => find(r.id).priceFrom), allUnpriced = cart.every((r) => find(r.id).price == null);
  return `<div class="bag"><h1>Корзина</h1><div class="bag-grid">
    <div class="bag-list">${cart.map((r, i) => { const p = find(r.id); return `<div class="line"><a href="#/p/${p.id}"><img alt="" src="${p.colors[r.color || 0].image}"></a>
      <div><a href="#/p/${p.id}"><b>${esc(p.name)}</b></a><p class="muted">Цвет: ${esc(p.colors[r.color || 0].name)}</p>${r.size ? `<p class="muted">Размер: ${esc(r.size)}</p>` : ''}
        <div class="qty"><button data-qty="${i}" data-d="-1" aria-label="Меньше">−</button><span>${r.qty}</span><button data-qty="${i}" data-d="1" aria-label="Больше">+</button><button class="link" data-rm="${i}">Удалить</button></div></div>
      <div class="lp">${priceText(p)}</div></div>`; }).join('')}</div>
    <aside class="summary"><h2>Итого</h2>${allUnpriced ? '<div class="sum-row"><span>Стоимость</span><b>по запросу</b></div>' : `<div class="sum-row"><span>${unpriced ? 'Товары с ценой' : 'Сумма товаров'}</span><b>${from ? 'от ' : ''}${fmt(cartTotal())}</b></div>`}
      ${unpriced ? '<p class="muted small">Цену по остальным позициям менеджер назовёт в ответе на ваше сообщение.</p>' : ''}
      <p class="one-msg">Одно сообщение сразу по всем товарам из корзины: цена, наличие и сроки. Писать по каждому товару отдельно не нужно.</p>
      <form id="checkout" autocomplete="on"><input name="name" placeholder="Ваше имя (необязательно)" autocomplete="name"><input name="phone" placeholder="Телефон (необязательно)" inputmode="tel" autocomplete="tel"><input name="address" placeholder="Доставка или самовывоз, город (необязательно)" autocomplete="street-address"><textarea name="note" rows="2" placeholder="Комментарий (необязательно)"></textarea>
        <button class="btn wide big" type="submit" data-channel="wa">Отправить в WhatsApp</button><button class="btn ghost wide big" type="submit" data-channel="tg">Отправить в Telegram</button></form>
      <p class="muted small">Заказ откроется готовым сообщением в мессенджере: магазин подтвердит наличие, оплату и доставку.</p></aside></div></div>`;
}

function viewStore() {
  return `<div class="page"><h1>Магазин в Ереване</h1>
    <div class="shop"><div class="shop-info"><p class="addr">Ереван, ул. Сарьяна, 4</p><p class="hours">Ежедневно 11:00–22:00</p>
      <a class="rating" href="https://yandex.com/maps/org/rootie/60517769520/reviews/" target="_blank" rel="noopener"><b>★ 4,9</b><span>45 оценок на Яндекс Картах</span></a>
      <p class="muted">Кроссовки, одежда и сеты: мужские, женские и детские. Можно прийти померить и выбрать: в магазине подскажут по моделям и размерам.</p>
      <ul class="feats"><li>Оплата картой, наличными и переводом</li><li>Доставка и самовывоз</li><li>Шоу-рум и бутик</li><li>Средства по уходу за обувью</li><li>Подарочные сертификаты</li><li>Парковка</li><li>Можно с собакой</li></ul>
      <div class="shop-actions"><a class="btn" href="https://yandex.com/maps/org/rootie/60517769520/" target="_blank" rel="noopener">Построить маршрут</a><a class="btn ghost" href="tel:+37441773561">Позвонить</a></div></div>
      <div class="shop-map"><iframe title="Rootie на карте: Ереван, Сарьяна 4" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://yandex.com/map-widget/v1/?ll=44.508953%2C40.187399&z=16&pt=44.508953%2C40.187399%2Cpm2rdm"></iframe></div></div>
    <h2 id="care">Чистка и реставрация</h2>
    <div class="care"><p>Приносите вашу обувь на чистку в наш магазин. Индивидуальный подход к каждой паре. Также доступна реставрация.</p><a class="btn" target="_blank" rel="noopener" href="${wa('Здравствуйте! Хочу узнать про чистку обуви')}">Узнать стоимость в WhatsApp</a></div></div>`;
}

function viewHelp() {
  const q = (t, a) => `<details class="acc" open><summary>${t}</summary><p>${a}</p></details>`;
  return `<div class="page"><h1>Помощь</h1>
    ${q('Как сделать заказ', 'Выберите товар и размер, добавьте в корзину и оформите заказ: сообщение с составом заказа откроется в WhatsApp или Telegram. Менеджер подтвердит наличие, цену и доставку.')}
    ${q('Доставка и самовывоз', 'Самовывоз: Ереван, ул. Сарьяна, 4, ежедневно 11:00–22:00. Доставку и сроки уточняйте у менеджера. Товары под заказ доезжают, как правило, за несколько дней.')}
    ${q('Способы оплаты', 'Картой, наличными, банковским переводом. Для товаров под заказ возможна предоплата.')}
    ${q('Размеры и наличие', 'Размеры и наличие меняются каждый день: подтвердим перед заказом. Напишите нам, если нужного размера нет в списке.')}
    ${q('Связаться', `WhatsApp и Telegram: ${esc(data.contacts.phone)} / @${esc(data.contacts.telegram)}. Instagram: @${esc(data.contacts.instagram)}.`)}</div>`;
}
const viewNotFound = () => '<div class="page"><h1>Страница не найдена</h1><p><a class="btn" href="#/">На главную</a></p></div>';

// ---------------------------------------------------------------- router
function route() {
  const hash = location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  const seg = path.split('/').filter(Boolean);
  const home = !seg.length;
  document.body.classList.toggle('is-home', home);
  let html, title = 'Rootie — лимитированные кроссовки и одежда, Ереван';
  if (home) html = viewHome();
  else if (seg[0] === 'shop') { html = viewShop(seg[1], query); title = 'Каталог — Rootie'; }
  else if (seg[0] === 'p') html = viewProduct(decodeURIComponent(seg[1] || ''));
  else if (seg[0] === 'favorites') { html = viewFavorites(); title = 'Избранное — Rootie'; }
  else if (seg[0] === 'bag') { html = viewBag(); title = 'Корзина — Rootie'; }
  else if (seg[0] === 'store') { html = viewStore(); title = 'Магазин и чистка — Rootie'; }
  else if (seg[0] === 'help') { html = viewHelp(); title = 'Помощь — Rootie'; }
  else html = viewNotFound();
  $('#view').innerHTML = html;
  if (seg[0] !== 'p') document.title = title;
  if (!(seg[0] === 'shop' && route.last === 'shop')) window.scrollTo(0, 0);
  route.last = seg[0];
  closeOverlays();
  bindView();
}

function bindView() {
  const g = $('#gallery');
  if (g) g.addEventListener('scroll', () => { const i = Math.round(g.scrollLeft / g.clientWidth); $$('#galDots i').forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
}

// ---------------------------------------------------------------- header: counters, promo bar, mega menu, search
function counters() {
  const n = cart.reduce((s, r) => s + r.qty, 0);
  $('#cartCount').textContent = n; $('#cartCount').hidden = !n;
  $('#favCount').textContent = favs.size; $('#favCount').hidden = !favs.size;
}
const PROMO = [['Новинки недели: свежие релизы в Ереване', '#/shop/new'], ['Чистка и реставрация обуви: приносите пару в магазин на Сарьяна, 4', '#/store'], ['Заказ в WhatsApp или Telegram: ответим за пару минут', '#/help']];
function promo(d = 0) { promoI = (promoI + d + PROMO.length) % PROMO.length; const a = $('#promoText'); a.textContent = PROMO[promoI][0]; a.href = PROMO[promoI][1]; }

function megaHtml(key) {
  const byBrand = (cat) => [...new Set(data.products.filter((p) => p.category === cat).map((p) => p.brand))];
  const link = (t, h) => `<a href="${h}">${esc(t)}</a>`;
  const col = (t, items) => `<div><h4>${t}</h4>${items.join('')}</div>`;
  const brandCol = (cat) => col('Бренды', byBrand(cat).map((b) => link(b, `#/shop/${encodeURIComponent(cat)}?brand=${encodeURIComponent(b)}`)));
  const feat = (p) => p ? `<a class="mega-feat" href="#/p/${p.id}"><img alt="" src="${p.images[0]}"><b>${esc(p.name)}</b></a>` : '';
  if (key === 'new') { const n = data.products.filter((p) => p.new); return col('Новинки', n.map((p) => link(p.name, `#/p/${p.id}`))) + col('Разделы', data.categories.map((c) => link(c, `#/shop/${encodeURIComponent(c)}`))) + feat(n[0]); }
  if (key === 'care') return col('Услуги', [link('Чистка обуви', '#/store'), link('Реставрация обуви', '#/store'), link('Средства по уходу', '#/store')]) + col('Магазин', [link('Адрес и часы работы', '#/store'), link('Помощь', '#/help')]);
  const cat = { shoes: 'Обувь', clothes: 'Одежда', acc: 'Аксессуары', watch: 'Часы' }[key];
  const items = data.products.filter((p) => p.category === cat);
  return col('Все', [link(`Все: ${cat}`, `#/shop/${encodeURIComponent(cat)}`), link('Новинки', '#/shop/new')]) + brandCol(cat) + col('Модели', items.map((p) => link(p.name, `#/p/${p.id}`))) + feat(items[0]);
}
let megaTimer;
function showMega(key) { clearTimeout(megaTimer); const m = $('#mega'); m.innerHTML = megaHtml(key); m.hidden = false; }
function hideMega() { megaTimer = setTimeout(() => ($('#mega').hidden = true), 140); }

function openSearch() { $('#search').hidden = false; document.body.classList.add('lock'); const i = $('#searchInput'); i.value = ''; i.focus(); doSearch(''); }
function closeSearch() { $('#search').hidden = true; if ($('#mobileMenu').hidden) document.body.classList.remove('lock'); }
function closeOverlays() { closeSearch(); $('#mobileMenu').hidden = true; document.body.classList.remove('lock'); $('#mega').hidden = true; }
function doSearch(q) {
  q = q.trim().toLowerCase();
  const pop = ['Jordan', 'Nike', 'Moon Boot', 'Rimowa', 'Swatch', 'Kith'];
  $('#searchPop').innerHTML = q ? '' : `<p class="muted">Популярные запросы</p><div class="chips">${pop.map((t) => `<button class="chip" data-q="${t}">${t}</button>`).join('')}</div>`;
  const res = q ? data.products.filter((p) => [p.name, p.subtitle, p.brand, p.category, p.description].join(' ').toLowerCase().includes(q)) : [];
  $('#searchRes').innerHTML = q ? (res.length ? res.map((p) => `<a class="sres" href="#/p/${p.id}"><img alt="" src="${p.images[0]}"><div><b>${esc(p.name)}</b><span>${esc(p.subtitle || '')}</span><em>${priceText(p)}</em></div></a>`).join('') : '<p class="muted">Ничего не найдено. Попробуйте «Jordan» или «Moon Boot».</p>') : '';
}

// ---------------------------------------------------------------- actions
function setFav(id) { favs.has(id) ? favs.delete(id) : favs.add(id); write(FAVS, [...favs]); counters(); toast(favs.has(id) ? 'Добавлено в избранное' : 'Удалено из избранного'); }
function addBag(p, size, color = 0) {
  const r = cart.find((x) => x.id === p.id && x.size === size && (x.color || 0) === color);
  r ? r.qty++ : cart.push({ id: p.id, size, color, qty: 1 });
  write(CART, cart); counters(); toast('Добавлено в корзину');
}
function orderText(f) {
  const lines = cart.map((r, k) => { const p = find(r.id); return `${k + 1}. ${p.name}, ${p.colors[r.color || 0].name}${r.size ? ', размер ' + r.size : ''} × ${r.qty} (${priceText(p)})`; });
  const allUnpriced = cart.every((r) => find(r.id).price == null);
  const head = allUnpriced ? 'Здравствуйте! Хочу уточнить цену и наличие по товарам с сайта rootie.co:' : 'Здравствуйте! Хочу заказать товары с сайта rootie.co:';
  const ask = 'Подскажите, пожалуйста, цену, наличие и сроки по всем позициям.';
  const who = [f.name && `Имя: ${f.name}`, f.phone && `Телефон: ${f.phone}`, f.address && `Доставка/самовывоз: ${f.address}`, f.note && `Комментарий: ${f.note}`].filter(Boolean).join('\n');
  return `${head}\n\n${lines.join('\n')}\n\n${ask}${who ? '\n\n' + who : ''}`;
}

function wire() {
  document.addEventListener('click', (e) => {
    const t = e.target;
    const fav = t.closest('[data-fav]'); if (fav) { e.preventDefault(); const id = fav.dataset.fav; setFav(id); $$(`[data-fav="${id}"]`).forEach((b) => { b.classList.toggle('on', favs.has(id)); if (b.classList.contains('fav-big')) b.textContent = favs.has(id) ? 'В избранном ♥' : 'В избранное ♡'; }); if (location.hash.startsWith('#/favorites')) route(); return; }
    const ct = t.closest('.cthumb'); if (ct) { const pp = $('.pdp'); const i = +ct.dataset.color, pr = find(pp.dataset.id); pp.dataset.color = i; $('#pdpMain').src = pr.colors[i].image; $('#colName').textContent = pr.colors[i].name; $$('.cthumb').forEach((x) => x.classList.toggle('on', x === ct)); return; }
    const sz = t.closest('[data-size]'); if (sz) { $$('#sizes .size').forEach((x) => x.classList.toggle('on', x === sz)); $('#sizeMsg').textContent = ''; return; }
    if (t.closest('#addBag')) { const p = find($('.pdp').dataset.id); const on = $('#sizes .size.on'); if (p.sizes.length && !on) { $('#sizeMsg').textContent = 'Выберите размер'; $('#sizes').classList.add('shake'); setTimeout(() => $('#sizes').classList.remove('shake'), 500); return; } addBag(p, on ? on.dataset.size : null, +$('.pdp').dataset.color); return; }
    const ask = t.closest('[data-ask]'); if (ask) { e.preventDefault(); const p = find(ask.dataset.ask); const on = $('#sizes .size.on'); window.open(wa(`Здравствуйте! Интересует: ${p.name}, цвет ${p.colors[+$('.pdp').dataset.color].name}${on ? ', размер ' + on.dataset.size : ''}. Подскажите цену и наличие.`), '_blank', 'noopener'); return; }
    const q = t.closest('[data-qty]'); if (q) { const r = cart[+q.dataset.qty]; r.qty += +q.dataset.d; if (r.qty <= 0) cart.splice(+q.dataset.qty, 1); write(CART, cart); counters(); route(); return; }
    const rm = t.closest('[data-rm]'); if (rm) { cart.splice(+rm.dataset.rm, 1); write(CART, cart); counters(); route(); return; }
    const sc = t.closest('[data-scroll]'); if (sc) { const tr = sc.closest('.band').querySelector('.track'); tr.scrollBy({ left: +sc.dataset.scroll * tr.clientWidth * 0.85, behavior: 'smooth' }); return; }
    const pr = t.closest('[data-p]'); if (pr) { promo(+pr.dataset.p); return; }
    const chip = t.closest('[data-q]'); if (chip) { $('#searchInput').value = chip.dataset.q; doSearch(chip.dataset.q); return; }
    if (t.closest('#searchBtn')) return openSearch();
    if (t.closest('#searchClose')) return closeSearch();
    if (t.closest('#burger')) { $('#mobileMenu').hidden = false; document.body.classList.add('lock'); return; }
    if (t.closest('#menuClose') || t.closest('#mobileMenu a') || t.closest('.sres')) { closeOverlays(); return; }
    if (t.closest('#toggleFilters')) { write('rootie-hide-filters', !read('rootie-hide-filters', innerWidth < 1000)); route(); return; }
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'sortSel') { const h = location.hash; const [p, q] = h.split('?'); const f = parseQuery(q); f.sort = e.target.value; location.hash = p + '?' + Object.entries(f).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'); }
    if (e.target.dataset && e.target.dataset.url) location.hash = e.target.dataset.url;
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'searchInput') doSearch(e.target.value); });
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'checkout') return;
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target).entries()), text = orderText(f);
    if (e.submitter && e.submitter.dataset.channel === 'wa') window.open(wa(text), '_blank', 'noopener');
    else { navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {}); window.open(`https://t.me/${data.contacts.telegram}`, '_blank', 'noopener'); toast('Текст заказа скопирован: вставьте его в чат Telegram'); }
  });
  document.addEventListener('mouseover', (e) => { const d = e.target.closest('.dot'); if (!d) return; const c = d.closest('.card'); c.querySelector('.photo img').src = d.dataset.img; $$('.dot', c).forEach((x) => x.classList.toggle('on', x === d)); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlays(); });
  $$('#nav .nav-item').forEach((n) => { n.addEventListener('mouseenter', () => showMega(n.dataset.mega)); n.addEventListener('mouseleave', hideMega); });
  $('#mega').addEventListener('mouseenter', () => clearTimeout(megaTimer)); $('#mega').addEventListener('mouseleave', hideMega);
  $('#mega').addEventListener('click', () => ($('#mega').hidden = true));
  addEventListener('hashchange', route);
  addEventListener('scroll', () => $('#top').classList.toggle('solid', scrollY > 10), { passive: true });
  setInterval(() => promo(1), 6000);
}

async function init() {
  data = await (await fetch('data/products.json')).json();
  cart = cart.filter((r) => find(r.id) && (r.color || 0) < find(r.id).colors.length);          // drop rows of products that no longer exist
  write(CART, cart); favs = new Set([...favs].filter((id) => find(id))); write(FAVS, [...favs]);
  promo(0); counters(); wire(); route();
  mountSketchfab();
}
init();
