// ─── Stage definitions ───────────────────────────────────────────────────────
// Stage 1: 베이스 파운데이션 선택 (좌·우 호수 swatch)
// Stage 2~5: 비교 천 3쌍 (옵션 1 / 옵션 2 토글 → good 으로 선택 → ok 로 다음 단계)

const STAGE_TITLES = {
  1: { title: '베이스 파운데이션 선택', sub: '메이크업 추천 보조 데이터',
       desc: '웜 또는 쿨 베이스 파운데이션 중 피부에 가장 잘 맞는 번호를 손가락으로 가리켜 선택하세요. 최종 계절 판정이 아닌 메이크업 추천에 활용됩니다.' },
  2: { title: '웜톤 vs 쿨톤', sub: '베이스 톤 비교',
       desc: '얼굴 옆에 천을 대고 피부가 더 환해 보이는 쪽을 골라요. 1번(웜) / 2번(쿨) 손모양으로 천을 바꾸고, good 손모양으로 선택, OK 사인으로 다음 단계.' },
  3: { title: '저명도 vs 고명도', sub: '명도 비교',
       desc: '어두운 천과 밝은 천 중 얼굴이 더 살아 보이는 쪽을 골라요. 1번(저명도) / 2번(고명도) 손모양으로 천을 바꿔보세요.' },
  4: { title: '저채도 vs 고채도', sub: '채도 비교',
       desc: '선명한 색과 부드러운 색 중 더 잘 어울리는 쪽을 골라요. 1번(저채도) / 2번(고채도) 손모양으로 천을 바꿔보세요.' },
  5: { title: '청색 vs 탁색', sub: '청·탁 비교',
       desc: '맑은 색감과 차분한 색감 중 어떤 쪽이 더 어울리는지 비교해요. 1번(청색) / 2번(탁색) 손모양으로 천을 바꿔보세요.' },
};

// Stage metadata (axis, option keys). Pairs are selected dynamically from
// COMPARE_POOLS depending on the previous stages' results.
const COMPARE_STAGES = {
  2: { axis: 'tone',    opt1: { key: 'warm',   label: '웜' },      opt2: { key: 'cool',    label: '쿨' } },
  3: { axis: 'value',   opt1: { key: 'dark',   label: '저명도' },   opt2: { key: 'light',   label: '고명도' } },
  4: { axis: 'chroma',  opt1: { key: 'muted',  label: '저채도' },   opt2: { key: 'bright',  label: '고채도' } },
  5: { axis: 'clarity', opt1: { key: 'clear',  label: '청색' },     opt2: { key: 'grayish', label: '탁색' } },
};

// Pools of comparison pairs per stage × context.
// Stage 2 only has 'default' (decision begins here).
// Stage 3 branches on tone, stage 4 on tone+value, stage 5 on tentative season.
const COMPARE_POOLS = {
  2: {
    default: [
      { title: '핑크 비교',   opt1: { hex: '#F4A698', name: '웜핑크' },   opt2: { hex: '#F4A6C6', name: '쿨핑크' } },
      { title: '블루 비교',   opt1: { hex: '#88BBDD', name: '웜블루' },   opt2: { hex: '#7AA8E5', name: '쿨블루' } },
      { title: '베이직 비교', opt1: { hex: '#F5ECD7', name: '아이보리' }, opt2: { hex: '#FAFAFA', name: '화이트' } },
    ],
  },
  3: {
    warm: [
      { title: '옐로우 명도', opt1: { hex: '#C99A2A', name: '머스터드' },  opt2: { hex: '#FFF4B0', name: '크림옐로우' } },
      { title: '오렌지 명도', opt1: { hex: '#8B4513', name: '딥브라운' },  opt2: { hex: '#FFC9A8', name: '피치' } },
      { title: '레드 명도',   opt1: { hex: '#8B2030', name: '다크와인' },  opt2: { hex: '#FF8C7A', name: '코랄' } },
    ],
    cool: [
      { title: '블루 명도',   opt1: { hex: '#1F2D5C', name: '네이비' },    opt2: { hex: '#B6D4E8', name: '라이트블루' } },
      { title: '퍼플 명도',   opt1: { hex: '#3A2D5A', name: '딥플럼' },    opt2: { hex: '#D8C8E8', name: '라일락' } },
      { title: '명도 대비',   opt1: { hex: '#0F0F12', name: '블랙' },      opt2: { hex: '#FFFFFF', name: '화이트' } },
    ],
    neutral: [
      { title: '명도 대비',   opt1: { hex: '#0F0F12', name: '블랙' },         opt2: { hex: '#FFFFFF', name: '화이트' } },
      { title: '그레이 명도', opt1: { hex: '#3D3D3D', name: '차콜' },         opt2: { hex: '#D0D0D0', name: '라이트그레이' } },
      { title: '브라운 명도', opt1: { hex: '#3E2A1B', name: '다크브라운' },   opt2: { hex: '#D8B894', name: '라이트브라운' } },
    ],
  },
  4: {
    'warm-light': [ // 봄웜 후보 → 채도 비교
      { title: '코랄 채도',   opt1: { hex: '#C28A91', name: '더스티코랄' }, opt2: { hex: '#FF7F50', name: '비비드코랄' } },
      { title: '옐로우 채도', opt1: { hex: '#D4C58E', name: '스트로우' },   opt2: { hex: '#FFD700', name: '골드' } },
      { title: '그린 채도',   opt1: { hex: '#A6B89A', name: '세이지' },     opt2: { hex: '#5DD09B', name: '스프링그린' } },
    ],
    'warm-dark': [ // 가을웜 후보 → 채도 비교
      { title: '브릭 채도',   opt1: { hex: '#A5736F', name: '더스티벽돌' }, opt2: { hex: '#B5651D', name: '캐러멜' } },
      { title: '올리브 채도', opt1: { hex: '#7A7A5B', name: '머디올리브' }, opt2: { hex: '#808000', name: '올리브' } },
      { title: '브라운 채도', opt1: { hex: '#8B7B6F', name: '더스티브라운' },opt2: { hex: '#A0522D', name: '시에나' } },
    ],
    'cool-light': [ // 여름쿨 후보 → 채도 비교
      { title: '핑크 채도',   opt1: { hex: '#C8A2B3', name: '더스티핑크' },   opt2: { hex: '#FFB6C1', name: '라이트핑크' } },
      { title: '블루 채도',   opt1: { hex: '#7A8FA8', name: '더스티블루' },   opt2: { hex: '#88B0E8', name: '스카이블루' } },
      { title: '라일락 채도', opt1: { hex: '#A89BB1', name: '그레이라벤더' }, opt2: { hex: '#C8A8E0', name: '라일락' } },
    ],
    'cool-dark': [ // 겨울쿨 후보 → 채도 비교
      { title: '레드 채도',   opt1: { hex: '#7A4040', name: '다크와인' },    opt2: { hex: '#DC143C', name: '크림슨' } },
      { title: '블루 채도',   opt1: { hex: '#2C3E5C', name: '슬레이트' },    opt2: { hex: '#0F4C81', name: '클래식블루' } },
      { title: '퍼플 채도',   opt1: { hex: '#4A3A5C', name: '머디퍼플' },    opt2: { hex: '#7F00FF', name: '바이올렛' } },
    ],
  },
  5: {
    spring: [ // 봄웜 후보 → 청탁 비교
      { title: '코랄 청탁',   opt1: { hex: '#FF8868', name: '클리어코랄' },   opt2: { hex: '#D8A795', name: '살몬베이지' } },
      { title: '옐로우 청탁', opt1: { hex: '#FFE066', name: '클리어옐로우' }, opt2: { hex: '#D4C58E', name: '스트로우' } },
      { title: '그린 청탁',   opt1: { hex: '#5DD09B', name: '클리어그린' },   opt2: { hex: '#A6B89A', name: '세이지' } },
    ],
    summer: [ // 여름쿨 후보 → 청탁 비교
      { title: '라벤더 청탁', opt1: { hex: '#C6A6F0', name: '클리어라벤더' }, opt2: { hex: '#A89BB1', name: '그레이라벤더' } },
      { title: '핑크 청탁',   opt1: { hex: '#FF99CC', name: '클리어핑크' },   opt2: { hex: '#C8A2B3', name: '더스티핑크' } },
      { title: '블루 청탁',   opt1: { hex: '#7AA8E5', name: '클리어블루' },   opt2: { hex: '#7A8FA8', name: '더스티블루' } },
    ],
    autumn: [ // 가을웜 후보 → 청탁 비교
      { title: '브릭 청탁',     opt1: { hex: '#B5651D', name: '클리어캐러멜' }, opt2: { hex: '#8B7B6F', name: '더스티브라운' } },
      { title: '올리브 청탁',   opt1: { hex: '#808000', name: '클리어올리브' }, opt2: { hex: '#7A7A5B', name: '머디올리브' } },
      { title: '머스터드 청탁', opt1: { hex: '#DAA520', name: '골든머스터드' }, opt2: { hex: '#A89270', name: '더스티베이지' } },
    ],
    winter: [ // 겨울쿨 후보 → 청탁 비교
      { title: '코발트 청탁', opt1: { hex: '#0F4C81', name: '클리어코발트' }, opt2: { hex: '#3D5A7A', name: '그레이블루' } },
      { title: '마젠타 청탁', opt1: { hex: '#C71585', name: '클리어마젠타' }, opt2: { hex: '#7A4A60', name: '머디마젠타' } },
      { title: '레드 청탁',   opt1: { hex: '#DC143C', name: '클리어크림슨' }, opt2: { hex: '#7A4040', name: '머디와인' } },
    ],
  },
};

