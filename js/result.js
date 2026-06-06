const SEASON_GRADIENTS = {
  spring: 'linear-gradient(135deg, #E0304A, #FF8090, #FFB8C8)',
  summer: 'linear-gradient(135deg, #6A5090, #9B7BB5, #D4C0E8)',
  autumn: 'linear-gradient(135deg, #8B3808, #BF5C0E, #E8A830)',
  winter: 'linear-gradient(135deg, #1A3E90, #2E6EC8, #7AB0E8)',
};

const SUBTYPE_TO_KEY = {
  '봄웜 라이트':    'spring-light',
  '봄웜 브라이트':  'spring-bright',
  '봄웜 트루':      'spring-true',
  '여름쿨 라이트':  'summer-light',
  '여름쿨 뮤트':    'summer-mute',
  '여름쿨 트루':    'summer-true',
  '가을웜 뮤트':    'autumn-mute',
  '가을웜 딥':      'autumn-deep',
  '가을웜 트루':    'autumn-true',
  '겨울쿨 브라이트': 'winter-bright',
  '겨울쿨 딥':      'winter-deep',
  '겨울쿨 트루':    'winter-true',
};

const DEMO_PRESETS = {
  'spring-bright': { season:'spring', subtype:'봄웜 브라이트', scores:{warm:3,cool:0,light:2,dark:1,bright:3,muted:0,clear:3,grayish:0} },
  'spring-true':   { season:'spring', subtype:'봄웜 트루',     scores:{warm:3,cool:0,light:2,dark:1,bright:2,muted:1,clear:2,grayish:1} },
  'spring-light':  { season:'spring', subtype:'봄웜 라이트',   scores:{warm:3,cool:0,light:3,dark:0,bright:1,muted:2,clear:3,grayish:0} },
  'summer-light':  { season:'summer', subtype:'여름쿨 라이트', scores:{warm:0,cool:3,light:3,dark:0,bright:0,muted:3,clear:2,grayish:1} },
  'summer-true':   { season:'summer', subtype:'여름쿨 트루',   scores:{warm:0,cool:3,light:2,dark:1,bright:1,muted:2,clear:2,grayish:1} },
  'summer-mute':   { season:'summer', subtype:'여름쿨 뮤트',   scores:{warm:0,cool:3,light:2,dark:1,bright:0,muted:3,clear:0,grayish:3} },
  'autumn-mute':   { season:'autumn', subtype:'가을웜 뮤트',   scores:{warm:3,cool:0,light:1,dark:2,bright:0,muted:3,clear:0,grayish:3} },
  'autumn-true':   { season:'autumn', subtype:'가을웜 트루',   scores:{warm:3,cool:0,light:1,dark:2,bright:1,muted:2,clear:2,grayish:1} },
  'autumn-deep':   { season:'autumn', subtype:'가을웜 딥',     scores:{warm:3,cool:0,light:0,dark:3,bright:0,muted:3,clear:1,grayish:2} },
  'winter-bright': { season:'winter', subtype:'겨울쿨 브라이트', scores:{warm:0,cool:3,light:1,dark:2,bright:3,muted:0,clear:3,grayish:0} },
  'winter-true':   { season:'winter', subtype:'겨울쿨 트루',   scores:{warm:0,cool:3,light:1,dark:2,bright:2,muted:1,clear:2,grayish:1} },
  'winter-deep':   { season:'winter', subtype:'겨울쿨 딥',     scores:{warm:0,cool:3,light:0,dark:3,bright:1,muted:2,clear:3,grayish:0} },
};

