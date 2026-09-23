// ─── SVG Constants ────────────────────────────────────────────────────────────
const FLAG_PIN_SVG  = '<svg width="16" height="16" viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="21" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M6 4.5 L18 4.5 L15 8 L18 11.5 L6 11.5 Z" fill="#fff"/><rect x="8" y="5.3" width="2" height="2" fill="#114084"/><rect x="12.2" y="5.3" width="2" height="2" fill="#114084"/><rect x="10.1" y="7.6" width="2" height="2" fill="#114084"/><rect x="14.3" y="9" width="2" height="1.6" fill="#114084"/></svg>';
const FLAG_LIST_SVG = '<svg width="11" height="11" viewBox="0 0 24 24"><line x1="6" y1="3" x2="6" y2="21" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M6 4.5 L18 4.5 L15 8 L18 11.5 L6 11.5 Z" fill="#fff"/></svg>';

// ─── Data & Metrics ───────────────────────────────────────────────────────────
let checkpoints = [];
let path = [];
let pathCum = [];       // Cumulative distance at each path point
let checkpointCum = []; // Cumulative distance mapped to each checkpoint
let totalPathDist = 0;
let map, canvasRenderer;

// ─── Route Constants ──────────────────────────────────────────────────────────
const OFF_ROUTE_THRESHOLD_M = 80;
const CHECKPOINT_REACH_M    = 60;
const MAX_STEP_ADVANCE_M    = 80;

// ─── Tracking State ───────────────────────────────────────────────────────────
let farthestCum = 0;
let currentCheckpointIdx = 1;
let lastStatusTime = 0;
const STATUS_THROTTLE_MS = 1200;

let userMarker = null, userAccuracy = null;
let watchId = null, tracking = false, autoFollow = true;
let meIcon = null;

// ─── QR Generator ─────────────────────────────────────────────────────────────
const qr = new QRGenerator({
  containerId:      'qrcode',
  logoUrl:          'foto/qr.png',
  colorDark:        '#114084',
  downloadFilename: 'qr-jalan-santai-unud.png'
});

// ─── Math Helpers ─────────────────────────────────────────────────────────────
function toRad(d) { return d * Math.PI / 180; }

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Path Metrics ─────────────────────────────────────────────────────────────
function computePathMetrics() {
  pathCum = [0];
  for (let i = 1; i < path.length; i++) {
    pathCum.push(pathCum[i - 1] + haversine(path[i - 1].lat, path[i - 1].lng, path[i].lat, path[i].lng));
  }
  totalPathDist = pathCum.length ? pathCum[pathCum.length - 1] : 0;

  checkpointCum = checkpoints.map(cp => {
    let bestIdx = 0, bestD = Infinity;
    for (let i = 0; i < path.length; i++) {
      const d = haversine(cp.lat, cp.lng, path[i].lat, path[i].lng);
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    return pathCum[bestIdx];
  });
}

// ─── Nearest Path Point (forward-biased) ─────────────────────────────────────
function nearestPathInfo(lat, lng) {
  let nearestIdx = 0, nearestD = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = haversine(lat, lng, path[i].lat, path[i].lng);
    if (d < nearestD) { nearestD = d; nearestIdx = i; }
  }
  if (nearestD > OFF_ROUTE_THRESHOLD_M) {
    return { cum: pathCum[nearestIdx], dist: nearestD };
  }

  let bestCum = pathCum[nearestIdx];
  let bestScore = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = haversine(lat, lng, path[i].lat, path[i].lng);
    if (d <= OFF_ROUTE_THRESHOLD_M) {
      const cum = pathCum[i];
      const delta = cum - farthestCum;
      const score = delta >= 0 ? delta : (-delta) * 3;
      if (score < bestScore) { bestScore = score; bestCum = cum; }
    }
  }
  return { cum: bestCum, dist: nearestD };
}