// Human-readable context label for the side panel.
const CONTEXT_LABELS = {
  3: { warm: '웜 계열 명도 비교', cool: '쿨 계열 명도 비교', neutral: '뉴트럴 명도 비교' },
  4: {
    'warm-light': '봄웜 후보 채도 비교', 'warm-dark': '가을웜 후보 채도 비교',
    'cool-light': '여름쿨 후보 채도 비교', 'cool-dark': '겨울쿨 후보 채도 비교',
  },
  5: { spring: '봄웜 청·탁 비교', summer: '여름쿨 청·탁 비교', autumn: '가을웜 청·탁 비교', winter: '겨울쿨 청·탁 비교' },
};

// ─── Global state ────────────────────────────────────────────────────────────
let currentStage = 1;
const totalUserStages = 5;

// Stage 1
let stage1Selection = null; // { tone: 'warm'|'cool', idx: 0..5, num: '13호'.. }
let stage1HoveredEl = null;
let stage1HoverStartTime = 0;
let stage1HoverLastSeen = 0;
let stage1HoverRafId = null;
const STAGE1_HOVER_DURATION = 1200;
// Tolerance for transient tracking loss: a brief gesture/hand drop within this
// window does NOT reset the dwell timer, so a steady point still completes.
const STAGE1_HOVER_GRACE = 260;

// Stage 2~5
let currentPairIdx = 0;
let currentChoice = null; // 'opt1' | 'opt2'
const stageResults = { 2: [], 3: [], 4: [], 5: [] }; // each is an array of 'opt1Key'|'opt2Key'
let activePairs = [];   // pairs being shown in the current stage (context-dependent)
let activeContextKey = 'default';
const stageContextHistory = { 2: 'default', 3: null, 4: null, 5: null };

// Accumulated attribute scores
const scores = {
  warm: 0, cool: 0,
  light: 0, dark: 0,
  bright: 0, muted: 0,
  clear: 0, grayish: 0,
};

// ─── Color conversion helpers ────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#','');
  return { r: parseInt(h.substring(0,2),16), g: parseInt(h.substring(2,4),16), b: parseInt(h.substring(4,6),16) };
}

function rgbToXyz(r, g, b) {
  let R = r / 255, G = g / 255, B = b / 255;
  R = R > 0.04045 ? Math.pow((R + 0.055)/1.055, 2.4) : R / 12.92;
  G = G > 0.04045 ? Math.pow((G + 0.055)/1.055, 2.4) : G / 12.92;
  B = B > 0.04045 ? Math.pow((B + 0.055)/1.055, 2.4) : B / 12.92;
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) * 100;
  const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722) * 100;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) * 100;
  return { X, Y, Z };
}