function buildDemoData(typeKey) {
  const preset = DEMO_PRESETS[typeKey];
  const si = (typeof SEASON_INFO !== 'undefined') ? SEASON_INFO[typeKey] : null;
  if (!preset || !si) return null;
  const worstSi = SEASON_INFO[si.worstKey] || {};
  return {
    key: typeKey,
    season: si.season,
    worstKey: si.worstKey,
    name: si.name,
    nameEn: si.nameEn,
    worstName: worstSi.name,
    description: si.description,
    subtype: preset.subtype,
    confidence: 75,
    scores: preset.scores,
    palette: si.palette,
    bestColors: si.bestColors,
    worstColors: si.worstColors,
    worstDesc: si.worstDesc,
    makeup: si.makeup,
    makeupAvoid: si.makeupAvoid,
    traits: si.traits,
    fashion: si.fashion,
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderAxisScores(scores) {
  const wrap = document.getElementById('scoreBreakdown');
  if (!wrap || !scores) return;
  const axes = [
    { label: '웜 vs 쿨',        a: 'warm',   b: 'cool',    aLabel: '웜',     bLabel: '쿨' },
    { label: '밝음 vs 어두움',   a: 'light',  b: 'dark',    aLabel: '밝음',   bLabel: '어두움' },
    { label: '선명 vs 부드러움', a: 'bright', b: 'muted',   aLabel: '선명',   bLabel: '부드러움' },
    { label: '청색 vs 탁색',     a: 'clear',  b: 'grayish', aLabel: '청',     bLabel: '탁' },
  ];
  wrap.innerHTML = '';
  axes.forEach(ax => {
    const aVal = scores[ax.a] || 0;
    const bVal = scores[ax.b] || 0;
    const total = aVal + bVal || 1;
    const aPct = Math.round((aVal / total) * 100);
    const dominant = aVal > bVal ? ax.aLabel : (bVal > aVal ? ax.bLabel : '동률');
    const row = document.createElement('div');
    row.className = 'score-row';
    row.innerHTML = `
      <div class="score-row-label">${escapeHtml(ax.label)} <span style="color:var(--orange-dark); margin-left:6px;">${escapeHtml(dominant)} 우세</span></div>
      <div class="score-row-bar">
        <span class="score-row-val">${escapeHtml(ax.aLabel)} ${aVal}</span>
        <div class="score-row-bar-bg"><div class="score-row-bar-fill" style="width:${aPct}%;"></div></div>
        <span class="score-row-val">${bVal} ${escapeHtml(ax.bLabel)}</span>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function renderBestColors(colors) {
  const wrap = document.getElementById('bestColorsGrid');
  if (!wrap || !colors) return;
  wrap.innerHTML = '';
  colors.forEach(c => {
    const item = document.createElement('div');
    item.className = 'palette-item';
    item.innerHTML = `<div class="palette-color" style="background:${c.hex};"></div><div class="palette-name">${escapeHtml(c.name)}</div>`;
    wrap.appendChild(item);
  });
}

function renderWorstColors(colors) {
  const wrap = document.getElementById('worstColorsGrid');
  if (!wrap || !colors) return;
  wrap.innerHTML = '';
  colors.slice(0, 6).forEach(c => {
    const item = document.createElement('div');
    item.className = 'avoid-item';
    item.innerHTML = `<div class="avoid-color" style="background:${c.hex};"></div><div class="avoid-name">${escapeHtml(c.name)}</div>`;
    wrap.appendChild(item);
  });
}

function renderTraits(traits) {
  const wrap = document.getElementById('traitsList');
  if (!wrap || !traits) return;
  wrap.innerHTML = '';
  traits.forEach(t => {
    const item = document.createElement('div');
    item.className = 'trait-item';
    item.innerHTML = `<div class="trait-dot"></div><div class="trait-text">${t}</div>`;
    wrap.appendChild(item);
  });
}

const MAKEUP_CAT_MAP = { '립 컬러': 'lip', '블러셔': 'blusher', '아이섀도우': 'eyeshadow', '파운데이션': 'foundation' };
let _makeupDataCache = null;

async function renderMakeup(items, typeKey) {
  const wrap = document.getElementById('makeupGrid');
  if (!wrap || !items) return;

  let products = null;
  if (typeKey) {
    try {
      if (!_makeupDataCache) _makeupDataCache = await fetch('data/makeup_data.json').then(r => r.json());
      products = _makeupDataCache[typeKey] || null;
    } catch(e) {}
  }

  wrap.innerHTML = '';
  items.forEach(m => {
    const catKey = MAKEUP_CAT_MAP[m.category];
    const prod = products && catKey ? products[catKey] : null;
    const prodHtml = prod ? `
      <a class="makeup-product-link" href="${escapeHtml(prod.url || '#')}" target="_blank" rel="noopener noreferrer">
        ${prod.image_url
          ? `<img class="makeup-product-thumb" src="${escapeHtml(prod.image_url)}" alt="${escapeHtml(prod.name)}" loading="lazy" onerror="this.style.background='#eee';this.removeAttribute('src');">`
          : `<div class="makeup-product-thumb"></div>`}
        <div class="makeup-product-info">
          <div class="makeup-product-info-name">${escapeHtml(prod.brand)} ${escapeHtml(prod.name)}</div>
          <div class="makeup-product-info-shade">${escapeHtml(prod.shade)}</div>
        </div>
      </a>` : '';
    const it = document.createElement('div');
    it.className = 'makeup-item';
    it.innerHTML = `
      <div class="makeup-category">${escapeHtml(m.category)}</div>
      <div class="makeup-value">${escapeHtml(m.value)}</div>
      ${prodHtml}
    `;
    wrap.appendChild(it);
  });
}

function renderFashion(fashion, worstColors) {
  const wrap = document.getElementById('fashionGrid');
  if (!wrap) return;
  const swatchHtml = arr => arr.map(c => `<div style="width:38px; height:38px; border-radius:8px; background:${c}; box-shadow:var(--shadow-sm);"></div>`).join('');
  const worstSwatchHtml = (worstColors || []).slice(0, 4).map(c =>
    `<div style="width:38px; height:38px; border-radius:8px; background:${c.hex}; box-shadow:var(--shadow-sm); opacity:0.7;"></div>`
  ).join('');
  wrap.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:0.82rem; font-weight:700; color:var(--orange); margin-bottom:10px; letter-spacing:0.05em;">베스트 컬러</div>
      <div style="display:flex; justify-content:center; gap:6px; flex-wrap:wrap;">${swatchHtml(fashion.best.colors)}</div>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-top:10px; line-height:1.5;">${escapeHtml(fashion.best.desc)}</p>
    </div>
    <div style="text-align:center;">
      <div style="font-size:0.82rem; font-weight:700; color:var(--text-medium); margin-bottom:10px; letter-spacing:0.05em;">포인트 컬러</div>
      <div style="display:flex; justify-content:center; gap:6px; flex-wrap:wrap;">${swatchHtml(fashion.point.colors)}</div>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-top:10px; line-height:1.5;">${escapeHtml(fashion.point.desc)}</p>
    </div>
    <div style="text-align:center;">
      <div style="font-size:0.82rem; font-weight:700; color:#C0605A; margin-bottom:10px; letter-spacing:0.05em;">피할 컬러</div>
      <div style="display:flex; justify-content:center; gap:6px; flex-wrap:wrap;">${worstSwatchHtml}</div>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-top:10px; line-height:1.5;">${(worstColors || []).slice(0, 4).map(c => escapeHtml(c.name)).join(', ')}</p>
    </div>
  `;
}

// ── 옷 추천 렌더링 ──────────────────────────────────────────────────────────
function hexToLab(hex) {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const lin = c => c > 0.04045 ? Math.pow((c+0.055)/1.055,2.4) : c/12.92;
  const lr = lin(r), lg = lin(g), lb = lin(b);
  const x = lr*0.4124564+lg*0.3575761+lb*0.1804375;
  const y = lr*0.2126729+lg*0.7151522+lb*0.0721750;
  const z = lr*0.0193339+lg*0.1191920+lb*0.9503041;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787*t+16/116;
  const fy = f(y), fx = f(x/0.95047), fz = f(z/1.08883);
  return [116*fy-16, 500*(fx-fy), 200*(fy-fz)];
}

function deltaE76(l1, l2) {
  return Math.sqrt((l1[0]-l2[0])**2 + (l1[1]-l2[1])**2 + (l1[2]-l2[2])**2);
}

async function renderClothes(subtype, seasonKey) {
  const section = document.getElementById('clothesSection');
  if (!section) return;

  const typeKey = SUBTYPE_TO_KEY[subtype] || null;

  let jsonData;
  try {
    const resp = await fetch('data/cloth_analysis.json');
    jsonData = await resp.json();
  } catch (_) {
    return;
  }

  const all = jsonData.items || [];

  const OPPOSITE = { spring: 'winter', summer: 'autumn', autumn: 'summer', winter: 'spring' };
  const oppSeason = OPPOSITE[seasonKey] || null;

  let items = [];
  if (typeKey) {
    items = all
      .filter(it => {
        if (!it.scores) return false;
        const myScore = it.scores[typeKey] ?? 999;
        if (!oppSeason) return true;
        const oppMin = Math.min(
          ...Object.keys(it.scores).filter(k => k.startsWith(oppSeason)).map(k => it.scores[k])
        );
        return myScore <= oppMin;
      })
      .sort((a, b) => (a.scores[typeKey] ?? 999) - (b.scores[typeKey] ?? 999));

    const si = (typeof SEASON_INFO !== 'undefined') ? SEASON_INFO[typeKey] : null;
    const bestLabs  = (si?.bestColors  || []).map(c => hexToLab(c.hex));
    const worstLabs = (si?.worstColors || []).map(c => hexToLab(c.hex));
    if (bestLabs.length > 0 && worstLabs.length > 0) {
      items = items.filter(it => {
        if (!it.lab) return true;
        const minBestDist  = Math.min(...bestLabs.map(bl => deltaE76(it.lab, bl)));
        const minWorstDist = Math.min(...worstLabs.map(wl => deltaE76(it.lab, wl)));
        return minWorstDist >= minBestDist;
      });
    }

    if (items.length < 6) {
      const usedIds = new Set(items.map(it => it.id));
      const achro = all
        .filter(it => it.achromatic && it.types.includes(typeKey) && !usedIds.has(it.id));
      items = [...items, ...achro];
    }
  }

  items = items.slice(0, 6);

  section.style.display = '';
  const grid = document.getElementById('clothesGrid');
  const emptyEl = document.getElementById('clothesEmpty');
  const tagEl = document.getElementById('clothesTypeTag');

  if (tagEl && typeKey) tagEl.textContent = typeKey;

  if (!items.length) {
    grid.style.display = 'none';
    emptyEl.style.display = '';
    return;
  }

  emptyEl.style.display = 'none';
  grid.innerHTML = '';
  items.forEach(it => {
    const card = document.createElement('a');
    card.href = it.product_url || '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.className = 'clothes-card';
    card.innerHTML = `
      <img class="clothes-card-img"
           src="${escapeHtml(it.image_url)}"
           alt="${escapeHtml(it.name)}"
           loading="lazy"
           onerror="this.style.background='#eee';this.removeAttribute('src');">
      <div class="clothes-card-body">
        <div class="clothes-card-brand">${escapeHtml(it.brand)}</div>
        <div class="clothes-card-name">${escapeHtml(it.name)}</div>
        <div class="clothes-card-footer">
          <span class="clothes-card-price">${it.price ? it.price.toLocaleString() + '원' : ''}</span>
          <span class="clothes-card-swatch" style="background:${escapeHtml(it.dominant_hex)};" title="${escapeHtml(it.dominant_hex)}"></span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ── 공통 렌더 ──────────────────────────────────────────────────────────────
function applyResultData(data) {
  if (data.name) document.getElementById('resultSeason').textContent = data.name;
  if (data.nameEn) document.getElementById('resultSeasonEn').textContent = data.nameEn;
  if (data.subtype) document.getElementById('resultSubtype').textContent = data.subtype;
  else document.getElementById('resultSubtype').style.display = 'none';
  if (data.description) document.getElementById('resultTagline').innerHTML = data.description;

  const gradKey = data.season || (data.key ? data.key.split('-')[0] : null);
  if (gradKey && SEASON_GRADIENTS[gradKey]) {
    const el = document.getElementById('resultSeason');
    el.style.background = SEASON_GRADIENTS[gradKey];
    el.style.webkitBackgroundClip = 'text';
    el.style.webkitTextFillColor = 'transparent';
    el.style.backgroundClip = 'text';
  }

  if (gradKey) document.body.dataset.season = gradKey;

  if (typeof data.confidence === 'number') {
    const pct = Math.max(0, Math.min(100, data.confidence));
    document.getElementById('resultConfidence').textContent = pct + '%';
    document.getElementById('resultConfidenceBar').style.width = pct + '%';
    document.getElementById('resultConfidenceText').textContent =
      pct >= 75 ? '단계별 비교에서 일관성이 매우 높았어요.' :
      pct >= 60 ? '대표 톤이 비교적 뚜렷하게 드러났어요.' :
                  '결과가 미묘했어요. 자연광에서 다시 진단해보세요.';
  }

  if (Array.isArray(data.palette)) {
    const prev = document.getElementById('resultPalettePreview');
    prev.innerHTML = '';
    data.palette.forEach((col, i) => {
      const d = document.createElement('div');
      d.className = 'result-swatch hero-swatch-anim';
      d.style.background = col;
      d.style.animationDelay = `${560 + i * 38}ms`;
      prev.appendChild(d);
    });
  }

  renderBestColors(data.bestColors);
  renderWorstColors(data.worstColors);
  document.getElementById('worstColorsDesc').textContent = data.worstDesc ||
    (data.worstName ? `${data.worstName} 계열의 색은 얼굴 가까이에서 피부를 칙칙하거나 창백하게 보이게 할 수 있어요.` : '');

  if (data.name) document.getElementById('traitsSeasonLabel').textContent = data.name;
  renderTraits(data.traits);
  renderMakeup(data.makeup, data.key);
  const avoidEl = document.getElementById('makeupAvoid');
  if (avoidEl && data.makeupAvoid) avoidEl.textContent = data.makeupAvoid;

  renderAxisScores(data.scores);
  if (data.fashion) renderFashion(data.fashion, data.worstColors);

  renderClothes(data.subtype, data.season || data.key.split('-')[0]);

  // 히어로 요소 순차 페이드업 애니메이션
  const heroElIds = [
    '.result-badge',
    '#resultSeason',
    '#resultSeasonEn',
    '#resultSubtype',
    '#resultTagline',
    '#confidenceSection',
  ];
  heroElIds.forEach((sel, i) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.classList.remove('hero-anim');
    void el.offsetWidth; // reflow로 애니메이션 리셋
    el.style.animationDelay = `${i * 90}ms`;
    el.classList.add('hero-anim');
  });
}

// ── 타입 브라우저 ──────────────────────────────────────────────────────────
const TYPE_BROWSER_GROUPS = [
  { label: '봄 웜톤',  keys: ['spring-bright', 'spring-true',  'spring-light'] },
  { label: '여름 쿨톤', keys: ['summer-light',  'summer-true',  'summer-mute']  },
  { label: '가을 웜톤', keys: ['autumn-mute',   'autumn-true',  'autumn-deep']  },
  { label: '겨울 쿨톤', keys: ['winter-deep',   'winter-true',  'winter-bright'] },
];

function renderTypeBrowser(myTypeKey, currentTypeKey) {
  const wrap = document.getElementById('typeBrowserGrid');
  if (!wrap || typeof SEASON_INFO === 'undefined') return;
  wrap.innerHTML = '';

  TYPE_BROWSER_GROUPS.forEach(group => {
    const col = document.createElement('div');
    col.className = 'type-browser-col';

    const label = document.createElement('div');
    label.className = 'type-browser-season-label';
    label.textContent = group.label;
    col.appendChild(label);

    group.keys.forEach(typeKey => {
      const si = SEASON_INFO[typeKey];
      if (!si) return;

      const isMyType   = typeKey === myTypeKey;
      const isCurrent  = typeKey === currentTypeKey;
      const isClickable = !isCurrent;

      const card = document.createElement(isClickable ? 'a' : 'div');
      card.className = 'type-browser-card' +
        (isMyType  ? ' is-my-type' : '') +
        (isCurrent && !isMyType ? ' is-current' : '');

      if (isClickable) {
        card.href = isMyType
          ? 'result.html'
          : `result.html?demo=${typeKey}&browse=1`;
      }

      if (isMyType) {
        const badge = document.createElement('div');
        badge.className = 'type-browser-badge';
        badge.textContent = '내 타입';
        card.appendChild(badge);
      }

      const swatches = document.createElement('div');
      swatches.className = 'type-browser-swatches';
      (si.bestColors || []).slice(0, 4).map(c => c.hex).forEach(hex => {
        const dot = document.createElement('div');
        dot.className = 'type-browser-swatch';
        dot.style.background = hex;
        swatches.appendChild(dot);
      });
      card.appendChild(swatches);

      const name = document.createElement('div');
      name.className = 'type-browser-name';
      name.textContent = si.name || typeKey;
      card.appendChild(name);

      col.appendChild(card);
    });

    wrap.appendChild(col);
  });
}

// ── 진입점 ────────────────────────────────────────────────────────────────
(function init() {
  const params = new URLSearchParams(location.search);
  const demoType = params.get('demo');
  const isBrowse = params.get('browse') === '1';

  let myTypeKey = null;
  try {
    const stored = JSON.parse(localStorage.getItem('cmt_result'));
    if (stored && stored.key) myTypeKey = stored.key;
  } catch (_) {}

  if (isBrowse) {
    const conf = document.getElementById('confidenceSection');
    if (conf) conf.style.display = 'none';
    const scoreSection = document.getElementById('scoreBreakdownSection');
    if (scoreSection) scoreSection.style.display = 'none';
  }

  if (demoType) {
    const demo = buildDemoData(demoType);
    if (demo) {
      if (!isBrowse) {
        try { localStorage.setItem('cmt_result', JSON.stringify(demo)); } catch (_) {}
      }
      applyResultData(demo);
      renderTypeBrowser(myTypeKey, demoType);
      return;
    }
  }

  let data = null;
  try { data = JSON.parse(localStorage.getItem('cmt_result')); } catch (_) {}
  if (data) {
    applyResultData(data);
    renderTypeBrowser(data.key, data.key);
  }
})();

// ── Toast ────────────────────────────────────────────────────────
let _toastTimer = null;
function showToast(msg) {
  let el = document.getElementById('shareToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'shareToast';
    el.className = 'share-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ── Share Card ────────────────────────────────────────────────────
let _shareData = null;
let _shareCamStream = null;
let _sharePhotoDataUrl = null;

function shareResult() {
  const raw = localStorage.getItem('cmt_result');
  _shareData = raw ? JSON.parse(raw) : null;
  if (!_shareData) { alert('진단 결과가 없어요.'); return; }
  document.getElementById('shareStep1').style.display = 'block';
  document.getElementById('shareStep2').style.display = 'none';
  document.getElementById('shareModal').style.display = 'flex';
  document.getElementById('shareCountdown').textContent = '';
  _sharePhotoDataUrl = null;
  _startShareCam();
}

async function _startShareCam() {
  const video = document.getElementById('shareCamVideo');
  const errEl = document.getElementById('shareCamError');
  const captureBtn = document.getElementById('shareCaptureBtn');
  try {
    _shareCamStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    video.srcObject = _shareCamStream;
    video.style.display = 'block';
    errEl.style.display = 'none';
    if (captureBtn) captureBtn.disabled = false;
  } catch (e) {
    video.style.display = 'none';
    errEl.style.display = 'block';
    errEl.innerHTML = `카메라를 사용할 수 없어요.<br><small style="color:var(--text-muted)">${e.name}: ${e.message}</small><br>사진 없이 카드를 만들게요.`;
    if (captureBtn) captureBtn.disabled = true;
  }
}

function closeShareModal() {
  document.getElementById('shareModal').style.display = 'none';
  if (_shareCamStream) { _shareCamStream.getTracks().forEach(t => t.stop()); _shareCamStream = null; }
}

async function startShareCountdown() {
  const nameInput = document.getElementById('shareNameInput');
  if (!nameInput.value.trim()) { showToast('먼저 이름을 입력해 주세요!'); nameInput.focus(); nameInput.style.borderColor = 'var(--orange)'; return; }
  nameInput.style.borderColor = '';
  const video = document.getElementById('shareCamVideo');
  const cdEl = document.getElementById('shareCountdown');
  document.querySelectorAll('#shareStep1 button').forEach(b => b.disabled = true);
  for (let i = 3; i >= 1; i--) {
    cdEl.textContent = i;
    await new Promise(r => setTimeout(r, 1000));
  }
  cdEl.textContent = '';
  if (video.srcObject && video.readyState >= 2) {
    const tmp = document.createElement('canvas');
    tmp.width = video.videoWidth || 480;
    tmp.height = video.videoHeight || 480;
    const tc = tmp.getContext('2d');
    tc.translate(tmp.width, 0);
    tc.scale(-1, 1);
    tc.drawImage(video, 0, 0);
    _sharePhotoDataUrl = tmp.toDataURL('image/jpeg', 0.9);
  }
  document.querySelectorAll('#shareStep1 button').forEach(b => b.disabled = false);
  _buildShareCard();
}

function skipSharePhoto() {
  const nameInput = document.getElementById('shareNameInput');
  if (!nameInput.value.trim()) { showToast('먼저 이름을 입력해 주세요!'); nameInput.focus(); nameInput.style.borderColor = 'var(--orange)'; return; }
  nameInput.style.borderColor = '';
  _sharePhotoDataUrl = null;
  _buildShareCard();
}

function retakeSharePhoto() {
  document.getElementById('shareStep2').style.display = 'none';
  document.getElementById('shareStep1').style.display = 'block';
  if (!_shareCamStream) _startShareCam();
}

async function _buildShareCard() {
  document.getElementById('shareStep1').style.display = 'none';
  document.getElementById('shareStep2').style.display = 'block';
  const canvas = document.getElementById('shareCardCanvas');
  canvas.classList.remove('share-card-visible');
  const name = (document.getElementById('shareNameInput').value || '').trim();
  await _drawShareCard(canvas, _sharePhotoDataUrl, name, _shareData);
  void canvas.offsetWidth; // reflow로 애니메이션 리셋
  canvas.classList.add('share-card-visible');
}

function downloadShareCard() {
  const canvas = document.getElementById('shareCardCanvas');
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'catch-my-tone-result.png';
  a.click();
}

async function nativeShareCard() {
  const canvas = document.getElementById('shareCardCanvas');
  canvas.toBlob(async blob => {
    const file = new File([blob], 'catch-my-tone-result.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Catch My Tone 퍼스널컬러 결과' }); }
      catch (_) {}
    } else { downloadShareCard(); }
  }, 'image/png');
}

async function _drawShareCard(canvas, photoSrc, userName, data) {
  const W = 360;
  const KO_FONT = '"Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  const cx = W / 2;
  const season = data.season || (data.key || '').split('-')[0] || 'spring';
  const CARD_COLORS = {
    spring: ['#FFD6E0', '#FF7090', '#C02840'],
    summer: ['#E0D0F0', '#8060B0', '#4A2880'],
    autumn: ['#F8D880', '#C85800', '#6A2000'],
    winter: ['#C0D8F8', '#2A68C0', '#081850'],
  };
  const [c1, c2, c3] = CARD_COLORS[season] || CARD_COLORS.spring;

  // ── 특징 줄바꿈 사전 계산 (높이 결정용) ──
  const traitFont = `11.5px ${KO_FONT}`;
  const maxTw = W - 72;
  const rawTraits = (data.traits || []).slice(0, 3).map(t => t.replace(/<[^>]*>/g, ''));
  const tempCtx = document.createElement('canvas').getContext('2d');
  tempCtx.font = traitFont;
  const wrappedTraits = rawTraits.map(t => _wrapText(tempCtx, '• ' + t, maxTw));
  const totalTraitLines = wrappedTraits.reduce((s, lines) => s + lines.length, 0);

  // ── 레이아웃 상수 ──
  const photoR = 68, photoY = 120;
  const baseY = photoY + photoR + 96;   // 284 — 베스트 컬러 라벨 y
  const divY  = baseY + 114;            // 398 — 구분선 y
  const lineH = 20;
  const H = divY + 36 + totalTraitLines * lineH + 58;

  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ── 배경 ──
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, c1); grad.addColorStop(0.5, c2); grad.addColorStop(1, c3);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  _shapeRoundRect(ctx, 20, 20, W - 40, H - 40, 18); ctx.fill();

  // ── 사진 ──
  if (photoSrc) {
    try {
      const img = await _loadShareImg(photoSrc);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, photoY, photoR, 0, Math.PI * 2); ctx.clip();
      const scale = Math.max((photoR * 2) / img.width, (photoR * 2) / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, cx - dw / 2, photoY - dh / 2, dw, dh);
      ctx.restore();
    } catch (_) { _sharePhotoFallback(ctx, cx, photoY, photoR); }
  } else { _sharePhotoFallback(ctx, cx, photoY, photoR); }
  ctx.beginPath(); ctx.arc(cx, photoY, photoR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.stroke();

  // ── 이름 + 타입 ──
  ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.font = `16px ${KO_FONT}`;
  ctx.fillText(`${userName} 님은`, cx, photoY + photoR + 38);
  ctx.fillStyle = 'white';
  ctx.font = `bold 26px ${KO_FONT}`;
  ctx.fillText(data.subtype || data.name || '', cx, photoY + photoR + 66);
  ctx.shadowBlur = 0;

  // ── 섹션 라벨 / 스와치 헬퍼 ──
  const swR = 17, swGap = 6;
  const drawSwatches = (colors, centerY, stroke) => {
    const tw = colors.length * (swR * 2 + swGap) - swGap;
    colors.forEach((c, i) => {
      const x = (W - tw) / 2 + i * (swR * 2 + swGap) + swR;
      ctx.beginPath(); ctx.arc(x, centerY, swR, 0, Math.PI * 2);
      ctx.fillStyle = c.hex; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
    });
  };
  const sectionLabel = (text, y) => {
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.60)';
    ctx.textAlign = 'center';
    ctx.fillText(text.toUpperCase(), cx, y);
  };

  // ── 베스트 / 워스트 컬러 ──
  sectionLabel('베스트 컬러', baseY);
  drawSwatches((data.bestColors || []).slice(0, 6), baseY + 22, 'rgba(255,255,255,0.5)');
  sectionLabel('워스트 컬러', baseY + 62);
  drawSwatches((data.worstColors || []).slice(0, 4), baseY + 84, 'rgba(255,255,255,0.25)');

  // ── 구분선 ──
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(44, divY); ctx.lineTo(W - 44, divY); ctx.stroke();

  // ── 특징 (줄바꿈 적용) ──
  sectionLabel('특징', divY + 18);
  ctx.font = traitFont;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.textAlign = 'left';
  let lineY = divY + 36;
  wrappedTraits.forEach(lines => {
    lines.forEach(line => { ctx.fillText(line, 36, lineY); lineY += lineH; });
  });

  // ── 브랜딩 ──
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.90)';
  ctx.font = 'bold 13px sans-serif'; ctx.fillText('🎨 Catch My Tone', cx, H - 32);
}

function _wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function _sharePhotoFallback(ctx, cx, cy, r) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
  ctx.font = `${r * 0.9}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillText('🐰', cx, cy);
  ctx.textBaseline = 'alphabetic';
}

function _shapeRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _loadShareImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
  });
}