// ─── Status Update ────────────────────────────────────────────────────────────
function updateStatus(lat, lng) {
  if (!path.length || !checkpoints.length) return;
  const now = Date.now();
  if (now - lastStatusTime < STATUS_THROTTLE_MS) return;
  lastStatusTime = now;

  const { cum: rawCum, dist: offRouteDist } = nearestPathInfo(lat, lng);
  const onRoute = offRouteDist <= OFF_ROUTE_THRESHOLD_M;

  if (onRoute && currentCheckpointIdx < checkpoints.length) {
    const cp = checkpoints[currentCheckpointIdx];
    if (haversine(lat, lng, cp.lat, cp.lng) <= CHECKPOINT_REACH_M) {
      currentCheckpointIdx++;
    }
  }

  if (onRoute) {
    let cap = totalPathDist;
    if (currentCheckpointIdx < checkpoints.length) {
      cap = checkpointCum[currentCheckpointIdx] + CHECKPOINT_REACH_M;
    }
    const advanced = Math.min(rawCum, cap, farthestCum + MAX_STEP_ADVANCE_M);
    farthestCum = Math.max(farthestCum, advanced);
  }

  const finished = currentCheckpointIdx >= checkpoints.length;
  const nextIdx  = finished ? -1 : currentCheckpointIdx;
  const next     = finished ? checkpoints[checkpoints.length - 1] : checkpoints[nextIdx];

  const dToNext = finished ? 0 : Math.max(
    haversine(lat, lng, next.lat, next.lng),
    nextIdx >= 0 ? Math.max(0, checkpointCum[nextIdx] - farthestCum) : 0
  );

  const statusIcon = document.getElementById('statusIcon');
  const statusTo   = document.getElementById('statusTo');
  const statusName = document.getElementById('statusName');
  const statusDist = document.getElementById('statusDist');

  if (statusIcon) statusIcon.classList.toggle('off-route', !onRoute);
  if (statusDist) statusDist.classList.toggle('off-route', !onRoute);

  if (!onRoute) {
    statusTo.textContent   = 'Anda di luar jalur rute';
    statusName.textContent = next ? next.name : '-';
    statusDist.textContent = offRouteDist < 1000
      ? Math.round(offRouteDist) + ' m dari jalur'
      : (offRouteDist / 1000).toFixed(1) + ' km dari jalur';
  } else if (finished) {
    statusTo.textContent   = 'Selamat! \uD83C\uDF89';
    statusName.textContent = 'Anda sudah di garis finish!';
    statusDist.textContent = '\uD83C\uDFC1';
  } else {
    statusTo.textContent   = 'Menuju checkpoint berikutnya';
    statusName.textContent = next.name;
    statusDist.textContent = dToNext < 1000
      ? Math.round(dToNext) + ' m'
      : (dToNext / 1000).toFixed(1) + ' km';
  }

  const pct = totalPathDist ? Math.min(100, (farthestCum / totalPathDist) * 100) : 0;
  document.getElementById('progressFill').style.width = pct + '%';
}

// ─── GPS Tracking ─────────────────────────────────────────────────────────────
function startTracking() {
  if (!navigator.geolocation) { showToast('Perangkat tidak mendukung GPS'); return; }
  if (!path.length || !checkpoints.length) { showToast('Rute belum selesai dimuat, coba lagi sesaat lagi'); return; }

  watchId = navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude, accuracy } = pos.coords;
    if (!userMarker) {
      userMarker    = L.marker([latitude, longitude], { icon: meIcon, zIndexOffset: 1000 }).addTo(map);
      userAccuracy  = L.circle([latitude, longitude], { radius: accuracy, color: '#1f7ae0', fillColor: '#1f7ae0', fillOpacity: .12, weight: 1 }).addTo(map);
    } else {
      userMarker.setLatLng([latitude, longitude]);
      userAccuracy.setLatLng([latitude, longitude]);
      userAccuracy.setRadius(accuracy);
    }
    if (autoFollow) map.panTo([latitude, longitude]);
    updateStatus(latitude, longitude);
  }, err => {
    showToast(err.code === 1 ? 'Izin lokasi ditolak' : 'Gagal mengambil lokasi');
  }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 });

  tracking = true;
  document.getElementById('trackBtn').classList.add('active');
  document.getElementById('trackIcon').innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3"/></svg>';
  document.getElementById('trackLabel').textContent = 'Berhenti Lacak';
  document.getElementById('liveBadge').classList.add('live');
  document.getElementById('liveBadgeText').textContent = 'Lokasi aktif';
}

function stopTracking() {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  tracking = false;
  document.getElementById('trackBtn').classList.remove('active');
  document.getElementById('trackIcon').innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-7.58 7-12A7 7 0 0 0 5 9c0 4.42 7 12 7 12z"/><circle cx="12" cy="9" r="2.4"/></svg>';
  document.getElementById('trackLabel').textContent = 'Lacak Lokasi';
  document.getElementById('liveBadge').classList.remove('live');
  document.getElementById('liveBadgeText').textContent = 'Lokasi nonaktif';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer); // cegah timer lama memotong toast baru
  t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ─── Map Initialization ───────────────────────────────────────────────────────