function xyzToLab(X, Y, Z) {
  const refX = 95.047, refY = 100.0, refZ = 108.883;
  let x = X / refX, y = Y / refY, z = Z / refZ;
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16/116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16/116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16/116);
  return { L: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

function rgbToLab(r, g, b) {
  const xyz = rgbToXyz(r, g, b);
  return xyzToLab(xyz.X, xyz.Y, xyz.Z);
}

// ─── White Balance (color constancy) ─────────────────────────────────────────
// Two calibration modes:
//   • 'white' (white-patch): the user holds a white sheet in the center ROI.
//     Gain = target / measured_channel  →  measured_channel × gain ≈ target.
//   • 'auto' (gray-world): the four image corners are assumed to average to a
//     neutral gray.  Gain = mean(measured) / channel_measured.
// Once calibrated, applyWB() rescales any extracted RGB so subsequent Lab
// analysis is invariant to the lighting color cast.
let wbGain = { r: 1, g: 1, b: 1 };
let wbMode = null;          // 'white' | 'auto'
let wbCalibrated = false;

function applyWB(rgb) {
  if (!wbCalibrated || !rgb) return rgb;
  return {
    r: Math.max(0, Math.min(255, Math.round(rgb.r * wbGain.r))),
    g: Math.max(0, Math.min(255, Math.round(rgb.g * wbGain.g))),
    b: Math.max(0, Math.min(255, Math.round(rgb.b * wbGain.b))),
  };
}

function sampleCenterROI(sizeRatio) {
  if (!videoEl || !videoEl.videoWidth) return null;
  const w = videoEl.videoWidth, h = videoEl.videoHeight;
  const sz = Math.floor(Math.min(w, h) * (sizeRatio || 0.25));
  const x = Math.floor((w - sz) / 2);
  const y = Math.floor((h - sz) / 2);
  return getAverageVideoRGB(x, y, sz, sz);
}

function sampleBackgroundRGB() {
  // Average the four corners — least likely to contain the face.
  if (!videoEl || !videoEl.videoWidth) return null;
  const w = videoEl.videoWidth, h = videoEl.videoHeight;
  const sz = Math.floor(Math.min(w, h) * 0.15);
  const pts = [
    { x: 0, y: 0 },
    { x: w - sz, y: 0 },
    { x: 0, y: h - sz },
    { x: w - sz, y: h - sz },
  ];
  const samples = [];
  pts.forEach(p => {
    const a = getAverageVideoRGB(p.x, p.y, sz, sz);
    if (a) samples.push(a);
  });
  if (!samples.length) return null;
  const sum = samples.reduce((a, s) => ({ r: a.r + s.r, g: a.g + s.g, b: a.b + s.b }),
                              { r: 0, g: 0, b: 0 });
  return { r: sum.r / samples.length, g: sum.g / samples.length, b: sum.b / samples.length };
}

function calibrateFromWhitePaper() {
  const rgb = sampleCenterROI(0.25);
  if (!rgb) return false;
  // Use the brightest measured channel as the white target so we never have
  // to brighten beyond 255.  Clamp the target away from extreme highlights.
  const target = Math.min(245, Math.max(rgb.r, rgb.g, rgb.b, 180));
  wbGain.r = target / Math.max(1, rgb.r);
  wbGain.g = target / Math.max(1, rgb.g);
  wbGain.b = target / Math.max(1, rgb.b);
  wbCalibrated = true;
  return true;
}

function calibrateFromBackground() {
  const rgb = sampleBackgroundRGB();
  if (!rgb) return false;
  const gray = (rgb.r + rgb.g + rgb.b) / 3;
  wbGain.r = gray / Math.max(1, rgb.r);
  wbGain.g = gray / Math.max(1, rgb.g);
  wbGain.b = gray / Math.max(1, rgb.b);
  wbCalibrated = true;
  return true;
}

// ─── WB modal / ROI flow ─────────────────────────────────────────────────────
function openWBModal() {
  document.getElementById('wbModalBackdrop').classList.add('visible');
}

function closeWBModal() {
  document.getElementById('wbModalBackdrop').classList.remove('visible');
}

function showWhitePaperUI() {
  document.getElementById('wbRoiBox').style.display = 'block';
  document.getElementById('wbInstructionBar').style.display = 'flex';
}

function hideWhitePaperUI() {
  document.getElementById('wbRoiBox').style.display = 'none';
  document.getElementById('wbInstructionBar').style.display = 'none';
}

function showWBToast(text, success) {
  const el = document.getElementById('wbToast');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('success', !!success);
  el.classList.add('visible');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('visible'), 2400);
}

function finishCalibration(ok, label) {
  showWBToast(ok ? `${label} ✓  R×${wbGain.r.toFixed(2)} G×${wbGain.g.toFixed(2)} B×${wbGain.b.toFixed(2)}`
                 : `${label} 실패 — 기본값으로 진행`, ok);
  // Now reveal stage 1 (was deferred while modal was up).
  if (currentStage === 1) {
    showStage1UI();
    setStatus('손가락으로 파운데이션 색상을 가리켜 선택하세요 ☝️');
  }
}

function chooseWBMode(mode) {
  wbMode = mode;
  closeWBModal();
  if (mode === 'auto') {
    // Let the camera auto-exposure settle, then sample corners.
    setStatus('자동 보정 중…');
    setTimeout(() => {
      const ok = calibrateFromBackground();
      finishCalibration(ok, '자동 보정');
    }, 900);
  } else if (mode === 'white') {
    setStatus('흰 종이를 박스 안에 보여주세요');
    showWhitePaperUI();
  }
}

function performWhitePaperCalibration() {
  const ok = calibrateFromWhitePaper();
  hideWhitePaperUI();
  finishCalibration(ok, '흰 종이 보정');
}

// "이전" — go back from white-paper step to the mode-selection modal.
function backToWBModeSelect() {
  hideWhitePaperUI();
  wbMode = null;
  openWBModal();
  setStatus('환경 보정 방법을 선택해주세요');
}

// ─── Stage 1 (foundation picker) ─────────────────────────────────────────────
function showStage1UI() {
  document.getElementById('stage1CoolSide').style.display = 'flex';
  document.getElementById('stage1WarmSide').style.display = 'flex';
  document.getElementById('stage1ConfirmBar').style.display = 'flex';
}

function hideStage1UI() {
  document.getElementById('stage1CoolSide').style.display = 'none';
  document.getElementById('stage1WarmSide').style.display = 'none';
  document.getElementById('stage1ConfirmBar').style.display = 'none';
}

function clearStage1Hover() {
  if (stage1HoverRafId) { cancelAnimationFrame(stage1HoverRafId); stage1HoverRafId = null; }
  if (stage1HoveredEl) {
    stage1HoveredEl.classList.remove('hovered');
    const prog = stage1HoveredEl.querySelector('.stage0-hover-progress');
    if (prog) prog.style.transform = 'scaleX(0)';
    stage1HoveredEl = null;
  }
  stage1HoverStartTime = 0;
  stage1HoverLastSeen = 0;
}

// Begin (or restart) the dwell on a freshly-targeted swatch.
function startStage1Hover(el) {
  if (stage1HoverRafId) cancelAnimationFrame(stage1HoverRafId);
  stage1HoveredEl = el;
  el.classList.add('hovered');
  stage1HoverStartTime = Date.now();
  stage1HoverLastSeen = Date.now();
  stage1HoverRafId = requestAnimationFrame(stage1HoverTick);
}

// Self-sustaining rAF loop: advances the progress bar and fires the selection
// once the dwell completes.  A short grace window (STAGE1_HOVER_GRACE) keeps the
// dwell alive across brief tracking dropouts so jitter doesn't reset it.
function stage1HoverTick() {
  stage1HoverRafId = null;
  const el = stage1HoveredEl;
  if (!el) return;
  const now = Date.now();
  if (now - stage1HoverLastSeen > STAGE1_HOVER_GRACE) { clearStage1Hover(); return; }

  const prog = el.querySelector('.stage0-hover-progress');
  const ratio = Math.min((now - stage1HoverStartTime) / STAGE1_HOVER_DURATION, 1);
  if (prog) prog.style.transform = `scaleX(${ratio})`;
  if (ratio >= 1) { selectStage1Swatch(el); clearStage1Hover(); return; }
  stage1HoverRafId = requestAnimationFrame(stage1HoverTick);
}

