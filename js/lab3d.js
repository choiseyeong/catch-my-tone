/* ── Lab 색공간 3D 시각화 ── */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') return;
  const wrap    = document.getElementById('lab3d-wrap');
  const canvas  = document.getElementById('lab3d-canvas');
  const overlay = document.getElementById('lab3d-overlay');
  const tooltip = document.getElementById('lab3d-tooltip');
  const tipImg  = document.getElementById('lab3d-tip-img');
  const tipBrand= document.getElementById('lab3d-tip-brand');
  const tipName = document.getElementById('lab3d-tip-name');
  if (!wrap || !canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080818);
  scene.fog = new THREE.FogExp2(0x080818, 0.035);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  camera.position.set(6, 2.5, 9);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping   = true;
  controls.dampingFactor   = 0.07;
  controls.minDistance     = 2;
  controls.maxDistance     = 22;
  controls.autoRotate      = true;
  controls.autoRotateSpeed = 0.45;
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });

  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const dl = new THREE.DirectionalLight(0xffffff, 0.6);
  dl.position.set(4, 8, 6);
  scene.add(dl);

  function addAxis(p1, p2, color, opacity) {
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacity || 0.55 });
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1[0], p1[1], p1[2]),
      new THREE.Vector3(p2[0], p2[1], p2[2])
    ]);
    scene.add(new THREE.Line(geo, mat));
  }
  addAxis([-5.5, 0, 0], [5.5, 0, 0], 0xff7766);
  addAxis([0, -3.5, 0], [0, 3.5, 0], 0xddddee);
  addAxis([0, 0, -5.5], [0, 0, 5.5], 0x6688ff);
  scene.add(new THREE.GridHelper(10, 20, 0x1c1c38, 0x131328));

  (function() {
    function labToRgb(L, a, b) {
      var fy = (L + 16) / 116;
      var fx = a / 500 + fy;
      var fz = fy - b / 200;
      var d = 6 / 29;
      function finv(t) { return t > d ? t*t*t : 3*d*d*(t - 4/29); }
      var X = 0.9505 * finv(fx);
      var Y = finv(fy);
      var Z = 1.0890 * finv(fz);
      var lr =  3.2406*X - 1.5372*Y - 0.4986*Z;
      var lg = -0.9689*X + 1.8758*Y + 0.0415*Z;
      var lb =  0.0557*X - 0.2040*Y + 1.0570*Z;
      function gam(c) { return c <= 0.0031308 ? 12.92*c : 1.055*Math.pow(c, 1/2.4) - 0.055; }
      var rv = gam(lr), gv = gam(lg), bv = gam(lb);
      if (rv < 0 || rv > 1 || gv < 0 || gv > 1 || bv < 0 || bv > 1) return null;
      return [rv, gv, bv];
    }

    var tc = document.createElement('canvas');
    tc.width = tc.height = 32;
    var tctx = tc.getContext('2d');
    var grad = tctx.createRadialGradient(16, 16, 0, 16, 16, 15);
    grad.addColorStop(0,   'rgba(255,255,255,1)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1,   'rgba(255,255,255,0)');
    tctx.fillStyle = grad;
    tctx.arc(16, 16, 15, 0, Math.PI * 2);
    tctx.fill();
    var sprite = new THREE.CanvasTexture(tc);

    var positions = [], colors = [];
    for (var L = 4; L <= 96; L += 6) {
      for (var a = -110; a <= 110; a += 5) {
        for (var b = -110; b <= 110; b += 5) {
          var rgb = labToRgb(L, a, b);
          if (!rgb) continue;
          positions.push(a * 0.13, (L - 70) * 0.055, b * 0.13);
          colors.push(rgb[0], rgb[1], rgb[2]);
        }
      }
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.42,
      map: sprite,
      alphaTest: 0.01,
      sizeAttenuation: true,
      depthWrite: false,
    })));
  })();

  const spheres = [];
  const imgEls  = [];
  let isVisible = false;
  let rafId     = null;

  new IntersectionObserver(function(entries) {
    isVisible = entries[0].isIntersecting;
    if (isVisible && !rafId) { resize(); animate(); }
  }, { threshold: 0.05 }).observe(wrap);

  function tooltipAt(e) {
    const rect = wrap.getBoundingClientRect();
    let tx = e.clientX - rect.left + 18;
    let ty = e.clientY - rect.top  - 60;
    if (tx + 135 > rect.width)  tx = e.clientX - rect.left - 142;
    if (ty < 0) ty = 8;
    tooltip.style.left = tx + 'px';
    tooltip.style.top  = ty + 'px';
  }

  fetch('data/cloth_analysis.json')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var items = data.items.filter(function(it) { return it.lab; });

      items.forEach(function(item) {
        var L = item.lab[0], a = item.lab[1], b = item.lab[2];

        var col = new THREE.Color(item.dominant_hex);
        var sphere = new THREE.Mesh(
          new THREE.SphereGeometry(item.achromatic ? 0.11 : 0.20, 14, 14),
          new THREE.MeshStandardMaterial({
            color: col, emissive: col, emissiveIntensity: 0.22, roughness: 0.38
          })
        );
        sphere.position.set(a * 0.13, (L - 70) * 0.055, b * 0.13);
        scene.add(sphere);
        spheres.push(sphere);

        var img = document.createElement('img');
        img.style.cssText = [
          'position:absolute',
          'width:28px;height:28px',
          'border-radius:50%;object-fit:cover',
          'background:' + item.dominant_hex,
          'border:2px solid rgba(255,255,255,0.55)',
          'box-shadow:0 2px 10px rgba(0,0,0,0.55)',
          'pointer-events:auto;cursor:pointer',
          'transform:translate(-50%,-50%)',
          'transition:transform 0.12s,border-color 0.12s',
          'display:none'
        ].join(';');
        img.src = item.image_url || '';

        (function(it) {
          img.addEventListener('mouseenter', function(e) {
            img.style.transform   = 'translate(-50%,-50%) scale(1.8)';
            img.style.zIndex      = '15';
            img.style.borderColor = '#fff';
            tipImg.src            = it.image_url || '';
            tipBrand.textContent  = it.brand || '';
            tipName.textContent   = it.name  || '';
            tooltip.style.display = 'block';
            tooltipAt(e);
          });
          img.addEventListener('mousemove', tooltipAt);
          img.addEventListener('mouseleave', function() {
            img.style.transform   = 'translate(-50%,-50%)';
            img.style.zIndex      = '';
            img.style.borderColor = 'rgba(255,255,255,0.55)';
            tooltip.style.display = 'none';
          });
          img.addEventListener('click', function() {
            if (it.product_url) window.open(it.product_url, '_blank');
          });
        })(item);

        overlay.appendChild(img);
        imgEls.push(img);
      });

      resize();
    });

  function resize() {
    var w = wrap.offsetWidth, h = wrap.offsetHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function animate() {
    if (!isVisible) { rafId = null; return; }
    rafId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);

    var w = wrap.offsetWidth, h = wrap.offsetHeight;
    spheres.forEach(function(sphere, i) {
      var p = sphere.position.clone().project(camera);
      if (p.z >= 1) { imgEls[i].style.display = 'none'; return; }
      imgEls[i].style.display = 'block';
      imgEls[i].style.left = ((p.x * 0.5 + 0.5) * w) + 'px';
      imgEls[i].style.top  = ((-p.y * 0.5 + 0.5) * h) + 'px';
    });
  }
})();
