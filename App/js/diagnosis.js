// ─── Color Data ──────────────────────────────────────────────────────────────
const colors = [
  { bg: 'linear-gradient(135deg, #FFD4A8, #FFB380)', name: '13호 아이보리 베이지', desc: '밝은 베이지 계열 · 웜 베이스' },
  { bg: 'linear-gradient(135deg, #F5C090, #E8A870)', name: '15호 내추럴 베이지', desc: '자연스러운 베이지 · 웜 베이스' },
  { bg: 'linear-gradient(135deg, #EBB078, #D89060)', name: '17호 샌드 베이지', desc: '모래빛 베이지 · 웜 베이스' },
  { bg: 'linear-gradient(135deg, #E0A068, #C88050)', name: '19호 웜 베이지', desc: '따뜻한 황갈색 · 웜 베이스' },
  { bg: 'linear-gradient(135deg, #D49060, #C07848)', name: '21호 골든 베이지', desc: '황금빛 베이지 · 웜 베이스' },
  { bg: 'linear-gradient(135deg, #C88058, #B06840)', name: '23호 딥 베이지', desc: '깊은 베이지 · 웜 베이스' },
  { bg: 'linear-gradient(135deg, #E8C8C0, #D0B0A8)', name: '15호 핑크 베이지', desc: '핑크빛 베이지 · 쿨 베이스' },
  { bg: 'linear-gradient(135deg, #D8B8B8, #C0A0A0)', name: '17호 로즈 베이지', desc: '장미빛 베이지 · 쿨 베이스' },
  { bg: 'linear-gradient(135deg, #C8A8A8, #B09090)', name: '19호 쿨 베이지', desc: '차가운 베이지 · 쿨 베이스' },
  { bg: 'linear-gradient(135deg, #B89898, #A08080)', name: '21호 뉴트럴 베이지', desc: '뉴트럴 베이지 · 쿨 베이스' },
  { bg: 'linear-gradient(135deg, #E8D0E0, #D0B8C8)', name: '라벤더 쿨', desc: '연보라 계열 · 쿨 베이스' },
  { bg: 'linear-gradient(135deg, #F0D8E8, #D8C0D0)', name: '로즈 쿨', desc: '로즈핑크 계열 · 쿨 베이스' },
];

let currentIndex = 0;
const selectedColors = [];

// ─── Color UI ─────────────────────────────────────────────────────────────────
function updateDisplay() {
  const color = colors[currentIndex];
  document.getElementById('currentColorDisplay').style.background = color.bg;
  document.getElementById('currentColorName').textContent = color.name;
  document.getElementById('currentColorDesc').textContent = color.desc;

  document.querySelectorAll('.color-strip-item').forEach((el, i) => {
    el.classList.toggle('active', i === currentIndex);
  });
  const strip = document.getElementById('colorStrip');
  const activeItem = strip.children[currentIndex];
  if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

  const overlay = document.getElementById('colorOverlay');
  if (overlay.style.display !== 'none') {
    const hex = colors[currentIndex].bg.match(/#[A-Fa-f0-9]{6}/)?.[0] ?? '#FFB347';
    overlay.style.background = `linear-gradient(to top, ${hex}BB, transparent)`;
  }
}

function nextColor() {
  currentIndex = (currentIndex + 1) % colors.length;
  updateDisplay();
}

function prevColor() {
  currentIndex = (currentIndex - 1 + colors.length) % colors.length;
  updateDisplay();
}

function selectColor() {
  const color = colors[currentIndex];
  if (selectedColors.find(c => c.name === color.name)) return;
  selectedColors.push({ ...color, index: currentIndex });

  const container = document.getElementById('selectedColors');
  if (selectedColors.length === 1) container.innerHTML = '';

  const swatch = document.createElement('div');
  swatch.style.cssText = `
    width:40px; height:40px; border-radius:8px;
    background:${color.bg};
    box-shadow:0 2px 6px rgba(0,0,0,0.12);
    cursor:pointer;
    transition: transform 0.2s;
    flex-shrink:0;
  `;
  swatch.title = color.name;
  swatch.addEventListener('mouseenter', () => swatch.style.transform = 'scale(1.1)');
  swatch.addEventListener('mouseleave', () => swatch.style.transform = 'scale(1)');
  container.appendChild(swatch);

  document.getElementById('selectedCount').textContent = `(${selectedColors.length}개)`;
  if (selectedColors.length >= 3) document.getElementById('analyzeBtn').removeAttribute('disabled');

  nextColor();
}

function resetSelection() {
  selectedColors.length = 0;
  currentIndex = 0;
  updateDisplay();
  document.getElementById('selectedColors').innerHTML = `
    <span style="font-size:0.85rem; color:var(--text-muted); align-self:center;">
      아직 선택한 색상이 없어요. 어울리는 색상에 👍를 눌러보세요.
    </span>`;
  document.getElementById('selectedCount').textContent = '(0개)';
  document.getElementById('analyzeBtn').setAttribute('disabled', '');
}

function goToResult() {
  window.location.href = 'result.html';
}

// ─── Camera & MediaPipe Hands ─────────────────────────────────────────────────
let videoEl = null;
let canvasEl = null;
let ctx = null;
let handsInstance = null;
let frameLoopActive = false;
let lastGestureTime = 0;
const GESTURE_COOLDOWN = 950;
let swipeBuffer = [];

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
    cameraArea.insertBefore(canvasEl, document.getElementById('colorOverlay'));

    document.getElementById('colorOverlay').style.display = 'block';

    await videoEl.play();

    setStatus('손 인식 모델 로딩 중…');
    initHands();

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
  handsInstance = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });

  handsInstance.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.72,
    minTrackingConfidence: 0.55
  });

  handsInstance.onResults(onHandResults);

  frameLoopActive = true;
  requestAnimationFrame(frameLoop);

  // Mark ready once first frame is processed
  handsInstance.onResults = (results) => {
    setStatus('손동작으로 색상을 골라보세요 ✋');
    handsInstance.onResults = onHandResults;
    onHandResults(results);
  };
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

  try {
    await handsInstance.send({ image: videoEl });
  } catch (_) {}

  requestAnimationFrame(frameLoop);
}