function selectStage1Swatch(el) {
  document.querySelectorAll('.stage0-swatch-item.selected').forEach(e => {
    e.classList.remove('selected');
    const p = e.querySelector('.stage0-hover-progress');
    if (p) p.style.transform = 'scaleX(0)';
  });
  el.classList.remove('hovered');
  el.classList.add('selected');
  const prog = el.querySelector('.stage0-hover-progress');
  if (prog) prog.style.transform = 'scaleX(1)';

  const labels = ['13호', '15호', '17호', '21호', '23호', '25호'];
  const idx = parseInt(el.dataset.idx);
  stage1Selection = { tone: el.dataset.tone, idx, num: labels[idx] };
  const toneLabel = el.dataset.tone === 'warm' ? '웜' : '쿨';
  document.getElementById('stage1SelInfo').textContent = `${toneLabel} 베이스 ${labels[idx]} 선택됨 ✓`;
  document.getElementById('stage1OkBtn').removeAttribute('disabled');
  renderStageProgress();
}

function clickStage1Swatch(el) {
  clearStage1Hover();
  selectStage1Swatch(el);
}

function resetStage1() {
  document.querySelectorAll('.stage0-swatch-item.selected').forEach(e => {
    e.classList.remove('selected');
    const p = e.querySelector('.stage0-hover-progress');
    if (p) p.style.transform = 'scaleX(0)';
  });
  stage1Selection = null;
  document.getElementById('stage1SelInfo').textContent = '손가락으로 색상을 가리켜 선택하세요';
  document.getElementById('stage1OkBtn').setAttribute('disabled', '');
}

function confirmStage1() {
  if (!stage1Selection) return;
  clearStage1Hover();
  hideStage1UI();
  enterStage(2);
}

// detect fingertip pointing for stage 1
function detectStage1Pointing(lm) {
  if (!canvasEl || canvasEl.width === 0) return;

  const cx = lm[8].x * canvasEl.width;
  const cy = lm[8].y * canvasEl.height;
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 140, 66, 0.28)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 140, 66, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FF8C42';
  ctx.fill();

  const cRect = canvasEl.getBoundingClientRect();
  const fingerX = cRect.left + (1 - lm[8].x) * cRect.width;
  const fingerY = cRect.top  + lm[8].y       * cRect.height;

  let found = null;
  document.querySelectorAll('.stage0-swatch-item').forEach(sw => {
    const r = sw.getBoundingClientRect();
    if (fingerX >= r.left && fingerX <= r.right &&
        fingerY >= r.top  && fingerY <= r.bottom) {
      found = sw;
    }
  });

  if (found) {
    if (found === stage1HoveredEl) {
      // Still on the same swatch — keep the dwell alive.
      stage1HoverLastSeen = Date.now();
    } else {
      // Moved onto a new swatch — restart the dwell here.
      clearStage1Hover();
      startStage1Hover(found);
    }
  }
  // If the fingertip is over no swatch, we simply stop refreshing lastSeen;
  // the grace window in stage1HoverTick() then clears the dwell.
}

// ─── Compare stages (2~5) ────────────────────────────────────────────────────
function showCompareUI() {
  document.getElementById('compareInfoBar').style.display = 'flex';
  document.getElementById('compareOptionsBar').style.display = 'flex';
}

function hideCompareUI() {
  document.getElementById('compareInfoBar').style.display = 'none';
  document.getElementById('compareOptionsBar').style.display = 'none';
  document.getElementById('clothDrape').classList.remove('visible');
}

// Decide which pool to load for the given stage, based on accumulated scores.
function computeStageContextKey(stage) {
  if (stage === 2) return 'default';

  if (stage === 3) {
    if (scores.warm > scores.cool) return 'warm';
    if (scores.cool > scores.warm) return 'cool';
    return 'neutral';
  }

  if (stage === 4) {
    const tone  = scores.warm  >= scores.cool  ? 'warm'  : 'cool';
    const value = scores.light >= scores.dark  ? 'light' : 'dark';
    return `${tone}-${value}`;
  }

  if (stage === 5) {
    const tone  = scores.warm   >= scores.cool   ? 'warm'  : 'cool';
    const value = scores.light  >= scores.dark   ? 'light' : 'dark';
    if (tone === 'warm' && value === 'light') return 'spring';
    if (tone === 'warm' && value === 'dark')  return 'autumn';
    if (tone === 'cool' && value === 'light') return 'summer';
    return 'winter';
  }

  return 'default';
}

function loadStagePairs(stage) {
  const ctxKey = computeStageContextKey(stage);
  activeContextKey = ctxKey;
  stageContextHistory[stage] = ctxKey;
  const pool = COMPARE_POOLS[stage] && COMPARE_POOLS[stage][ctxKey];
  // Clone so pushing bonus pairs doesn't mutate the pool.
  activePairs = pool ? pool.map(p => ({ ...p })) : [];
}

function renderCompareStage() {
  const def = COMPARE_STAGES[currentStage];
  if (!def || activePairs.length === 0) return;
  const pair = activePairs[currentPairIdx];
  if (!pair) return;

  document.getElementById('comparePairIdx').textContent = `${currentPairIdx + 1} / ${activePairs.length}`;
  document.getElementById('comparePairTitle').textContent = pair.title;

  // pair dots
  const dotsEl = document.getElementById('comparePairDots');
  dotsEl.innerHTML = '';
  for (let i = 0; i < activePairs.length; i++) {
    const d = document.createElement('div');
    d.className = 'pair-dot';
    if (i < stageResults[currentStage].length) d.classList.add('done');
    else if (i === currentPairIdx) d.classList.add('current');
    dotsEl.appendChild(d);
  }

  // options (no warm/cool category hints — keep the choice neutral)
  document.getElementById('compareOpt1Swatch').style.background = pair.opt1.hex;
  document.getElementById('compareOpt1Name').textContent = pair.opt1.name;
  document.getElementById('compareOpt2Swatch').style.background = pair.opt2.hex;
  document.getElementById('compareOpt2Name').textContent = pair.opt2.name;

  // reset choice highlight & cloth
  document.getElementById('compareOpt1').classList.remove('active');
  document.getElementById('compareOpt2').classList.remove('active');
  document.getElementById('clothDrape').classList.remove('visible');
  currentChoice = null;
}

function showCloth(which) {
  const def = COMPARE_STAGES[currentStage];
  if (!def) return;
  const pair = activePairs[currentPairIdx];
  if (!pair) return;
  const opt1El = document.getElementById('compareOpt1');
  const opt2El = document.getElementById('compareOpt2');
  const drape  = document.getElementById('clothDrape');

  if (which === 'opt1') {
    opt1El.classList.add('active');
    opt2El.classList.remove('active');
    drape.style.background = pair.opt1.hex;
    drape.classList.add('visible');
    currentChoice = 'opt1';
  } else if (which === 'opt2') {
    opt2El.classList.add('active');
    opt1El.classList.remove('active');
    drape.style.background = pair.opt2.hex;
    drape.classList.add('visible');
    currentChoice = 'opt2';
  } else {
    opt1El.classList.remove('active');
    opt2El.classList.remove('active');
    drape.classList.remove('visible');
    currentChoice = null;
  }

  // Force a fresh position calc the moment the cloth becomes visible
  // (FaceMesh may not have fired since stage entry, leaving width/height at 0).
  updateClothPosition();
}

