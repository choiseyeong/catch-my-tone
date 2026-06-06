// ─── Stage definitions, compare pools → js/diagnosis-data.js ────────────────

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
  6: { title: '베스트 vs 워스트 체험', sub: '나만의 색상 차이 느끼기',
       desc: '☝️로 내 베스트 컬러, ✌️로 내 워스트 컬러를 얼굴에 드레이핑해 차이를 직접 느껴보세요. 👌 OK 사인이나 아래 버튼으로 결과를 확인하세요.' },
};

// COMPARE_STAGES, COMPARE_POOLS, CONTEXT_LABELS → js/diagnosis-data.js

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

// Palm hold: open palm must be sustained this long before reset triggers.
const PALM_HOLD_DURATION = 1500; // ms
let palmHoldStartTime = 0;
let palmHoldLastRemainder = -1; // for throttled status-bar updates

// Back hold: 👈 must be sustained before goBackStage triggers (carry-over 방지)
let backHoldStartTime = 0;
let backHoldShown = false;

// Cloth drape: EMA (exponential moving average) smoothing state.
// Resets to -1 whenever the drape is hidden so the first visible frame snaps
// to the correct position without sliding in from (0,0).
let clothSmoothLeft = -1, clothSmoothTop = -1;
let clothSmoothW    = -1, clothSmoothH   = -1;
const CLOTH_SMOOTH = 0.22; // lerp factor per frame (0 = no movement, 1 = instant)

// Stage 2~5
let currentPairIdx = 0;
let currentChoice = null; // 'opt1' | 'opt2'
const stageResults = { 2: [], 3: [], 4: [], 5: [] }; // each is an array of 'opt1Key'|'opt2Key'
let activePairs = [];   // pairs being shown in the current stage (context-dependent)
let activeContextKey = 'default';
const stageContextHistory = { 2: 'default', 3: null, 4: null, 5: null };

// Stage 6 (베스트 vs 워스트 드레이핑)
let stage6BestColors = null;
let stage6WorstColors = null;
let stage6CurrentChoice = null;

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
  document.getElementById('cameraStatus').classList.add('above-options-bar');
}

function hideCompareUI() {
  document.getElementById('compareInfoBar').style.display = 'none';
  document.getElementById('compareOptionsBar').style.display = 'none';
  document.getElementById('clothDrape').classList.remove('visible');
  clothSmoothLeft = clothSmoothTop = clothSmoothW = clothSmoothH = -1;
  document.getElementById('cameraStatus').classList.remove('above-options-bar');
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
    // Reset EMA so next show snaps immediately to the face position.
    clothSmoothLeft = clothSmoothTop = clothSmoothW = clothSmoothH = -1;
  }

  // Force a fresh position calc the moment the cloth becomes visible
  // (FaceMesh may not have fired since stage entry, leaving width/height at 0).
  updateClothPosition();
}