function initMap() {
  meIcon = L.divIcon({ html: '<div class="me-pin"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
  canvasRenderer = L.canvas({ padding: 0.5 });

  map = L.map('map', {
    zoomControl: false, attributionControl: true,
    preferCanvas: true, renderer: canvasRenderer
  }).setView([checkpoints[0].lat, checkpoints[0].lng], 16);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors',
    updateWhenZooming: false, updateWhenIdle: true, keepBuffer: 2
  }).addTo(map);

  L.control.zoom({ position: 'topleft' }).addTo(map);

  const latlngs = path.map(p => [p.lat, p.lng]);
  const basePoly = L.polyline(latlngs, {
    color: '#114084', weight: 5, opacity: 0.95, lineJoin: 'round', renderer: canvasRenderer
  }).addTo(map);
  map.fitBounds(basePoly.getBounds(), { padding: [40, 40] });

  const svgRenderer  = L.svg({ padding: 0.5 });
  const animatedLine = L.polyline(latlngs, {
    color: '#FF6B00', weight: 3, opacity: 0.9,
    dashArray: '1 12', lineCap: 'round', lineJoin: 'round', renderer: svgRenderer
  }).addTo(map);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = animatedLine.getElement();
      if (el) {
        el.style.willChange = 'stroke-dashoffset';
        el.style.animation  = 'dashmove 1.4s linear infinite';
      }
    });
  });

  checkpoints.forEach((p, i) => {
    const isEdge = p.flag;
    const html   = isEdge
      ? `<div class="flag-pin">${FLAG_PIN_SVG}</div>`
      : `<div class="num-pin">${i}</div>`;
    const icon = L.divIcon({
      html, className: '',
      iconSize:   isEdge ? [30, 30] : [26, 26],
      iconAnchor: isEdge ? [15, 15] : [13, 13]
    });
    L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(`<b>${p.name}</b>`);
  });

  document.getElementById('metaDistance').textContent = (totalPathDist / 1000).toFixed(1) + ' km';
  const listEl = document.getElementById('routeList');
  checkpoints.forEach((p, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="num ${p.flag ? 'flag' : ''}">${p.flag ? FLAG_LIST_SVG : i}</span><span>${p.name}</span>`;
    listEl.appendChild(li);
  });

  document.getElementById('recenterBtn').addEventListener('click', () => {
    autoFollow = true;
    if (userMarker) map.panTo(userMarker.getLatLng());
    else showToast('Aktifkan lokasi dulu');
  });
  map.on('dragstart', () => { autoFollow = false; });
}

// ─── Route Loading ────────────────────────────────────────────────────────────
async function loadRoute() {
  try {
    const res  = await fetch('route.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    checkpoints = data.checkpoints || [];
    path        = data.path || [];
  } catch (err) {
    console.error('Gagal memuat route.json', err);
    showToast('Gagal memuat data rute');
    return;
  }
  computePathMetrics();
  initMap();
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
document.getElementById('trackBtn').addEventListener('click', () => {
  tracking ? stopTracking() : startTracking();
});

document.getElementById('infoBtn').addEventListener('click', () =>
  document.getElementById('infoModal').classList.add('show'));
document.getElementById('closeInfo').addEventListener('click', () =>
  document.getElementById('infoModal').classList.remove('show'));

const shareModal = document.getElementById('shareModal');
document.getElementById('shareBtn').addEventListener('click', () => {
  shareModal.classList.add('show');
  document.getElementById('urlBox').textContent = window.location.href;
  qr.text = window.location.href;
  qr.render();
});
document.getElementById('closeShare').addEventListener('click', () =>
  shareModal.classList.remove('show'));

document.getElementById('downloadBtn').addEventListener('click', () => {
  const ok  = qr.download();
  if (!ok) { showToast('QR belum siap, coba lagi.'); return; }
  const btn  = document.getElementById('downloadBtn');
  const orig = btn.textContent;
  btn.textContent = 'Terunduh!';
  btn.classList.add('done');
  setTimeout(() => { btn.textContent = orig; btn.classList.remove('done'); }, 1600);
});

document.getElementById('copyBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Tersalin!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Salin Link'; btn.classList.remove('copied'); }, 1600);
  });
});

document.querySelectorAll('.modal-back').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
});

loadRoute();