function confirmCurrentPair() {
  if (!currentChoice) return;
  const def = COMPARE_STAGES[currentStage];
  const key = currentChoice === 'opt1' ? def.opt1.key : def.opt2.key;
  scores[key] = (scores[key] || 0) + 1;
  stageResults[currentStage].push(key);

  if (currentPairIdx < activePairs.length - 1) {
    currentPairIdx++;
    renderCompareStage();
    setStatus(`${currentPairIdx + 1}번째 비교 — 1번/2번 손모양으로 천을 바꿔보세요`);
  } else {
    renderStageProgress();
    setStatus('이번 단계 비교 완료! OK 사인으로 다음 단계로 ✋');
    showStageProgressActions();
  }
  renderStageProgress();
}

function isCurrentStageDone() {
  if (currentStage === 1) return !!stage1Selection;
  if (activePairs.length === 0) return false;
  return stageResults[currentStage].length >= activePairs.length;
}

function advanceFromCompare() {
  if (!isCurrentStageDone()) return;
  if (currentStage < totalUserStages) {
    enterStage(currentStage + 1);
  } else {
    finishAndAnalyze();
  }
}

// ─── Stage transitions / progress UI ─────────────────────────────────────────
function enterStage(stage) {
  currentStage = stage;
  currentPairIdx = 0;
  currentChoice = null;

  // For compare stages, pick the context-specific pool *before* rendering.
  if (stage >= 2 && stage <= 5) {
    loadStagePairs(stage);
    // FaceMesh(천 추적)는 비교 단계에서만 필요 — 여기서 처음 init한다.
    if (videoEl && !faceMeshInstance) initFaceMesh();
  }

  updateProgress();
  renderStageCard();
  renderStageProgress();

  // UI swap (only show camera-overlay UI if camera has started)
  const cameraReady = !!videoEl;
  if (stage === 1) {
    hideCompareUI();
    if (cameraReady) showStage1UI();
    setStatus(cameraReady ? '손가락으로 파운데이션 색상을 가리켜 선택하세요 ☝️' : '');
  } else if (stage >= 2 && stage <= 5) {
    hideStage1UI();
    if (cameraReady) showCompareUI();
    renderCompareStage();
    const ctxLabel = CONTEXT_LABELS[stage]?.[activeContextKey];
    const intro = ctxLabel ? `${ctxLabel} — 1번/2번 손모양으로 천을 바꾸고 good으로 선택` : '1번/2번 손모양으로 천을 비교하고, good 손모양으로 선택하세요';
    setStatus(cameraReady ? intro : '');
  } else if (stage > 5) {
    hideStage1UI();
    hideCompareUI();
  }

  showStageProgressActions();
}

function updateProgress() {
  const userStep = Math.min(totalUserStages, Math.max(1, currentStage));
  const pct = Math.round(((userStep - 1) / totalUserStages) * 100);
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('progressLabel');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = `${userStep} / ${totalUserStages} 단계`;
}

function renderStageCard() {
  const t = STAGE_TITLES[currentStage];
  if (!t) return;
  document.getElementById('stageBadge').textContent = String(currentStage);
  document.getElementById('stageBadgeTitle').textContent = t.title;
  const ctxLabel = CONTEXT_LABELS[currentStage]?.[activeContextKey];
  document.getElementById('stageBadgeSubtitle').textContent = ctxLabel || t.sub;
  document.getElementById('stageDescription').textContent = t.desc;
}

function stagePairsTotal(s) {
  if (s === currentStage) return activePairs.length || 0;
  const ctx = stageContextHistory[s];
  if (ctx && COMPARE_POOLS[s]?.[ctx]) {
    return COMPARE_POOLS[s][ctx].length;
  }
  return 3;
}

function renderStageProgress() {
  const wrap = document.getElementById('stageProgressList');
  wrap.innerHTML = '';
  for (let s = 1; s <= totalUserStages; s++) {
    const row = document.createElement('div');
    row.className = 'stage-progress-row';

    const done = (s === 1 && stage1Selection)
      || (s >= 2 && stageResults[s]?.length >= stagePairsTotal(s) && stageResults[s].length > 0);
    if (s === currentStage) row.classList.add('current');
    else if (done) row.classList.add('done');

    const num = document.createElement('div');
    num.className = 'stage-progress-num';
    num.textContent = done ? '✓' : String(s);

    const title = document.createElement('div');
    title.className = 'stage-progress-title';
    title.textContent = STAGE_TITLES[s].title;

    const result = document.createElement('div');
    result.className = 'stage-progress-result';
    if (s === 1 && stage1Selection) {
      result.textContent = `${stage1Selection.tone === 'warm' ? '웜' : '쿨'} ${stage1Selection.num}`;
    } else if (s >= 2 && stageResults[s]?.length) {
      result.textContent = summarizeStageResult(s);
    } else if (s >= 2 && s === currentStage && CONTEXT_LABELS[s]?.[activeContextKey]) {
      // show context label preview while in progress
      result.textContent = activeContextKey;
    }

    row.appendChild(num);
    row.appendChild(title);
    row.appendChild(result);
    wrap.appendChild(row);
  }
}

function summarizeStageResult(s) {
  const def = COMPARE_STAGES[s];
  if (!def) return '';
  const opt1Cnt = stageResults[s].filter(k => k === def.opt1.key).length;
  const opt2Cnt = stageResults[s].filter(k => k === def.opt2.key).length;
  if (opt1Cnt > opt2Cnt) return def.opt1.label;
  if (opt2Cnt > opt1Cnt) return def.opt2.label;
  return '중립';
}

function showStageProgressActions() {
  const nextBtn = document.getElementById('nextStageBtn');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const done = isCurrentStageDone();

  if (currentStage === 1) {
    // stage 1 has its own confirm bar in camera area
    nextBtn.style.display = 'none';
    analyzeBtn.style.display = 'none';
  } else if (currentStage >= 2 && currentStage < totalUserStages) {
    nextBtn.style.display = 'block';
    analyzeBtn.style.display = 'none';
    nextBtn.toggleAttribute('disabled', !done);
  } else if (currentStage === totalUserStages) {
    nextBtn.style.display = 'none';
    analyzeBtn.style.display = 'block';
    analyzeBtn.toggleAttribute('disabled', !done);
  }
}