// ── Stage 6: 베스트 vs 워스트 헬퍼 ──────────────────────────────────────────
function makeQuadGradient(colors) {
  if (!colors || !colors.length) return '#cccccc';
  if (colors.length === 1) return colors[0];
  const n = colors.length;
  const stops = colors.map((c, i) =>
    `${c} ${(i / n * 100).toFixed(1)}% ${((i + 1) / n * 100).toFixed(1)}%`
  );
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

function showClothStage6(which) {
  const drape  = document.getElementById('clothDrape');
  const opt1El = document.getElementById('compareOpt1');
  const opt2El = document.getElementById('compareOpt2');
  const colors = which === 'best' ? stage6BestColors : stage6WorstColors;
  drape.style.background = makeQuadGradient(colors);
  drape.classList.add('visible');
  if (which === 'best') {
    opt1El.classList.add('active');
    opt2El.classList.remove('active');
  } else {
    opt2El.classList.add('active');
    opt1El.classList.remove('active');
  }
  stage6CurrentChoice = which;
  updateClothPosition();
}

function handleStage6Hand(lm) {
  const g = classifyGesture(lm);
  if (g === 'one' && stage6CurrentChoice !== 'best') {
    showClothStage6('best');
  } else if (g === 'two' && stage6CurrentChoice !== 'worst') {
    showClothStage6('worst');
  }
  if (g === 'ok') {
    const now = Date.now();
    if (now - lastGestureTime >= GESTURE_COOLDOWN) {
      lastGestureTime = now;
      showGestureFeedback('결과 보기 👌');
      setTimeout(() => { window.location.href = 'result.html'; }, 280);
    }
  }
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

function goBackStage() {
  if (currentStage <= 1) return;
  const targetStage = currentStage - 1;

  // Undo current stage's accumulated scores
  stageResults[currentStage].forEach(key => {
    if (scores[key] > 0) scores[key]--;
  });
  stageResults[currentStage] = [];
  stageContextHistory[currentStage] = null;

  // Undo target stage's scores — will be rebuilt as user re-does that stage
  if (targetStage >= 2) {
    stageResults[targetStage].forEach(key => {
      if (scores[key] > 0) scores[key]--;
    });
    stageResults[targetStage] = [];
    stageContextHistory[targetStage] = null;
  } else {
    // Returning to stage 1 — clear its visual selection
    resetStage1();
  }

  enterStage(targetStage);
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
  } else if (stage === 6) {
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
  } else if (stage === 6) {
    hideStage1UI();
    if (cameraReady) {
      showCompareUI();
      document.getElementById('comparePairIdx').textContent = '체험';
      document.getElementById('comparePairTitle').textContent = '베스트 vs 워스트 색상';
      document.getElementById('comparePairDots').innerHTML = '';
      document.getElementById('compareOpt1Swatch').style.background = makeQuadGradient(stage6BestColors);
      document.getElementById('compareOpt1Name').textContent = '베스트 컬러';
      document.getElementById('compareOpt2Swatch').style.background = makeQuadGradient(stage6WorstColors);
      document.getElementById('compareOpt2Name').textContent = '워스트 컬러';
      document.getElementById('compareOpt1').classList.remove('active');
      document.getElementById('compareOpt2').classList.remove('active');
      document.getElementById('clothDrape').classList.remove('visible');
      clothSmoothLeft = clothSmoothTop = clothSmoothW = clothSmoothH = -1;
    }
    setStatus(cameraReady ? '☝️ 베스트 컬러  ✌️ 워스트 컬러  👌 결과 보기' : '');
  } else if (stage > 6) {
    hideStage1UI();
    hideCompareUI();
  }

  updateGestureGuide(stage);
  showStageProgressActions();
}

function updateGestureGuide(stage) {
  const el = document.getElementById('gestureGuide');
  if (!el) return;
  const items = stage === 1 ? [
    { icon: '☝️',    title: '검지로 가리키기',  desc: '1.2초 유지하면 자동 선택' },
    { icon: '🖐',    title: '손바닥 펼치기',    desc: '1.5초 유지 시 초기화'    },
    { icon: '👌',    title: 'OK 사인',          desc: '선택 후 다음 단계로'     },
  ] : stage === 6 ? [
    { icon: '☝️',    title: '1번 (베스트)',      desc: '베스트 컬러 드레이핑'    },
    { icon: '✌️',    title: '2번 (워스트)',      desc: '워스트 컬러 드레이핑'    },
    { icon: '👌',    title: 'OK 사인',          desc: '결과 페이지로 이동'      },
  ] : [
    { icon: '☝️✌️', title: '1번 / 2번 손모양', desc: '천 색상 바꾸기'         },
    { icon: '👍',    title: '엄지척',           desc: '이 색상으로 선택 확정'   },
    { icon: '👈',    title: '왼쪽 가리키기',       desc: '이전 단계로 돌아가기'    },
    { icon: '👌',    title: 'OK 사인',          desc: '다음 단계로'            },
  ];
  el.style.gridTemplateColumns = stage === 1 ? '1fr' : '1fr 1fr';
  el.innerHTML = items.map(i => `
    <div class="gesture-item">
      <div class="gesture-icon">${i.icon}</div>
      <div class="gesture-text"><strong>${i.title}</strong>${i.desc}</div>
    </div>`).join('');
}

function updateProgress() {
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('progressLabel');
  const leftLabel = document.getElementById('progressLeftLabel');
  if (currentStage === 6) {
    if (bar) bar.style.width = '100%';
    if (label) label.textContent = '진단 완료 🎉';
    if (leftLabel) leftLabel.textContent = '베스트 vs 워스트 체험 중';
    return;
  }
  const userStep = Math.min(totalUserStages, Math.max(1, currentStage));
  const pct = Math.round(((userStep - 1) / totalUserStages) * 100);
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
  if (!wrap) return;
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
  const viewResultBtn = document.getElementById('viewResultBtn');
  const done = isCurrentStageDone();

  if (currentStage === 1) {
    nextBtn.style.display = 'none';
    analyzeBtn.style.display = 'none';
    if (viewResultBtn) viewResultBtn.style.display = 'none';
  } else if (currentStage >= 2 && currentStage < totalUserStages) {
    nextBtn.style.display = 'block';
    analyzeBtn.style.display = 'none';
    if (viewResultBtn) viewResultBtn.style.display = 'none';
    nextBtn.toggleAttribute('disabled', !done);
  } else if (currentStage === totalUserStages) {
    nextBtn.style.display = 'none';
    analyzeBtn.style.display = 'block';
    if (viewResultBtn) viewResultBtn.style.display = 'none';
    analyzeBtn.toggleAttribute('disabled', !done);
  } else if (currentStage === 6) {
    nextBtn.style.display = 'none';
    analyzeBtn.style.display = 'none';
    if (viewResultBtn) viewResultBtn.style.display = 'block';
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
  stage6BestColors = (si.bestColors || []).slice(0, 4).map(c => c.hex);
  stage6WorstColors = (wsi.bestColors || []).slice(0, 4).map(c => c.hex);
  stage6CurrentChoice = null;
  showDiagCompleteOverlay();
}

function showDiagCompleteOverlay() {
  const overlay = document.getElementById('diagCompleteOverlay');
  const btn = document.getElementById('diagCompleteBtn');
  if (btn) btn.classList.remove('visible');
  overlay.style.display = 'flex';
  ['nextStageBtn', 'analyzeBtn', 'viewResultBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  setTimeout(() => {
    if (btn) btn.classList.add('visible');
  }, 1500);
}

function enterStage6FromOverlay() {
  const overlay = document.getElementById('diagCompleteOverlay');
  if (overlay) overlay.style.display = 'none';
  lastGestureTime = Date.now(); // carry-over 👌 제스처 차단
  enterStage(6);
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
    if (currentStage >= 2 && currentStage <= 6 && faceMeshInstance) {
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
      // Clear palm hold when hand is lost — prevents false-trigger on re-detection.
      if (palmHoldStartTime) {
        palmHoldStartTime = 0;
        palmHoldLastRemainder = -1;
      }
      if (backHoldStartTime) {
        backHoldStartTime = 0;
        backHoldShown = false;
      }
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

    // Stage 6: 베스트 vs 워스트 드레이핑
    if (currentStage === 6) {
      handleStage6Hand(lm);
    }
  } catch (e) {
    console.error('onHandResults error:', e);
  }
}

function handleStage1Hand(lm) {
  const g = classifyGesture(lm);

  // palm → require PALM_HOLD_DURATION sustained hold before reset
  if (g === 'palm') {
    clearStage1Hover();
    if (!palmHoldStartTime) palmHoldStartTime = Date.now();
    if (palmHoldLastRemainder < 0) {
      palmHoldLastRemainder = 1;
      setStatus(`🖐 1초 유지하면 선택이 초기화돼요`);
    }
    const held = Date.now() - palmHoldStartTime;
    if (held >= PALM_HOLD_DURATION) {
      palmHoldStartTime = 0;
      palmHoldLastRemainder = -1;
      const now = Date.now();
      if (now - lastGestureTime >= GESTURE_COOLDOWN) {
        lastGestureTime = now;
        showGestureFeedback('초기화 🖐');
        resetStage1();
        setStatus('손가락으로 파운데이션 색상을 가리켜 선택하세요 ☝️');
      }
    }
    return;
  }
  // Non-palm: clear hold state
  if (palmHoldStartTime) {
    palmHoldStartTime = 0;
    palmHoldLastRemainder = -1;
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
  if (g === 'one' && currentChoice !== 'opt1') {
    showCloth('opt1');
  } else if (g === 'two' && currentChoice !== 'opt2') {
    showCloth('opt2');
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

  // back (👈) → 1.5초 홀드 후 이전 단계 이동 (carry-over 방지)
  if (g === 'back') {
    if (!backHoldStartTime) backHoldStartTime = Date.now();
    if (!backHoldShown) {
      backHoldShown = true;
      setStatus('👈 1.5초 유지하면 이전 단계로 돌아가요');
    }
    if (Date.now() - backHoldStartTime >= PALM_HOLD_DURATION) {
      backHoldStartTime = 0;
      backHoldShown = false;
      const now = Date.now();
      lastGestureTime = now;
      showGestureFeedback('이전 단계 👈');
      setTimeout(() => goBackStage(), 280);
    }
    return;
  }
  // back 아닌 제스처 → 타이머 리셋
  if (backHoldStartTime) {
    backHoldStartTime = 0;
    backHoldShown = false;
  }
}

function classifyGesture(lm) {
  const up = (tip, mcp) => lm[tip].y < lm[mcp].y - 0.03;
  const idx  = up(8,  5);
  const mid  = up(12, 9);
  const ring = up(16, 13);
  const pink = up(20, 17);

  // Strict thumbs-up: tip must be well above MCP and above wrist
  const thumbUp = lm[4].y < lm[2].y - 0.10 && lm[4].y < lm[0].y;

  // Strict curled: each finger tip must be below its PIP (middle joint)
  const idxCurled  = lm[8].y  > lm[6].y;
  const midCurled  = lm[12].y > lm[10].y;
  const ringCurled = lm[16].y > lm[14].y;
  const pinkCurled = lm[20].y > lm[18].y;

  // Thumb-index pinch distance (normalized landmark coords)
  const dx = lm[4].x - lm[8].x;
  const dy = lm[4].y - lm[8].y;
  const pinchDist = Math.sqrt(dx * dx + dy * dy);

  // OK sign: thumb-index tips touching, other fingers extended
  if (pinchDist < 0.07 && mid && ring && pink) return 'ok';

  // Open palm — all four fingers extended
  if (idx && mid && ring && pink) return 'palm';

  // Back-point (👈): index finger pointing horizontally to user's left
  // Raw (unmirrored) coords: lm[8].x > lm[5].x = tip is to user's left.
  // lxDelta > 0.15: clear leftward extension required.
  // lxDelta > 1.5 * lyDelta: angle must be within ~34° of horizontal.
  // pinchDist > 0.15: excludes OK/near-OK states where index curls toward thumb.
  // midCurled && ringCurled && pinkCurled: other fingers tightly curled past PIP.
  // Note: !idxCurled removed — horizontal pointing makes tip.y > PIP.y even when
  //        fully extended, so the angle+lxDelta conditions are sufficient.
  const lxDelta = lm[8].x - lm[5].x;
  const lyDelta = Math.abs(lm[8].y - lm[5].y);
  if (lxDelta > 0.15 && lxDelta > 1.5 * lyDelta &&
      pinchDist > 0.15 &&
      midCurled && ringCurled && pinkCurled) return 'back';

  // Thumbs up — thumb clearly extended, all other fingers fully curled past PIP.
  // Exclude sideways-pointing index (lxDelta > 0.12) to avoid conflict with back.
  if (thumbUp && !idx && !mid && !ring && !pink &&
      idxCurled && midCurled && ringCurled && pinkCurled &&
      lxDelta <= 0.12) return 'good';

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

// ─── FaceMesh (cloth drape position tracking) ────────────────────────────────
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
      if (faceLostFrames > 8) faceLandmarksLatest = null;
      return;
    }
    faceLostFrames = 0;
    faceLandmarksLatest = lms;
  } catch (e) {
    console.error('onFaceResults error:', e);
  }
}

// Position the cloth drape under the user's chin using FaceMesh landmarks.
// Visibility (show/hide) is controlled solely by the .visible CSS class in
// showCloth() — this function only updates geometry so the drape tracks the
// face every frame, whether or not it is currently visible to the user.
// The video/canvas are CSS-mirrored (scaleX(-1)), so landmark x is mirrored.
function updateClothPosition() {
  const drape = document.getElementById('clothDrape');
  const cameraArea = document.getElementById('cameraArea');
  if (!drape || !cameraArea) return;

  // Only update geometry during compare stages when face is tracked.
  if (!(currentStage >= 2 && currentStage <= 6) || !faceLandmarksLatest) return;

  const lm = faceLandmarksLatest;
  const chin  = lm[152];
  const faceL = lm[234];
  const faceR = lm[454];
  if (!chin || !faceL || !faceR) return;

  const rect = cameraArea.getBoundingClientRect();
  const camW = rect.width;
  const camH = rect.height;
  if (camW === 0 || camH === 0) return;

  const chinX = (1 - chin.x) * camW;
  const chinY = chin.y * camH;
  const faceWidth = Math.abs(faceR.x - faceL.x) * camW;

  // Cloth width: 2.8× face width, clamped to 72%–100% of camera width
  const clothWidth = Math.min(camW, Math.max(faceWidth * 2.8, camW * 0.72));

  // Cloth height: proportional to face height (forehead→chin),
  // clamped to 80px–45% of camera height so it looks like a draped fabric,
  // not an oversized block that fills the whole lower screen.
  const forehead = lm[10];
  const faceHeightRatio = forehead ? Math.abs(chin.y - forehead.y) : 0.18;
  const clothHeight = Math.max(80, Math.min(camH * 0.45, faceHeightRatio * camH * 1.7));

  const targetLeft = Math.max(-clothWidth * 0.05,
    Math.min(camW - clothWidth * 0.95, chinX - clothWidth / 2));
  const targetTop = chinY + 4;

  // EMA smoothing: snap on first appearance (clothSmoothLeft = -1 after hide),
  // interpolate on subsequent frames so drape glides smoothly with face movement.
  if (clothSmoothLeft < 0) {
    clothSmoothLeft = targetLeft;  clothSmoothTop = targetTop;
    clothSmoothW    = clothWidth;  clothSmoothH   = clothHeight;
  } else {
    clothSmoothLeft += (targetLeft  - clothSmoothLeft) * CLOTH_SMOOTH;
    clothSmoothTop  += (targetTop   - clothSmoothTop)  * CLOTH_SMOOTH;
    clothSmoothW    += (clothWidth  - clothSmoothW)    * CLOTH_SMOOTH;
    clothSmoothH    += (clothHeight - clothSmoothH)    * CLOTH_SMOOTH;
  }

  drape.style.width  = clothSmoothW.toFixed(1)    + 'px';
  drape.style.height = clothSmoothH.toFixed(1)    + 'px';
  drape.style.left   = clothSmoothLeft.toFixed(1) + 'px';
  drape.style.top    = clothSmoothTop.toFixed(1)  + 'px';
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
  if (currentStage === 6) {
    if (e.key === '1') showClothStage6('best');
    else if (e.key === '2') showClothStage6('worst');
    else if (e.key.toLowerCase() === 'o') window.location.href = 'result.html';
  }
});

// ─── Bootstrap ──────────────────────────────────────────────────────────────
enterStage(1);