function onHandResults(results) {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  if (!results.multiHandLandmarks?.length) {
    swipeBuffer = [];
    return;
  }

  const lm = results.multiHandLandmarks[0];

  drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: 'rgba(255,140,66,0.75)', lineWidth: 2 });
  drawLandmarks(ctx, lm, { color: '#FF8C42', lineWidth: 1, radius: 4 });

  const now = Date.now();
  if (now - lastGestureTime < GESTURE_COOLDOWN) return;

  const gesture = detectGesture(lm);
  if (gesture) {
    lastGestureTime = now;
    triggerGesture(gesture);
  }
}

function detectGesture(lm) {
  // y increases downward; finger extended = tip.y < mcp.y
  const up = (tip, mcp) => lm[tip].y < lm[mcp].y - 0.03;
  const idx  = up(8,  5);
  const mid  = up(12, 9);
  const ring = up(16, 13);
  const pink = up(20, 17);
  const thumb = lm[4].y < lm[2].y - 0.05;

  // Open palm — all 4 fingers extended
  if (idx && mid && ring && pink) return 'reset';

  // Thumbs up — thumb up, all fingers curled
  if (thumb && !idx && !mid && !ring && !pink) return 'select';

  // Swipe — track wrist x over recent frames
  // Video is CSS-mirrored: user's right swipe → x decreases in MediaPipe coords
  swipeBuffer.push(lm[0].x);
  if (swipeBuffer.length > 10) swipeBuffer.shift();

  if (swipeBuffer.length >= 6) {
    const delta = swipeBuffer.at(-1) - swipeBuffer[0];
    if (delta < -0.12) { swipeBuffer = []; return 'next'; }
    if (delta >  0.12) { swipeBuffer = []; return 'prev'; }
  }

  return null;
}

function triggerGesture(gesture) {
  const labels = { next: '다음 →', prev: '← 이전', select: '선택 👍', reset: '초기화 🖐' };
  showGestureFeedback(labels[gesture] || '');

  if (gesture === 'next')   nextColor();
  else if (gesture === 'prev')   prevColor();
  else if (gesture === 'select') selectColor();
  else if (gesture === 'reset')  resetSelection();
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

// ─── Strip click & Keyboard ───────────────────────────────────────────────────
document.getElementById('colorStrip').addEventListener('click', e => {
  const item = e.target.closest('.color-strip-item');
  if (!item) return;
  const idx = Array.from(document.querySelectorAll('.color-strip-item')).indexOf(item);
  if (idx !== -1) { currentIndex = idx; updateDisplay(); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') nextColor();
  else if (e.key === 'ArrowLeft') prevColor();
  else if (e.key === 'Enter') selectColor();
});

updateDisplay();