// ─── Final analysis & result ─────────────────────────────────────────────────
function finishAndAnalyze() {
  if (!isCurrentStageDone()) return;

  // 6단계: 큰 계절 후보
  const tone   = scores.warm  > scores.cool    ? 'warm'  : (scores.cool    > scores.warm  ? 'cool'    : 'neutral');
  const value  = scores.light > scores.dark    ? 'light' : (scores.dark    > scores.light ? 'dark'    : 'medium');
  const chroma = scores.bright > scores.muted  ? 'bright': (scores.muted   > scores.bright? 'muted'   : 'mid');
  const clarity= scores.clear > scores.grayish ? 'clear' : (scores.grayish > scores.clear ? 'grayish' : 'mid');

  let seasonKey;
  if (tone === 'warm' && value === 'light') seasonKey = 'spring';
  else if (tone === 'warm' && value === 'dark') seasonKey = 'autumn';
  else if (tone === 'cool' && value === 'light') seasonKey = 'summer';
  else if (tone === 'cool' && value === 'dark') seasonKey = 'winter';
  else if (tone === 'warm') seasonKey = chroma === 'bright' ? 'spring' : 'autumn';
  else if (tone === 'cool') seasonKey = chroma === 'bright' ? 'winter' : 'summer';
  else seasonKey = chroma === 'bright' ? 'spring' : 'autumn';

  // 7단계: 세부 타입
  const subtype = determineSubtype(seasonKey, { tone, value, chroma, clarity });

  // 세부타입 한글명 → 12타입 영문 키
  const SUBTYPE_TO_KEY = {
    '봄웜 브라이트': 'spring-bright', '봄웜 트루': 'spring-true', '봄웜 라이트': 'spring-light',
    '여름쿨 라이트': 'summer-light',  '여름쿨 트루': 'summer-true', '여름쿨 뮤트': 'summer-mute',
    '가을웜 뮤트':  'autumn-mute',   '가을웜 트루': 'autumn-true', '가을웜 딥': 'autumn-deep',
    '겨울쿨 딥':    'winter-deep',   '겨울쿨 트루': 'winter-true', '겨울쿨 브라이트': 'winter-bright',
  };
  const typeKey  = SUBTYPE_TO_KEY[subtype] || seasonKey;
  const si       = SEASON_INFO[typeKey] || SEASON_INFO[seasonKey] || {};
  const worstKey = si.worstKey || seasonKey;
  const wsi      = SEASON_INFO[worstKey] || {};

  // 신뢰도 계산: 4개 축의 우세도 평균
  const axes = [
    [scores.warm,  scores.cool],
    [scores.light, scores.dark],
    [scores.bright,scores.muted],
    [scores.clear, scores.grayish],
  ];
  let confidenceSum = 0;
  axes.forEach(([a, b]) => {
    const total = a + b;
    if (total > 0) confidenceSum += Math.abs(a - b) / total;
  });
  const confidence = Math.round((confidenceSum / axes.length) * 50 + 50); // 50~100 range

  const result = {
    key: typeKey,
    season: seasonKey,
    worstKey,
    name: si.name,
    nameEn: si.nameEn,
    worstName: wsi.name,
    description: si.description,
    subtype,
    confidence,
    scores: { ...scores },
    derived: { tone, value, chroma, clarity },
    foundation: stage1Selection,
    palette: si.palette,
    bestColors: si.bestColors,
    worstColors: si.worstColors,
    worstDesc: si.worstDesc,
    makeup: si.makeup,
    makeupAvoid: si.makeupAvoid,
    traits: si.traits,
    fashion: si.fashion,
    stageResults: { ...stageResults },
    stageContexts: { ...stageContextHistory },
  };

  try { localStorage.setItem('cmt_result', JSON.stringify(result)); } catch (e) {}
  window.location.href = 'result.html';
}

function determineSubtype(seasonKey, der) {
  // 명세서 기반 세부 타입
  if (seasonKey === 'spring') {
    if (der.value === 'light' && der.clarity === 'clear') return '봄웜 라이트';
    if (der.chroma === 'bright' && der.clarity === 'clear') return '봄웜 브라이트';
    return '봄웜 트루';
  }
  if (seasonKey === 'summer') {
    if (der.value === 'light' && der.chroma === 'muted') return '여름쿨 라이트';
    if (der.chroma === 'muted' && der.clarity === 'grayish') return '여름쿨 뮤트';
    return '여름쿨 트루';
  }
  if (seasonKey === 'autumn') {
    if (der.chroma === 'muted' && der.clarity === 'grayish') return '가을웜 뮤트';
    if (der.value === 'dark' && der.chroma === 'muted') return '가을웜 딥';
    return '가을웜 트루';
  }
  if (seasonKey === 'winter') {
    if (der.chroma === 'bright' && der.clarity === 'clear') return '겨울쿨 브라이트';
    if (der.value === 'dark' && der.clarity === 'clear') return '겨울쿨 딥';
    return '겨울쿨 트루';
  }
  return '';
}

// ─── Season info — season-data.js 에서 로드 (diagnosis.html 에서 먼저 include) ──

// ─── Hand gesture detection ──────────────────────────────────────────────────
let videoEl = null;
let canvasEl = null;
let ctx = null;
let handsInstance = null;
let faceMeshInstance = null;
let frameLoopActive = false;
let faceTurn = false;   // 2~5단계 격프레임 토글 (hands ↔ face_mesh)
let lastGestureTime = 0;
const GESTURE_COOLDOWN = 900;
let faceLabSample = null;
let faceLandmarksLatest = null;
let faceLostFrames = 0;

async function startCamera() {
  const placeholder = document.getElementById('cameraPlaceholder');
  const cameraArea  = document.getElementById('cameraArea');
  const btn = document.getElementById('startCameraBtn');

  if (btn) { btn.textContent = '연결 중…'; btn.setAttribute('disabled', ''); }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    });

    videoEl = document.createElement('video');
    videoEl.srcObject = stream;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = true;
    videoEl.className = 'camera-video';

    canvasEl = document.createElement('canvas');
    canvasEl.className = 'camera-canvas';

    placeholder.replaceWith(videoEl);
    cameraArea.insertBefore(canvasEl, document.getElementById('clothDrape'));

    await videoEl.play();

    // Stage 2~5 (rare on first load, but keep behavior consistent).
    if (currentStage >= 2 && currentStage <= 5) { showCompareUI(); renderCompareStage(); }

    setStatus('손 인식 모델 로딩 중…');
    initHands();
    // FaceMesh는 1단계에선 쓰지 않으므로 2단계 진입 시 init한다 (enterStage).
    // 1단계를 hands 전용으로 두면 두 wasm 모듈 충돌 위험이 사라진다.
    if (currentStage >= 2 && currentStage <= 5) initFaceMesh();

    // Stage 1: open the WB calibration modal first.  showStage1UI() runs
    // after the user picks a calibration mode (see finishCalibration()).
    if (currentStage === 1) {
      // Give the video a moment to deliver real frames before sampling.
      setTimeout(() => openWBModal(), 350);
    }
  } catch (err) {
    const msg = err.name === 'NotAllowedError'
      ? '카메라 권한이 거부되었어요.<br>브라우저 주소창에서 권한을 허용해주세요.'
      : '카메라를 열 수 없어요. 다른 앱이 사용 중인지 확인해주세요.';
    placeholder.innerHTML = `
      <div style="text-align:center; color:var(--text-medium); padding:24px;">
        <div style="font-size:2.2rem; margin-bottom:12px;">🚫</div>
        <div style="font-weight:700; margin-bottom:8px; font-size:1rem;">카메라 권한 필요</div>
        <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.6;">${msg}</div>
        <button class="btn btn-secondary" style="margin-top:18px; font-size:0.85rem;" onclick="startCamera()">
          다시 시도
        </button>
      </div>`;
  }
}

function initHands() {
  handsInstance = new Hands({ locateFile: f => `vendor/mediapipe/hands/${f}` });
  handsInstance.setOptions({
    maxNumHands: 1, modelComplexity: 1,
    minDetectionConfidence: 0.72, minTrackingConfidence: 0.55,
  });
  handsInstance.onResults(onHandResults);
  frameLoopActive = true;
  requestAnimationFrame(frameLoop);
}

async function frameLoop() {
  if (!frameLoopActive || !videoEl || videoEl.paused || videoEl.readyState < 2) {
    requestAnimationFrame(frameLoop);
    return;
  }
  if (canvasEl.width !== videoEl.videoWidth && videoEl.videoWidth > 0) {
    canvasEl.width  = videoEl.videoWidth;
    canvasEl.height = videoEl.videoHeight;
    ctx = canvasEl.getContext('2d');
  }
  // Hands와 FaceMesh는 전역 상태를 공유하는 Emscripten 모듈이라 동시에 실행되면
  // 서로를 오염시킨다("Module.arguments has been replaced…").
  //  • 1단계: hands 전용 (FaceMesh 미사용)
  //  • 2~5단계: 한 프레임에 한 모델만 — hands / face 를 번갈아(隔프레임) 실행해
  //    두 wasm 이 절대 겹치지 않게 한다. 각 모델은 ~15fps 로 동작.
  try {
    if (currentStage >= 2 && currentStage <= 5 && faceMeshInstance) {
      faceTurn = !faceTurn;
      if (faceTurn) await faceMeshInstance.send({ image: videoEl });
      else if (handsInstance) await handsInstance.send({ image: videoEl });
    } else if (handsInstance) {
      await handsInstance.send({ image: videoEl });
    }
  } catch (_) {}
  // Re-position the drape every frame so it tracks the face in real time.
  // Wrapped so a drape error can never kill the whole frame loop (which would
  // freeze hand detection).
  try { updateClothPosition(); } catch (e) { console.error('updateClothPosition error:', e); }
  requestAnimationFrame(frameLoop);
}

function onHandResults(results) {
  try {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    if (!results.multiHandLandmarks?.length) {
      // Don't reset the dwell on a single missed frame; the grace window in
      // stage1HoverTick() clears it only after a sustained loss.
      return;
    }

    const lm = results.multiHandLandmarks[0];

    drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: 'rgba(255,140,66,0.75)', lineWidth: 2 });
    drawLandmarks(ctx, lm, { color: '#FF8C42', lineWidth: 1, radius: 4 });

    // Stage 1: pointing detection with hover
    if (currentStage === 1) {
      handleStage1Hand(lm);
      return;
    }

    // Stage 2~5: gesture-based interaction
    if (currentStage >= 2 && currentStage <= 5) {
      handleCompareStageHand(lm);
    }
  } catch (e) {
    console.error('onHandResults error:', e);
  }
}

function handleStage1Hand(lm) {
  const g = classifyGesture(lm);
  // palm → reset
  if (g === 'palm') {
    const now = Date.now();
    if (now - lastGestureTime >= GESTURE_COOLDOWN) {
      lastGestureTime = now;
      showGestureFeedback('초기화 🖐');
      resetStage1();
    }
    clearStage1Hover();
    return;
  }
  // ok → advance
  if (g === 'ok' && stage1Selection) {
    const now = Date.now();
    if (now - lastGestureTime >= GESTURE_COOLDOWN) {
      lastGestureTime = now;
      showGestureFeedback('확인 👌');
      setTimeout(() => confirmStage1(), 280);
    }
    clearStage1Hover();
    return;
  }
  // Pointing for swatch hover.  We accept any pose with the index finger
  // extended (not just a strict 'one') — a momentary middle-finger flicker
  // shouldn't drop the dwell.  'ok' is excluded since it has its own handler.
  const idxExtended = lm[8].y < lm[5].y - 0.03;
  if (g !== 'ok' && idxExtended) {
    detectStage1Pointing(lm);
  }
  // Otherwise: don't clear immediately — the grace window in stage1HoverTick()
  // handles brief losses, so the dwell survives small tracking glitches.
}

function handleCompareStageHand(lm) {
  const g = classifyGesture(lm);

  // Live cloth toggle (no cooldown) for 'one' / 'two'
  if (g === 'one' && currentChoice !== 'opt1') showCloth('opt1');
  else if (g === 'two' && currentChoice !== 'opt2') showCloth('opt2');
  else if (g === 'palm' && currentChoice !== null) {
    const now = Date.now();
    if (now - lastGestureTime >= GESTURE_COOLDOWN) {
      lastGestureTime = now;
      showGestureFeedback('초기화 🖐');
      showCloth(null);
    }
    return;
  }

  // good → confirm choice (cooldown)
  if (g === 'good' && currentChoice) {
    const now = Date.now();
    if (now - lastGestureTime >= GESTURE_COOLDOWN) {
      lastGestureTime = now;
      showGestureFeedback('선택 👍');
      confirmCurrentPair();
    }
    return;
  }

  // ok → advance stage (cooldown)
  if (g === 'ok' && isCurrentStageDone()) {
    const now = Date.now();
    if (now - lastGestureTime >= GESTURE_COOLDOWN) {
      lastGestureTime = now;
      showGestureFeedback('다음 단계 👌');
      setTimeout(() => advanceFromCompare(), 280);
    }
    return;
  }
}

function classifyGesture(lm) {
  const up = (tip, mcp) => lm[tip].y < lm[mcp].y - 0.03;
  const idx  = up(8,  5);
  const mid  = up(12, 9);
  const ring = up(16, 13);
  const pink = up(20, 17);
  const thumbUp = lm[4].y < lm[2].y - 0.05;

  // Thumb-index pinch distance (normalized landmark coords)
  const dx = lm[4].x - lm[8].x;
  const dy = lm[4].y - lm[8].y;
  const pinchDist = Math.sqrt(dx * dx + dy * dy);

  // OK sign: thumb-index tips touching, other fingers extended
  if (pinchDist < 0.07 && mid && ring && pink) return 'ok';

  // Open palm — all four fingers extended (+thumb up usually)
  if (idx && mid && ring && pink) return 'palm';

  // Thumbs up — only thumb extended
  if (thumbUp && !idx && !mid && !ring && !pink) return 'good';

  // Two-finger (peace) — index + middle extended only
  if (idx && mid && !ring && !pink) return 'two';

  // One-finger (point) — index only
  if (idx && !mid && !ring && !pink) return 'one';

  return null;
}

function showGestureFeedback(text) {
  const fb = document.getElementById('gestureFeedback');
  if (!fb) return;
  fb.textContent = text;
  fb.classList.add('visible');
  clearTimeout(fb._timer);
  fb._timer = setTimeout(() => fb.classList.remove('visible'), 800);
}

function setStatus(text) {
  const el = document.getElementById('cameraStatus');
  if (!el) return;
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
}

// ─── FaceMesh (skin sampling – optional, kept for future use) ────────────────
function initFaceMesh() {
  try {
    if (typeof FaceMesh === 'undefined') return;
    faceMeshInstance = new FaceMesh({ locateFile: f => `vendor/mediapipe/face_mesh/${f}` });
    faceMeshInstance.setOptions({ maxNumFaces: 1, refineLandmarks: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    faceMeshInstance.onResults(onFaceResults);
  } catch (e) {
    console.warn('FaceMesh init failed:', e);
  }
}

function onFaceResults(results) {
  try {
    const lms = results.multiFaceLandmarks?.[0];
    if (!lms) {
      faceLostFrames++;
      if (faceLostFrames > 8) {
        faceLandmarksLatest = null;
        updateClothPosition();
      }
      return;
    }
    faceLostFrames = 0;
    faceLandmarksLatest = lms;
    updateClothPosition();
    // [임시 진단] face_mesh 가 매 초 몇 번 갱신되는지 + 턱 좌표가 변하는지
    if (!window._fc) window._fc = { n: 0, t: 0 };
    window._fc.n++;
    if (Date.now() - window._fc.t > 1000) {
      console.log(`[face] ${window._fc.n}/s  chin=(${lms[152].x.toFixed(3)}, ${lms[152].y.toFixed(3)})`);
      window._fc.n = 0; window._fc.t = Date.now();
    }
  } catch (e) {
    console.error('onFaceResults error:', e);
    return;
  }

  if (!videoEl) return;
  const vw = videoEl.videoWidth || 640, vh = videoEl.videoHeight || 480;
  let minX=1,minY=1,maxX=0,maxY=0;
  lms.forEach(p => { minX = Math.min(minX,p.x); minY = Math.min(minY,p.y); maxX = Math.max(maxX,p.x); maxY = Math.max(maxY,p.y); });
  const w = (maxX-minX)*vw, h = (maxY-minY)*vh;
  const cx = (minX+maxX)/2*vw, cy = (minY+maxY)/2*vh;
  const sz = Math.max(10, Math.floor(Math.min(w,h)*0.12));
  const pts = [{x:cx - w*0.22, y:cy - h*0.05},{x:cx + w*0.22, y:cy - h*0.05},{x:cx, y:cy + h*0.15}];
  const samples = [];
  pts.forEach(p => {
    const avg = getAverageVideoRGB(Math.round(p.x - sz/2), Math.round(p.y - sz/2), sz, sz);
    if (avg) samples.push(avg);
  });
  if (!samples.length) return;
  const avg = samples.reduce((acc,s)=>({r:acc.r+s.r,g:acc.g+s.g,b:acc.b+s.b}),{r:0,g:0,b:0});
  avg.r = Math.round(avg.r/samples.length); avg.g = Math.round(avg.g/samples.length); avg.b = Math.round(avg.b/samples.length);
  // Apply the calibrated white-balance gain so the Lab sample is invariant
  // to the lighting color cast (warm/cool ambient light, etc.).
  const wb = applyWB(avg);
  faceLabSample = rgbToLab(wb.r, wb.g, wb.b);
}

// Position the cloth drape under the user's chin using FaceMesh landmarks.
// The preview is CSS-mirrored (scaleX(-1)) so we mirror landmark x coords too.
function updateClothPosition() {
  const drape = document.getElementById('clothDrape');
  const cameraArea = document.getElementById('cameraArea');
  if (!drape || !cameraArea) return;

  // Hide if not in a compare stage or face isn't tracked.
  if (!(currentStage >= 2 && currentStage <= 5) || !faceLandmarksLatest) {
    drape.style.visibility = 'hidden';
    return;
  }

  const lm = faceLandmarksLatest;
  const chin  = lm[152];
  const faceL = lm[234];
  const faceR = lm[454];
  if (!chin || !faceL || !faceR) {
    drape.style.visibility = 'hidden';
    return;
  }

  const rect = cameraArea.getBoundingClientRect();
  const camW = rect.width;
  const camH = rect.height;
  if (camW === 0 || camH === 0) {
    drape.style.visibility = 'hidden';
    return;
  }

  const chinX = (1 - chin.x) * camW;
  const chinY = chin.y * camH;
  const faceWidth = Math.abs(faceR.x - faceL.x) * camW;
  const clothWidth  = Math.min(camW * 1.0, Math.max(faceWidth * 2.4, camW * 0.6));
  const clothHeight = Math.max(80, camH - chinY - 6);
  const left = Math.max(-clothWidth * 0.05, Math.min(camW - clothWidth * 0.95, chinX - clothWidth / 2));
  const top  = chinY + 4;

  drape.style.visibility = 'visible';
  drape.style.width  = clothWidth + 'px';
  drape.style.height = clothHeight + 'px';
  drape.style.left   = left + 'px';
  drape.style.top    = top + 'px';
}

function getAverageVideoRGB(x, y, w, h) {
  try {
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(videoEl, x, y, w, h, 0, 0, w, h);
    const id = tctx.getImageData(0,0,w,h).data;
    let r=0,g=0,b=0,c=0;
    for (let i=0;i<id.length;i+=4) {
      if (id[i+3] === 0) continue;
      r += id[i]; g += id[i+1]; b += id[i+2]; c++;
    }
    if (!c) return null;
    return { r: Math.round(r/c), g: Math.round(g/c), b: Math.round(b/c) };
  } catch (e) { return null; }
}

// ─── Keyboard fallback ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (currentStage >= 2 && currentStage <= 5) {
    if (e.key === '1') showCloth('opt1');
    else if (e.key === '2') showCloth('opt2');
    else if (e.key === 'Enter' || e.key.toLowerCase() === 'g') {
      if (currentChoice) confirmCurrentPair();
    } else if (e.key.toLowerCase() === 'o') {
      if (isCurrentStageDone()) advanceFromCompare();
    }
  }
  if (currentStage === 1) {
    if (e.key.toLowerCase() === 'o' && stage1Selection) confirmStage1();
    if (e.key.toLowerCase() === 'r') resetStage1();
  }
});

// ─── Bootstrap ──────────────────────────────────────────────────────────────
enterStage(1);
