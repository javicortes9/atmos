/* Atmos · app.js — predicción multimodelo y clima para el móvil */
{
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
async function getJSON(u) {
  const r = await fetch(u);
  let j; try { j = await r.json(); } catch (e) { throw new Error('Respuesta no válida (' + r.status + ')'); }
  if (j && j.error) throw new Error(j.reason || 'Error del servicio');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return j;
}
const num = (v, d = 0) => (v == null || isNaN(v)) ? '–' : Number(v).toLocaleString('es-ES', {minimumFractionDigits: d, maximumFractionDigits: d});
const sgn = (v, d = 1) => (v == null || isNaN(v)) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toLocaleString('es-ES', {minimumFractionDigits: d, maximumFractionDigits: d});
const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const pd = t => { const [d, h] = t.split('T'); const [y, m, dd] = d.split('-').map(Number); const hh = h ? +h.slice(0, 2) : 0; return {y, m, d: dd, h: hh, w: new Date(y, m - 1, dd).getDay()}; };
const lblH = t => { const p = pd(t); return DOW[p.w] + ' ' + p.d + ' · ' + String(p.h).padStart(2, '0') + 'h'; };
const lblD = t => { const p = pd(t); return DOW[p.w] + ' ' + p.d; };

/* ---------- escala térmica ---------- */
const TSTOPS = [[-12,'#2a2f9e'],[-2,'#3b4fd8'],[6,'#4fc1c6'],[14,'#9be3b0'],[20,'#f7e463'],[28,'#f59a3a'],[34,'#e8452c'],[42,'#8e1236']];
const hex = h => [1,3,5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };
function scaleCol(v, stops) {
  if (v == null || isNaN(v)) return 'transparent';
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  return stops[stops.length - 1][1];
}
const tCol = v => scaleCol(v, TSTOPS);
const HEAT = [[0,'#3b4fd8'],[.35,'#4fc1c6'],[.65,'#f7e463'],[1,'#e8452c']];

/* ---------- códigos WMO ---------- */
const WMO = {0:'Despejado',1:'Poco nuboso',2:'Intervalos nubosos',3:'Cubierto',45:'Niebla',48:'Niebla con escarcha',51:'Llovizna débil',53:'Llovizna',55:'Llovizna intensa',56:'Llovizna helada',57:'Llovizna helada intensa',61:'Lluvia débil',63:'Lluvia',65:'Lluvia fuerte',66:'Lluvia helada',67:'Lluvia helada fuerte',71:'Nieve débil',73:'Nieve',75:'Nieve fuerte',77:'Cinarra',80:'Chubascos débiles',81:'Chubascos',82:'Chubascos fuertes',85:'Chubascos de nieve',86:'Chubascos de nieve fuertes',95:'Tormenta',96:'Tormenta con granizo',99:'Tormenta con granizo fuerte'};
function wx(code, day = 1) {
  const c = +code;
  const sun = day ? '<circle cx="34" cy="26" r="11" fill="#f7e463"/><g stroke="#f7e463" stroke-width="3" stroke-linecap="round"><path d="M34 7v4M34 41v4M15 26h4M49 26h4M20.6 12.6l2.8 2.8M44.6 36.6l2.8 2.8M20.6 39.4l2.8-2.8M44.6 15.4l2.8-2.8"/></g>' : '<path d="M40 12a14 14 0 1 0 8 22 11 11 0 0 1-8-22z" fill="#d9e0ff"/>';
  const cloud = (f = '#dfe5ff', y = 0) => `<path transform="translate(0 ${y})" d="M18 50h28a10 10 0 0 0 0-20 13 13 0 0 0-25-3 9 9 0 0 0-3 23z" fill="${f}"/>`;
  const drops = n => Array.from({length: n}, (_, i) => `<path d="M${22 + i * 9} 54l-3 7" stroke="#4fc1c6" stroke-width="3" stroke-linecap="round"/>`).join('');
  const flakes = n => Array.from({length: n}, (_, i) => `<circle cx="${22 + i * 9}" cy="58" r="2.6" fill="#fff"/>`).join('');
  let s;
  if (c === 0) s = day ? '<g transform="translate(-2 6)">' + sun + '</g>' : '<g transform="translate(-6 6)">' + sun + '</g>';
  else if (c <= 2) s = sun + cloud('#dfe5ff', 6);
  else if (c === 3) s = cloud('#aeb9e6', -4) + cloud('#dfe5ff', 4);
  else if (c <= 48) s = cloud('#aeb9e6', -6) + '<g stroke="#aeb9e6" stroke-width="3" stroke-linecap="round"><path d="M14 52h36M18 59h28"/></g>';
  else if (c <= 67 || (c >= 80 && c <= 82)) s = (c >= 80 ? sun : '') + cloud('#c6cff2', -4) + drops(c === 51 || c === 61 || c === 80 ? 2 : 3);
  else if (c <= 86) s = cloud('#c6cff2', -4) + flakes(3);
  else s = cloud('#9aa6d6', -4) + '<path d="M33 44l-6 10h6l-4 9 10-13h-6l4-6z" fill="#f7e463"/>';
  return `<svg class="wx" viewBox="0 0 64 64" aria-hidden="true">${s}</svg>`;
}
const arrow = d => `<svg width="12" height="12" viewBox="0 0 24 24" style="transform:rotate(${(+d + 180) % 360}deg)"><path d="M12 2l6 18-6-4-6 4z" fill="currentColor"/></svg>`;

/* ---------- estado ---------- */
const S = {
  loc: store.get('atm.loc', {name: 'Sevilla', admin: 'Andalucía', lat: 37.3886, lon: -5.9823}),
  favs: store.get('atm.favs', []),
  mVar: store.get('atm.mVar', 'temperature_2m'),
  mModels: store.get('atm.mModels', ['ecmwf_ifs', 'ecmwf_aifs025_single', 'dwd_icon_seamless', 'ncep_gfs_seamless', 'meteofrance_seamless', 'ukmo_seamless']),
  mDays: store.get('atm.mDays', 7),
  eModel: store.get('atm.eModel', 'ecmwf_ifs025_ensemble'),
  eVar: store.get('atm.eVar', 'temperature_2m'),
  layer: 'radar', wOv: 'wind', wProd: 'ecmwf',
  loaded: {}, charts: {}
};
const LL = () => `latitude=${S.loc.lat.toFixed(4)}&longitude=${S.loc.lon.toFixed(4)}`;
function setChart(id, cfg) { if (S.charts[id]) S.charts[id].destroy(); S.charts[id] = new Chart(document.getElementById(id), cfg); }

/* Chart.js defaults */
Chart.defaults.color = '#9ea9d6';
Chart.defaults.font.family = '"Red Hat Text", system-ui, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.borderColor = 'rgba(255,255,255,.07)';
Chart.defaults.animation = false;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.boxHeight = 10;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,29,71,.96)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,.15)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.elements.point.radius = 0;
Chart.defaults.elements.line.borderWidth = 2;
const narrow = () => innerWidth < 520;
const xTicks = () => ({maxTicksLimit: narrow() ? 4 : 8, maxRotation: 0, autoSkip: true, autoSkipPadding: 18});

/* =========================================================
   AHORA
   ========================================================= */
async function loadNow() {
  const box = $('#nowBox');
  box.innerHTML = '<div class="state">Cargando predicción…</div>';
  const u = `https://api.open-meteo.com/v1/forecast?${LL()}&timezone=auto&forecast_days=16` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation,cloud_cover' +
    '&hourly=temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset,uv_index_max';
  try {
    const j = await getJSON(u);
    store.set('atm.cacheNow', {k: LL(), j});
    renderNow(j);
  } catch (e) {
    const c = store.get('atm.cacheNow');
    if (c && c.k === LL()) { renderNow(c.j); box.insertAdjacentHTML('beforeend', '<p class="note err">Sin conexión: mostrando la última predicción guardada.</p>'); }
    else box.innerHTML = `<div class="state err">No se pudo cargar la predicción: ${esc(e.message)}</div>`;
  }
  loadAQ();
}
function renderNow(j) {
  const c = j.current, d = j.daily, h = j.hourly;
  $('#nowBox').style.background = `linear-gradient(150deg, ${tCol(c.temperature_2m)} -30%, var(--bg2) 70%)`;
  $('#nowBox').innerHTML = `${wx(c.weather_code, c.is_day)}
    <div class="t">${num(c.temperature_2m)}°</div>
    <div class="d">${esc(WMO[c.weather_code] || '')}</div>
    <div class="m">Sensación ${num(c.apparent_temperature)}° · Máx ${num(d.temperature_2m_max[0])}° · Mín ${num(d.temperature_2m_min[0])}°</div>
    <div class="m">${esc(S.loc.name)}${S.loc.admin ? ', ' + esc(S.loc.admin) : ''} · ${num(S.loc.lat, 3)}, ${num(S.loc.lon, 3)} · ${j.elevation != null ? num(j.elevation) + ' m' : ''}</div>`;
  const sr = d.sunrise[0]?.slice(11, 16), ss = d.sunset[0]?.slice(11, 16);
  $('#nowKv').innerHTML = [
    ['Viento', `${arrow(c.wind_direction_10m)} ${num(c.wind_speed_10m)} km/h`],
    ['Rachas', num(c.wind_gusts_10m) + ' km/h'],
    ['Humedad', num(c.relative_humidity_2m) + ' %'],
    ['Presión', num(c.pressure_msl) + ' hPa'],
    ['Nubosidad', num(c.cloud_cover) + ' %'],
    ['Precip. hoy', num(d.precipitation_sum[0], 1) + ' mm'],
    ['UV máx.', num(d.uv_index_max[0], 1)],
    ['Orto', sr || '–'], ['Ocaso', ss || '–']
  ].map(([k, v]) => `<div><small>${k}</small><strong>${v}</strong></div>`).join('');
  const cur = c.time.slice(0, 13);
  let i0 = h.time.findIndex(t => t.slice(0, 13) >= cur); if (i0 < 0) i0 = 0;
  const idx = Array.from({length: 48}, (_, k) => i0 + k).filter(i => i < h.time.length);
  $('#hours').innerHTML = idx.map(i => {
    const t = h.temperature_2m[i], p = h.precipitation[i], pp = h.precipitation_probability[i];
    const dark = t > 8 && t < 31;
    return `<div class="hr" style="background:${tCol(t)};color:${dark ? '#0b1433' : '#fff'}">
      <div class="h">${i === i0 ? 'Ahora' : h.time[i].slice(11, 13) + 'h'}</div>${wx(h.weather_code[i], h.is_day[i])}
      <div class="v">${num(t)}°</div><div class="p">${p >= 0.1 ? num(p, 1) + ' mm' : (pp ? pp + ' %' : '')}</div>
      <div class="w">${arrow(h.wind_direction_10m[i])}${num(h.wind_speed_10m[i])}</div></div>`;
  }).join('');
  const lo = Math.min(...d.temperature_2m_min.filter(v => v != null)), hi = Math.max(...d.temperature_2m_max.filter(v => v != null));
  const span = Math.max(1, hi - lo);
  $('#days').innerHTML = d.time.map((t, i) => {
    const mn = d.temperature_2m_min[i], mx = d.temperature_2m_max[i];
    if (mn == null) return '';
    const a = (mn - lo) / span * 100, b = (mx - lo) / span * 100;
    const p = pd(t);
    return `<div class="day"><div class="n">${i === 0 ? 'Hoy' : DOW[p.w]}<small>${p.d} ${MON[p.m - 1]}</small></div>${wx(d.weather_code[i], 1)}
      <div class="rng"><span>${num(mn)}°</span><div class="bar"><i style="left:${a}%;width:${Math.max(3, b - a)}%;background:linear-gradient(90deg,${tCol(mn)},${tCol(mx)})"></i></div><span>${num(mx)}°</span></div>
      <div class="pp">${d.precipitation_probability_max[i] != null ? d.precipitation_probability_max[i] + ' %' : ''}${d.precipitation_sum[i] >= 0.5 ? '<br>' + num(d.precipitation_sum[i], 1) + ' mm' : ''}</div></div>`;
  }).join('');
}
const AQI = [[20,'Buena','#4fc1c6'],[40,'Aceptable','#9be3b0'],[60,'Moderada','#f7e463'],[80,'Mala','#f59a3a'],[100,'Muy mala','#e8452c'],[1e9,'Extremadamente mala','#8e1236']];
async function loadAQ() {
  const box = $('#aq');
  box.innerHTML = '<div class="state">Cargando…</div>';
  try {
    const j = await getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?${LL()}&timezone=auto&forecast_days=4&hourly=european_aqi,pm2_5,pm10,dust,uv_index,ozone,olive_pollen,grass_pollen,birch_pollen`);
    const h = j.hourly, now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}`;
    let i = h.time.findIndex(t => t.slice(0, 13) >= stamp); if (i < 0) i = 0;
    const aqi = h.european_aqi[i], cat = AQI.find(a => (aqi ?? 0) <= a[0]);
    const pol = (k, l) => h[k] && h[k].some(v => v > 0) ? [l, num(Math.max(...h[k].slice(i, i + 24).map(v => v || 0))) + ' granos/m³', 'máx. 24 h'] : null;
    const items = [
      ['Índice europeo', num(aqi), cat ? cat[1] : '', cat ? cat[2] : null],
      ['PM2,5', num(h.pm2_5[i]) + ' µg/m³', ''], ['PM10', num(h.pm10[i]) + ' µg/m³', ''],
      ['Polvo sahariano', num(h.dust[i]) + ' µg/m³', ''], ['Ozono', num(h.ozone[i]) + ' µg/m³', ''], ['Índice UV', num(h.uv_index[i], 1), ''],
      pol('olive_pollen', 'Polen de olivo'), pol('grass_pollen', 'Polen de gramíneas'), pol('birch_pollen', 'Polen de abedul')
    ].filter(Boolean);
    box.innerHTML = items.map(([k, v, s, col]) => `<div${col ? ` style="background:${col};color:#0b1433"` : ''}><small${col ? ' style="color:#0b1433"' : ''}>${k}</small><strong>${v}</strong>${s ? `<small${col ? ' style="color:#0b1433"' : ''}>${s}</small>` : ''}</div>`).join('');
    setChart('aqChart', {type: 'line', data: {labels: h.time.map(lblH), datasets: [
      {label: 'Índice europeo', data: h.european_aqi, borderColor: '#f7e463', yAxisID: 'y'},
      {label: 'Polvo µg/m³', data: h.dust, borderColor: '#f59a3a', borderDash: [4, 3], yAxisID: 'y1'}]},
      options: {interaction: {mode: 'index', intersect: false}, scales: {x: {ticks: xTicks(), grid: {display: false}}, y: {beginAtZero: true}, y1: {position: 'right', beginAtZero: true, grid: {display: false}}}}});
  } catch (e) { box.innerHTML = `<div class="state err">Calidad del aire no disponible: ${esc(e.message)}</div>`; }
}

/* =========================================================
   MODELOS
   ========================================================= */
const MODELS = [
  {id: 'ecmwf_ifs', l: 'ECMWF IFS 9 km', c: '#f7e463'},
  {id: 'ecmwf_aifs025_single', l: 'ECMWF AIFS (IA)', c: '#e8452c'},
  {id: 'ecmwf_ifs025', l: 'ECMWF IFS 0,25°', c: '#ffd27a'},
  {id: 'dwd_icon_seamless', l: 'DWD ICON', c: '#4fc1c6'},
  {id: 'ncep_gfs_seamless', l: 'NOAA GFS', c: '#8ea2ff'},
  {id: 'meteofrance_seamless', l: 'Météo-France AROME/ARPEGE', c: '#ff9ad5'},
  {id: 'meteofrance_arome_france_hd', l: 'AROME HD 1,3 km', c: '#ff5fb0'},
  {id: 'ukmo_seamless', l: 'UK Met Office', c: '#b7f08a'},
  {id: 'knmi_seamless', l: 'KNMI HARMONIE', c: '#ffad5a'},
  {id: 'dmi_seamless', l: 'DMI HARMONIE', c: '#c9a7ff'},
  {id: 'italia_meteo_arpae_icon_2i', l: 'ItaliaMeteo ICON 2I', c: '#7fe3ff'},
  {id: 'meteoswiss_icon_seamless', l: 'MeteoSwiss ICON', c: '#ff7b7b'},
  {id: 'cmc_gem_seamless', l: 'Canadá GEM', c: '#ffffff'},
  {id: 'jma_seamless', l: 'Japón JMA', c: '#a3b1c9'},
  {id: 'metno_seamless', l: 'MET Norway', c: '#6ee7b7'},
  {id: 'cma_grapes_global', l: 'China CMA', c: '#d6b38a'}
];
const VARS = [
  {id: 'temperature_2m', l: 'Temperatura', u: '°C', agg: 'maxmin', d: 1},
  {id: 'precipitation', l: 'Precipitación', u: 'mm', agg: 'sum', d: 1, cum: true},
  {id: 'wind_speed_10m', l: 'Viento', u: 'km/h', agg: 'max', d: 0},
  {id: 'wind_gusts_10m', l: 'Rachas', u: 'km/h', agg: 'max', d: 0},
  {id: 'cloud_cover', l: 'Nubosidad', u: '%', agg: 'mean', d: 0},
  {id: 'relative_humidity_2m', l: 'Humedad', u: '%', agg: 'mean', d: 0},
  {id: 'pressure_msl', l: 'Presión', u: 'hPa', agg: 'mean', d: 0},
  {id: 'cape', l: 'CAPE', u: 'J/kg', agg: 'max', d: 0},
  {id: 'freezing_level_height', l: 'Isocero', u: 'm', agg: 'mean', d: 0},
  {id: 'shortwave_radiation', l: 'Radiación', u: 'W/m²', agg: 'max', d: 0},
  {id: 'dew_point_2m', l: 'Punto de rocío', u: '°C', agg: 'mean', d: 1}
];
function renderModelControls() {
  $('#varChips').innerHTML = VARS.map(v => `<button class="chip" data-v="${v.id}" aria-pressed="${v.id === S.mVar}">${v.l}</button>`).join('');
  $('#modelChips').innerHTML = MODELS.map(m => `<button class="chip" data-m="${m.id}" aria-pressed="${S.mModels.includes(m.id)}"><b style="background:${m.c}"></b>${m.l}</button>`).join('');
  document.querySelectorAll('#daysSeg button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.d === S.mDays));
}
async function loadModels() {
  renderModelControls();
  const v = VARS.find(x => x.id === S.mVar);
  const ms = S.mModels.length ? S.mModels : ['ecmwf_ifs'];
  $('#spreadNote').textContent = 'Cargando…';
  try {
    const j = await getJSON(`https://api.open-meteo.com/v1/forecast?${LL()}&timezone=auto&forecast_days=${S.mDays}&hourly=${v.id}&models=${ms.join(',')}`);
    const h = j.hourly;
    const series = ms.map(m => {
      const meta = MODELS.find(x => x.id === m);
      let arr = h[`${v.id}_${m}`] ?? (ms.length === 1 ? h[v.id] : null);
      return {m, meta, raw: arr || []};
    }).filter(s => s.raw.some(x => x != null));
    const missing = ms.filter(m => !series.find(s => s.m === m)).map(m => MODELS.find(x => x.id === m).l);
    const plot = s => {
      if (!v.cum) return s.raw;
      let acc = 0; return s.raw.map(x => x == null ? null : (acc += x));
    };
    setChart('mChart', {type: 'line', data: {labels: h.time.map(lblH), datasets: series.map(s => ({label: s.meta.l, data: plot(s), borderColor: s.meta.c, backgroundColor: s.meta.c, borderWidth: s.m.startsWith('ecmwf') ? 2.6 : 1.8, spanGaps: false}))},
      options: {interaction: {mode: 'index', intersect: false},
        plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}, tooltip: {callbacks: {label: c => ` ${c.dataset.label}: ${num(c.parsed.y, v.d)} ${v.u}`}},
          title: {display: true, text: (v.cum ? 'Precipitación acumulada' : v.l) + ' (' + v.u + ')', align: 'start', color: '#eef1ff', font: {size: 14, weight: '700'}}},
        scales: {x: {ticks: xTicks(), grid: {display: false}}, y: {beginAtZero: ['precipitation', 'cape', 'cloud_cover', 'shortwave_radiation'].includes(v.id)}}}});
    // dispersión
    let maxSp = 0, at = null;
    h.time.forEach((t, i) => { const vals = series.map(s => plot(s)[i]).filter(x => x != null); if (vals.length > 1) { const sp = Math.max(...vals) - Math.min(...vals); if (sp > maxSp) { maxSp = sp; at = t; } } });
    $('#spreadNote').textContent = (series.length > 1 && at ? `Máximo desacuerdo: ${num(maxSp, v.d)} ${v.u} (${lblH(at)})` : '') + (missing.length ? ` · Sin datos aquí: ${missing.join(', ')}` : '');
    // tabla diaria
    const days = [...new Set(h.time.map(t => t.slice(0, 10)))].slice(0, Math.min(S.mDays, 10));
    const aggDay = (raw, day) => {
      const vals = h.time.map((t, i) => t.startsWith(day) ? raw[i] : undefined).filter(x => x != null);
      if (vals.length < 12) return null;
      if (v.agg === 'sum') return vals.reduce((a, b) => a + b, 0);
      if (v.agg === 'max' || v.agg === 'maxmin') return Math.max(...vals);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    const rows = series.map(s => ({s, vals: days.map(dd => aggDay(s.raw, dd))}));
    const all = rows.flatMap(r => r.vals).filter(x => x != null);
    const lo = Math.min(...all), hi = Math.max(...all), sp = Math.max(1e-9, hi - lo);
    $('#heatTitle').textContent = `${v.l}: ${v.agg === 'sum' ? 'total diario' : v.agg === 'mean' ? 'media diaria' : 'máxima diaria'} por modelo (${v.u})`;
    $('#heat').innerHTML = `<thead><tr><th>Modelo</th>${days.map(dd => `<th>${lblD(dd)}</th>`).join('')}</tr></thead><tbody>` +
      rows.map(r => `<tr><td><b style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${r.s.meta.c};margin-right:6px"></b>${esc(r.s.meta.l)}</td>${r.vals.map(x => x == null ? '<td>–</td>' : `<td class="v" style="background:${v.id === 'temperature_2m' || v.id === 'dew_point_2m' ? tCol(x) : scaleCol((x - lo) / sp, HEAT)}">${num(x, v.d)}</td>`).join('')}</tr>`).join('') + '</tbody>';
  } catch (e) { $('#spreadNote').innerHTML = `<span class="err">Error: ${esc(e.message)}</span>`; }
}
const ENS = [
  {id: 'ecmwf_ifs025_ensemble', l: 'ECMWF IFS ENS · 51 miembros'},
  {id: 'ecmwf_aifs025_ensemble', l: 'ECMWF AIFS ENS (IA)'},
  {id: 'dwd_icon_seamless_eps', l: 'DWD ICON-EPS'},
  {id: 'ncep_gefs_seamless', l: 'NOAA GEFS'},
  {id: 'ukmo_global_ensemble_20km', l: 'UK Met Office MOGREPS-G'},
  {id: 'gem_global_ensemble', l: 'Canadá GEPS'}
];
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); const k = (s.length - 1) * p, f = Math.floor(k); return s[f] + (s[Math.min(f + 1, s.length - 1)] - s[f]) * (k - f); };
async function loadEnsemble() {
  $('#ensModel').innerHTML = ENS.map(e => `<option value="${e.id}"${e.id === S.eModel ? ' selected' : ''}>${e.l}</option>`).join('');
  document.querySelectorAll('#ensVar button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === S.eVar));
  const v = VARS.find(x => x.id === S.eVar);
  $('#prob').innerHTML = '<div class="state">Cargando miembros…</div>';
  try {
    const vars = [...new Set([S.eVar, 'precipitation'])];
    const j = await getJSON(`https://ensemble-api.open-meteo.com/v1/ensemble?${LL()}&timezone=auto&forecast_days=15&hourly=${vars.join(',')}&models=${S.eModel}`);
    const h = j.hourly;
    const members = name => Object.keys(h).filter(k => k === name || new RegExp('^' + name + '_member\\d+$').test(k)).map(k => h[k]);
    const M = members(S.eVar);
    const n = h.time.length;
    let last = n; while (last > 0 && M.every(m => m[last - 1] == null)) last--;
    const T = h.time.slice(0, last);
    const stat = p => T.map((_, i) => { const a = M.map(m => m[i]).filter(x => x != null); return a.length ? pct(a, p) : null; });
    const ds = M.map(m => ({data: m.slice(0, last), borderColor: 'rgba(158,169,214,.22)', borderWidth: 1, label: '_m'}));
    ds.push({label: 'P10', data: stat(.1), borderColor: 'rgba(79,193,198,.6)', borderWidth: 1});
    ds.push({label: 'P90', data: stat(.9), borderColor: 'rgba(79,193,198,.6)', borderWidth: 1, fill: '-1', backgroundColor: 'rgba(79,193,198,.18)'});
    ds.push({label: 'Mediana', data: stat(.5), borderColor: '#f7e463', borderWidth: 2.6});
    setChart('eChart', {type: 'line', data: {labels: T.map(lblH), datasets: ds},
      options: {interaction: {mode: 'index', intersect: false},
        plugins: {legend: {display: false}, title: {display: true, text: `${v.l} (${v.u}) · ${M.length} miembros`, align: 'start', color: '#eef1ff', font: {size: 14, weight: '700'}},
          tooltip: {filter: c => c.dataset.label !== '_m', callbacks: {label: c => ` ${c.dataset.label}: ${num(c.parsed.y, v.d)} ${v.u}`}}},
        scales: {x: {ticks: xTicks(), grid: {display: false}}, y: {beginAtZero: S.eVar !== 'temperature_2m'}}}});
    const P = members('precipitation');
    const days = [...new Set(T.map(t => t.slice(0, 10)))];
    $('#prob').innerHTML = days.map(dd => {
      const idx = T.map((t, i) => t.startsWith(dd) ? i : -1).filter(i => i >= 0);
      const sums = P.map(m => idx.reduce((a, i) => a + (m[i] || 0), 0));
      const p1 = sums.filter(s => s >= 1).length / sums.length * 100, p10 = sums.filter(s => s >= 10).length / sums.length * 100;
      return `<div class="r"><span>${lblD(dd)}</span><div class="b"><i style="width:${p1}%"></i><i class="x" style="width:${p10}%"></i></div><span>${num(p1)} %</span></div>`;
    }).join('');
  } catch (e) { $('#prob').innerHTML = `<div class="state err">Conjunto no disponible: ${esc(e.message)}</div>`; }
}

/* =========================================================
   MAPAS
   ========================================================= */
let map, marker, base, rvFrames = [], rvLayers = [], rvIdx = 0, rvTimer = null, satLayer;
const LAYERS = [{id: 'radar', l: 'Radar'}, {id: 'sat', l: 'Satélite color real'}, {id: 'none', l: 'Solo mapa'}];
function initMap() {
  if (map) { map.invalidateSize(); map.setView([S.loc.lat, S.loc.lon]); marker.setLatLng([S.loc.lat, S.loc.lon]); return; }
  map = L.map('map', {zoomControl: true, attributionControl: true}).setView([S.loc.lat, S.loc.lon], 7);
  const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  base = L.tileLayer(esri + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {maxZoom: 16, attribution: 'Mapa © Esri, HERE, Garmin, © OpenStreetMap'}).addTo(map);
  L.tileLayer(esri + 'Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {maxZoom: 16, pane: 'overlayPane', zIndex: 20}).addTo(map);
  marker = L.circleMarker([S.loc.lat, S.loc.lon], {radius: 7, color: '#0b1433', weight: 2, fillColor: '#f7e463', fillOpacity: 1}).addTo(map);
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  satLayer = L.tileLayer(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${y}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`, {maxNativeZoom: 9, maxZoom: 14, attribution: 'NASA GIBS · VIIRS ' + y});
  map.on('click', e => {
    const {lat, lng} = e.latlng;
    const div = document.createElement('div');
    div.innerHTML = `<b>${num(lat, 3)}, ${num(lng, 3)}</b><br>`;
    const b = document.createElement('button'); b.className = 'btn'; b.style.marginTop = '8px'; b.textContent = 'Usar este punto';
    b.onclick = () => { map.closePopup(); setLoc({name: `${num(lat, 2)}, ${num(lng, 2)}`, admin: '', lat, lon: lng}); };
    div.appendChild(b);
    L.popup().setLatLng(e.latlng).setContent(div).openOn(map);
  });
  $('#layerChips').innerHTML = LAYERS.map(l => `<button class="chip" data-l="${l.id}" aria-pressed="${l.id === S.layer}">${l.l}</button>`).join('');
  loadRadar();
}
async function loadRadar() {
  try {
    const j = await getJSON('https://api.rainviewer.com/public/weather-maps.json');
    rvFrames = (j.radar?.past || []);
    rvLayers = rvFrames.map(f => L.tileLayer(`${j.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, {opacity: 0, maxNativeZoom: 7, maxZoom: 14, attribution: 'Radar © RainViewer', zIndex: 5}));
    rvIdx = rvFrames.length - 1;
    applyLayer();
  } catch (e) { $('#rvtime').textContent = 'Radar no disponible ahora mismo'; }
}
function showFrame(i) {
  rvLayers.forEach((l, k) => { if (k === i) { if (!map.hasLayer(l)) l.addTo(map); l.setOpacity(.8); } else if (map.hasLayer(l)) l.setOpacity(0); });
  const f = rvFrames[i]; if (f) { const d = new Date(f.time * 1000); $('#rvtime').textContent = 'Radar ' + d.toLocaleString('es-ES', {weekday: 'short', hour: '2-digit', minute: '2-digit'}); }
}
function applyLayer() {
  if (!map) return;
  document.querySelectorAll('#layerChips .chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.l === S.layer));
  if (S.layer === 'sat') satLayer.addTo(map); else map.removeLayer(satLayer);
  if (S.layer === 'radar' && rvLayers.length) { showFrame(rvIdx); $('#rvPlay').hidden = false; }
  else { rvLayers.forEach(l => map.hasLayer(l) && map.removeLayer(l)); stopRadar(); $('#rvPlay').hidden = true; $('#rvtime').textContent = S.layer === 'sat' ? 'Mosaico VIIRS de ayer (NASA)' : ''; }
}
function stopRadar() { clearInterval(rvTimer); rvTimer = null; $('#rvPlay').textContent = '▶'; }
const WOV = [['wind', 'Viento'], ['gust', 'Rachas'], ['rain', 'Lluvia'], ['temp', 'Temperatura'], ['clouds', 'Nubes'], ['pressure', 'Presión'], ['cape', 'CAPE'], ['rh', 'Humedad'], ['waves', 'Oleaje']];
function renderWindy() {
  $('#wOverlay').innerHTML = WOV.map(([k, l]) => `<button class="chip" data-w="${k}" aria-pressed="${k === S.wOv}">${l}</button>`).join('');
  document.querySelectorAll('#wProd button').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === S.wProd));
  const {lat, lon} = S.loc;
  const u = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=6&overlay=${S.wOv}&product=${S.wProd}&level=surface&lat=${lat.toFixed(3)}&lon=${lon.toFixed(3)}&detailLat=${lat.toFixed(3)}&detailLon=${lon.toFixed(3)}&detail=true&message=true`;
  if ($('#windy').src !== u) $('#windy').src = u;
}

/* ---------- WXCharts (enlaces; la web no permite iframe) ---------- */
const WXM = [['ecmwf_op','ECMWF HRES'],['ecmwf_eps','ECMWF ENS'],['gfs_op','GFS'],['gfs_ens','GEFS'],['ukmo gobal','UKMO'],['icon-eu','ICON-EU'],['arpege','ARPEGE'],['arome','AROME'],['gdps','GDPS (Canadá)']];
const WXE = [['overview','Resumen'],['mslp','Presión (MSLP)'],['gh500','500 hPa'],['850temp','850 hPa temp.'],['850temp_anom','Anomalía 850 hPa'],['2m_tt','Temperatura 2 m'],['2mtemp_anom','Anomalía 2 m'],['2mdp','Punto de rocío'],['accprecip24','Precip. 24 h'],['accprecip','Precip. total'],['wind10mkph','Viento 10 m'],['gustkph','Rachas'],['cape','CAPE'],['convective_overview','Convección']];
const WXR = [['spain','Iberia'],['pyrenees','Pirineos'],['Mediterranean','Mediterráneo'],['europe','Europa'],['EUR_NA','Europa y Atlántico N']];
S.wx = store.get('atm.wx', {m: 'ecmwf_op', e: 'overview', r: 'spain'});
const wxUrl = (m, e, r) => `https://wxcharts.com/?dataset=${encodeURIComponent(m)}&region=${encodeURIComponent(r)}&element=${encodeURIComponent(e)}&lat=${S.loc.lat.toFixed(3)}&lon=${S.loc.lon.toFixed(3)}`;
function renderWx() {
  const chips = (L, k) => L.map(([id, l]) => `<button class="chip" data-${k}="${esc(id)}" aria-pressed="${S.wx[k] === id}">${l}</button>`).join('');
  $('#wxModel').innerHTML = chips(WXM, 'm');
  $('#wxEl').innerHTML = chips(WXE, 'e');
  $('#wxReg').innerHTML = chips(WXR, 'r');
  const ml = WXM.find(x => x[0] === S.wx.m)[1], el = WXE.find(x => x[0] === S.wx.e)[1], rl = WXR.find(x => x[0] === S.wx.r)[1];
  $('#wxGo').href = wxUrl(S.wx.m, S.wx.e, S.wx.r);
  $('#wxGo').textContent = `Abrir ${ml} · ${el} · ${rl} ↗`;
  const Q = [
    ['ECMWF · presión y frentes', 'Europa y Atlántico N, para ver borrascas y anticiclones', 'ecmwf_op', 'mslp', 'EUR_NA'],
    ['ECMWF · 500 hPa', 'Dorsales, vaguadas y DANAs sobre Europa', 'ecmwf_op', 'gh500', 'europe'],
    ['GFS · 850 hPa', 'Masas de aire frías o cálidas sobre Iberia', 'gfs_op', '850temp', 'spain'],
    ['ECMWF ENS · anomalía 850 hPa', 'Tendencia de la temperatura en altura', 'ecmwf_eps', '850temp_anom', 'europe'],
    ['AROME · precipitación 24 h', 'Alta resolución para los próximos 2 días', 'arome', 'accprecip24', 'spain'],
    ['ICON-EU · rachas', 'Temporales de viento en la Península', 'icon-eu', 'gustkph', 'spain'],
    ['ARPEGE · CAPE', 'Potencial de tormentas', 'arpege', 'cape', 'spain'],
    ['ECMWF · precipitación total', 'Lluvia acumulada en todo el periodo', 'ecmwf_op', 'accprecip', 'spain']
  ];
  $('#wxQuick').innerHTML = Q.map(([t, d, m, e, r]) => `<a href="${esc(wxUrl(m, e, r))}" target="_blank" rel="noopener"><strong>${t}</strong><span>${d}</span></a>`).join('');
}
$('#v-mapas').addEventListener('click', e => {
  const b = e.target.closest('#wxModel [data-m], #wxEl [data-e], #wxReg [data-r]'); if (!b) return;
  const k = b.dataset.m != null ? 'm' : b.dataset.e != null ? 'e' : 'r';
  S.wx[k] = b.dataset[k]; store.set('atm.wx', S.wx); renderWx();
});

/* =========================================================
   CLIMA
   ========================================================= */
const STRIPE = ['#08306b','#08519c','#2171b5','#4292c6','#6baed6','#9ecae1','#c6dbef','#deebf7','#fee0d2','#fcbba1','#fc9272','#fb6a4a','#ef3b2c','#cb181d','#a50f15','#67000d'];
const CMIP = [['CMCC_CM2_VHR4','CMCC (Italia)'],['FGOALS_f3_H','FGOALS (China)'],['HiRAM_SIT_HR','HiRAM (Taiwán)'],['MRI_AGCM3_2_S','MRI (Japón)'],['EC_Earth3P_HR','EC-Earth (UE)'],['MPI_ESM1_2_XR','MPI (Alemania)'],['NICAM16_8S','NICAM (Japón)']];
const mean = a => { const b = a.filter(x => x != null && !isNaN(x)); return b.length ? b.reduce((x, y) => x + y, 0) / b.length : null; };
function linreg(xs, ys) { const p = xs.map((x, i) => [x, ys[i]]).filter(q => q[1] != null); const n = p.length; const mx = mean(p.map(q => q[0])), my = mean(p.map(q => q[1])); let a = 0, b = 0; p.forEach(([x, y]) => { a += (x - mx) * (y - my); b += (x - mx) ** 2; }); return n > 2 ? a / b : null; }
const running = (a, w) => a.map((_, i) => i < w - 1 ? null : mean(a.slice(i - w + 1, i + 1)));
function annual(time, tv, pv) {
  const Y = {};
  time.forEach((t, i) => { const y = +t.slice(0, 4), m = +t.slice(5, 7); const o = Y[y] || (Y[y] = {t: [], p: 0, pn: 0, n: 0, mt: Array.from({length: 12}, () => []), mp: Array(12).fill(0)}); o.n++; if (tv[i] != null) { o.t.push(tv[i]); o.mt[m - 1].push(tv[i]); } if (pv && pv[i] != null) { o.p += pv[i]; o.mp[m - 1] += pv[i]; } else o.pn++; });
  return Y;
}
async function loadClimate() {
  const key = `atm.clim.${S.loc.lat.toFixed(2)},${S.loc.lon.toFixed(2)}`;
  const cached = store.get(key);
  if (cached && Date.now() - cached.at < 7 * 864e5) return renderClimate(cached);
  $('#stripes').innerHTML = '<div class="state">Cargando 85 años de reanálisis…</div>';
  $('#climTiles').innerHTML = '';
  const end = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);
  try {
    const [era, cm] = await Promise.all([
      getJSON(`https://archive-api.open-meteo.com/v1/archive?${LL()}&models=era5&start_date=1940-01-01&end_date=${end}&daily=temperature_2m_mean,precipitation_sum&timezone=auto`),
      getJSON(`https://climate-api.open-meteo.com/v1/climate?${LL()}&start_date=1950-01-01&end_date=2050-12-31&daily=temperature_2m_mean,precipitation_sum&models=${CMIP.map(c => c[0]).join(',')}`).catch(() => null)
    ]);
    const d = era.daily, Y = annual(d.time, d.temperature_2m_mean, d.precipitation_sum);
    const years = Object.keys(Y).map(Number).filter(y => Y[y].n >= 360 && Y[y].pn < 15).sort((a, b) => a - b);
    const T = years.map(y => mean(Y[y].t)), P = years.map(y => Y[y].p);
    const base = years.map((y, i) => [y, i]).filter(([y]) => y >= 1961 && y <= 1990).map(([, i]) => i);
    const tB = mean(base.map(i => T[i])), pB = mean(base.map(i => P[i]));
    // normales 1991–2020 mensuales
    const nY = years.filter(y => y >= 1991 && y <= 2020);
    const nT = Array.from({length: 12}, (_, m) => mean(nY.map(y => mean(Y[y].mt[m])))), nP = Array.from({length: 12}, (_, m) => mean(nY.map(y => Y[y].mp[m])));
    // últimos 12 meses completos
    const M = {}; d.time.forEach((t, i) => { const k = t.slice(0, 7); const o = M[k] || (M[k] = {t: [], p: 0, n: 0}); o.n++; if (d.temperature_2m_mean[i] != null) o.t.push(d.temperature_2m_mean[i]); o.p += d.precipitation_sum[i] || 0; });
    const mk = Object.keys(M).filter(k => M[k].n >= 28).sort().slice(-12);
    const last12 = mk.map(k => ({k, t: mean(M[k].t), p: M[k].p}));
    const out = {at: Date.now(), years, T, P, tB, pB, nT, nP, last12, proj: null};
    if (cm) {
      const cd = cm.daily;
      out.proj = CMIP.map(([id, l]) => {
        const t = cd[`temperature_2m_mean_${id}`]; if (!t) return null;
        const A = annual(cd.time, t, cd[`precipitation_sum_${id}`]);
        const ys = Object.keys(A).map(Number).filter(y => A[y].n >= 360).sort((a, b) => a - b);
        const tt = ys.map(y => mean(A[y].t)), pp = ys.map(y => A[y].p);
        const bi = ys.map((y, i) => [y, i]).filter(([y]) => y >= 1961 && y <= 1990).map(([, i]) => i);
        const b = mean(bi.map(i => tt[i])), bp = mean(bi.map(i => pp[i]));
        return {id, l, ys, ta: tt.map(x => x - b), pa: pp.map(x => (x / bp - 1) * 100)};
      }).filter(Boolean);
    }
    store.set(key, out);
    renderClimate(out);
  } catch (e) { $('#stripes').innerHTML = `<div class="state err">No se pudo cargar el reanálisis: ${esc(e.message)}</div>`; }
}
function renderClimate(c) {
  const {years, T, P, tB, pB} = c;
  const A = T.map(t => t - tB);
  const lim = Math.max(1.2, ...A.map(Math.abs));
  // franjas
  const box = $('#stripes');
  const W = 1000, n = years.length;
  box.innerHTML = `<svg viewBox="0 0 ${W} 100" preserveAspectRatio="none">${A.map((a, i) => { const k = Math.max(0, Math.min(15, Math.round((a / lim + 1) / 2 * 15))); return `<rect x="${(i * W / n).toFixed(2)}" y="0" width="${(W / n + .6).toFixed(2)}" height="100" fill="${STRIPE[k]}" data-i="${i}"/>`; }).join('')}</svg>
    <span class="lab" style="left:10px">${years[0]}</span><span class="lab" style="right:10px">${years[n - 1]}</span><div id="stripTip">Toca una franja</div>`;
  const tip = $('#stripTip');
  const pick = e => { const r = box.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; const i = Math.max(0, Math.min(n - 1, Math.floor(x / r.width * n))); tip.textContent = `${years[i]} · ${num(T[i], 1)} °C · ${sgn(A[i])} °C`; };
  box.onpointermove = pick; box.onpointerdown = pick;
  // tiles
  const ly = n - 1;
  const tr75 = linreg(years.filter(y => y >= 1975), A.filter((_, i) => years[i] >= 1975));
  const tr40 = linreg(years, A);
  const warm = A.indexOf(Math.max(...A));
  const pMin = P.indexOf(Math.min(...P));
  const last10 = mean(A.slice(-10));
  const pr = c.proj && c.proj.length ? mean(c.proj.map(p => mean(p.ta.filter((_, i) => p.ys[i] >= 2041 && p.ys[i] <= 2050)))) : null;
  $('#climTiles').innerHTML = [
    [`Anomalía ${years[ly]}`, sgn(A[ly]) + ' °C', `media ${num(T[ly], 1)} °C · ref. ${num(tB, 1)} °C`],
    ['Última década', sgn(last10) + ' °C', 'media de los 10 últimos años'],
    ['Tendencia desde 1975', sgn(tr75 * 10, 2) + ' °C', 'por década'],
    ['Tendencia desde 1940', sgn(tr40 * 10, 2) + ' °C', 'por década'],
    ['Año más cálido', String(years[warm]), sgn(A[warm]) + ' °C'],
    ['Precipitación normal', num(pB) + ' mm', `1961–1990 · año más seco: ${years[pMin]} (${num(P[pMin])} mm)`],
    pr != null ? ['Proyección 2041–2050', sgn(pr) + ' °C', 'media de 7 modelos frente a 1961–1990'] : null
  ].filter(Boolean).map(([k, v, s]) => `<div><small>${k}</small><strong>${v}</strong><em>${s}</em></div>`).join('');
  const sc = {x: {ticks: {maxTicksLimit: narrow() ? 6 : 10, maxRotation: 0}, grid: {display: false}}};
  setChart('cAnom', {type: 'bar', data: {labels: years, datasets: [
    {type: 'line', label: 'Media 10 años', data: running(A, 10), borderColor: '#ffffff', borderWidth: 2.4, spanGaps: true},
    {label: 'Anomalía °C', data: A, backgroundColor: A.map(a => STRIPE[Math.max(0, Math.min(15, Math.round((a / lim + 1) / 2 * 15)))]), categoryPercentage: 1, barPercentage: .9}]},
    options: {plugins: {legend: {display: false}, tooltip: {callbacks: {label: x => ` ${x.dataset.label}: ${sgn(x.parsed.y, 2)}`}}}, scales: sc}});
  const PA = P.map(p => (p / pB - 1) * 100);
  setChart('cPrec', {type: 'bar', data: {labels: years, datasets: [
    {type: 'line', label: 'Media 10 años', data: running(PA, 10), borderColor: '#ffffff', borderWidth: 2.4, spanGaps: true},
    {label: 'Desviación %', data: PA, backgroundColor: PA.map(p => p >= 0 ? '#4fc1c6' : '#d98b3a'), categoryPercentage: 1, barPercentage: .9}]},
    options: {plugins: {legend: {display: false}, tooltip: {callbacks: {label: x => ` ${x.dataset.label}: ${sgn(x.parsed.y, 0)} % (${num(P[x.dataIndex])} mm)`}}}, scales: sc}});
  // climograma: orden de meses según últimos 12
  const order = c.last12.length === 12 ? c.last12.map(o => +o.k.slice(5, 7) - 1) : [...Array(12).keys()];
  setChart('cClimo', {type: 'bar', data: {labels: order.map((m, i) => MON[m] + (c.last12[i] ? " '" + c.last12[i].k.slice(2, 4) : '')), datasets: [
    {type: 'line', label: 'T normal °C', data: order.map(m => c.nT[m]), borderColor: '#e8452c', yAxisID: 'yt', pointRadius: 3, pointBackgroundColor: '#e8452c'},
    {type: 'line', label: 'T últimos 12 meses', data: c.last12.map(o => o.t), borderColor: '#f7e463', borderDash: [5, 4], yAxisID: 'yt', pointRadius: 3, pointBackgroundColor: '#f7e463'},
    {label: 'P normal mm', data: order.map(m => c.nP[m]), backgroundColor: 'rgba(79,193,198,.75)', yAxisID: 'yp'},
    {label: 'P últimos 12 meses', data: c.last12.map(o => o.p), backgroundColor: 'rgba(247,228,99,.55)', yAxisID: 'yp'}]},
    options: {interaction: {mode: 'index', intersect: false}, plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}},
      scales: {x: {grid: {display: false}, ticks: {maxRotation: 0, autoSkip: true}}, yp: {position: 'left', beginAtZero: true, title: {display: !narrow(), text: 'mm'}}, yt: {position: 'right', grid: {display: false}, title: {display: !narrow(), text: '°C'}}}}});
  if (c.proj && c.proj.length) {
    const labels = Array.from({length: 2050 - 1950 + 1}, (_, i) => 1950 + i);
    const cols = ['#ff9ad5', '#8ea2ff', '#4fc1c6', '#b7f08a', '#ffad5a', '#c9a7ff', '#7fe3ff'];
    const at = (p, y) => { const i = p.ys.indexOf(y); return i < 0 ? null : p.ta[i]; };
    const ens = labels.map(y => mean(c.proj.map(p => at(p, y))));
    setChart('cProj', {type: 'line', data: {labels, datasets: [
      ...c.proj.map((p, k) => ({label: p.l, data: labels.map(y => at(p, y)), borderColor: cols[k] + '88', borderWidth: 1})),
      {label: 'Media de modelos (10 años)', data: running(ens, 10), borderColor: '#e8452c', borderWidth: 3, spanGaps: true},
      {label: 'Observado ERA5', data: labels.map(y => { const i = years.indexOf(y); return i < 0 ? null : A[i]; }), borderColor: '#ffffff', borderWidth: 2.2}]},
      options: {interaction: {mode: 'index', intersect: false}, plugins: {legend: {position: 'bottom', labels: {font: {size: 10}}}, tooltip: {callbacks: {label: x => ` ${x.dataset.label}: ${sgn(x.parsed.y, 2)} °C`}}},
        scales: {x: {ticks: {maxTicksLimit: 6, maxRotation: 0}, grid: {display: false}}, y: {title: {display: true, text: 'Anomalía °C'}}}}});
  } else {
    const ctx = document.getElementById('cProj').parentNode; ctx.innerHTML = '<div class="state">Proyecciones no disponibles ahora mismo.</div><canvas id="cProj" hidden></canvas>';
  }
}

/* =========================================================
   VISORES
   ========================================================= */
function renderLinks() {
  const {lat, lon} = S.loc, la = lat.toFixed(3), lo = lon.toFixed(3);
  const G = [
    ['Predicción y modelos', [
      ['Windy', 'ECMWF, GFS, ICON, AROME: 50+ capas animadas', `https://www.windy.com/?${la},${lo},8`],
      ['WXCharts', 'ECMWF, GFS, UKMO, ICON-EU, ARPEGE, AROME: mapas, meteogramas y ensembles', `https://wxcharts.com/?dataset=ecmwf_op&region=spain&element=overview&lat=${la}&lon=${lo}`],
      ['Ventusky', 'Mapas de modelos muy visuales y rápidos', `https://www.ventusky.com/?p=${la};${lo};7&l=temperature-2m`],
      ['Meteoblue multimodelo', 'Comparativa de modelos y meteogramas', 'https://www.meteoblue.com/es/tiempo/pronostico/multimodel'],
      ['ECMWF Charts', 'Productos oficiales del Centro Europeo (ENS, EFI, AIFS)', 'https://charts.ecmwf.int'],
      ['AEMET · modelos numéricos', 'HARMONIE-AROME y ECMWF para la Península', 'https://www.aemet.es/es/eltiempo/prediccion/modelosnumericos/harmonie_arome'],
      ['Meteociel', 'Mapas de casi todos los modelos, sondeos y conjuntos', 'https://www.meteociel.fr/modeles/'],
      ['Tropical Tidbits', 'Modelos globales, sondeos y ciclones', 'https://www.tropicaltidbits.com/analysis/models/'],
      ['Open-Meteo · comparar', 'Las mismas fuentes que usa esta app', `https://open-meteo.com/en/weather/compare`]
    ]],
    ['Observación, radar y satélite', [
      ['AEMET radar', 'Red de radares nacional', 'https://www.aemet.es/es/eltiempo/observacion/radar'],
      ['Zoom Earth', 'Satélite casi en tiempo real y ciclones', `https://zoom.earth/maps/satellite/#view=${la},${lo},7z`],
      ['EUMETView', 'Imágenes Meteosat de EUMETSAT', 'https://view.eumetsat.int'],
      ['earth.nullschool', 'Viento, corrientes y aerosoles globales', `https://earth.nullschool.net/#current/wind/surface/level/orthographic=${lo},${la},1500`],
      ['Blitzortung', 'Rayos en tiempo real', `https://map.blitzortung.org/#7/${la}/${lo}`],
      ['Copernicus CAMS', 'Polvo, aerosoles y calidad del aire', 'https://atmosphere.copernicus.eu/charts/packages/cams/']
    ]],
    ['Clima y cambio climático', [
      ['AdapteCCa · escenarios', 'Proyecciones regionalizadas para España (SSP)', 'https://escenarios.adaptecca.es'],
      ['Atlas Climático de Copernicus', 'CMIP6, CORDEX, ERA5 e índices', 'https://atlas.climate.copernicus.eu'],
      ['Copernicus Climate Pulse', 'Temperatura global diaria casi en tiempo real', 'https://pulse.climate.copernicus.eu'],
      ['Climate Reanalyzer', 'Reanálisis diarios y anomalías globales', 'https://climatereanalyzer.org'],
      ['KNMI Climate Explorer', 'Series, correlaciones y análisis estadístico', 'https://climexp.knmi.nl'],
      ['AEMET · vigilancia del clima', 'Balances y resúmenes climatológicos', 'https://www.aemet.es/es/serviciosclimaticos/vigilancia_clima'],
      ['Show Your Stripes', 'Franjas de calentamiento por región', 'https://showyourstripes.info']
    ]]
  ];
  $('#links').innerHTML = G.map(([g, L]) => `<div class="grp">${g}</div><div class="links">${L.map(([t, d, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener"><strong>${t}</strong><span>${d}</span></a>`).join('')}</div>`).join('');
}

/* =========================================================
   UBICACIÓN
   ========================================================= */
function setLoc(l) {
  S.loc = l; store.set('atm.loc', l);
  $('#locName').textContent = l.name;
  S.loaded = {};
  closeSheet();
  route(true);
}
function openSheet() { $('#sheet').classList.add('on'); renderFavs(); setTimeout(() => $('#q').focus(), 50); }
function closeSheet() { $('#sheet').classList.remove('on'); }
function renderFavs() {
  $('#favList').innerHTML = S.favs.length ? S.favs.map((f, i) => `<li><button class="go" data-fav="${i}">${esc(f.name)} <small>${esc(f.admin || '')}</small></button><button class="icon-btn" data-del="${i}" aria-label="Quitar ${esc(f.name)}">✕</button></li>`).join('') : '<li class="note" style="padding:10px 0">Aún no has guardado ningún lugar.</li>';
}
let searchT, lastRes = [];
async function search(q) {
  if (q.trim().length < 2) { $('#results').innerHTML = ''; return; }
  try {
    const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=es&format=json`);
    lastRes = j.results || [];
    $('#results').innerHTML = lastRes.length ? lastRes.map((r, i) => `<li><button class="go" data-r="${i}">${esc(r.name)} <small>${esc([r.admin2, r.admin1, r.country].filter(Boolean).join(', '))}${r.elevation != null ? ' · ' + num(r.elevation) + ' m' : ''}</small></button></li>`).join('') : '<li class="note" style="padding:10px 0">Sin resultados.</li>';
  } catch (e) { $('#results').innerHTML = `<li class="err">${esc(e.message)}</li>`; }
}

/* =========================================================
   RUTAS
   ========================================================= */
const VIEWS = ['ahora', 'modelos', 'mapas', 'clima', 'visores'];
function route(force) {
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'ahora';
  VIEWS.forEach(x => $('#v-' + x).classList.toggle('on', x === v));
  document.querySelectorAll('nav.tabs a').forEach(a => a.toggleAttribute('aria-current', false) || (a.getAttribute('href') === '#' + v && a.setAttribute('aria-current', 'page')));
  if (!force && S.cur === v && S.loaded[v]) return;
  S.cur = v;
  if (S.loaded[v]) { if (v === 'mapas' && map) setTimeout(() => map.invalidateSize(), 50); return; }
  S.loaded[v] = true;
  if (v === 'ahora') loadNow();
  if (v === 'modelos') { loadModels(); loadEnsemble(); }
  if (v === 'mapas') { setTimeout(initMap, 30); renderWindy(); renderWx(); }
  if (v === 'clima') loadClimate();
  if (v === 'visores') renderLinks();
}

/* ---------- eventos ---------- */
$('#locName').textContent = S.loc.name;
$('#locBtn').onclick = openSheet;
$('#sheetClose').onclick = closeSheet;
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
$('#q').addEventListener('input', e => { clearTimeout(searchT); searchT = setTimeout(() => search(e.target.value), 300); });
$('#searchForm').addEventListener('submit', e => { e.preventDefault(); search($('#q').value); });
$('#results').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; const r = lastRes[+b.dataset.r]; setLoc({name: r.name, admin: [r.admin2, r.admin1].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude}); });
$('#favList').addEventListener('click', e => {
  const d = e.target.closest('[data-del]'); if (d) { S.favs.splice(+d.dataset.del, 1); store.set('atm.favs', S.favs); renderFavs(); return; }
  const f = e.target.closest('[data-fav]'); if (f) setLoc(S.favs[+f.dataset.fav]);
});
$('#favBtn').onclick = () => { if (!S.favs.some(f => f.lat === S.loc.lat && f.lon === S.loc.lon)) { S.favs.push(S.loc); store.set('atm.favs', S.favs); } renderFavs(); };
$('#geoBtn').onclick = () => {
  if (!navigator.geolocation) { $('#results').innerHTML = '<li class="err">Tu navegador no permite la geolocalización.</li>'; return; }
  $('#geoBtn').textContent = 'Localizando…';
  navigator.geolocation.getCurrentPosition(p => { $('#geoBtn').textContent = 'Usar mi ubicación'; setLoc({name: 'Mi ubicación', admin: '', lat: p.coords.latitude, lon: p.coords.longitude}); },
    err => { $('#geoBtn').textContent = 'Usar mi ubicación'; $('#results').innerHTML = `<li class="err">No se pudo obtener la ubicación (${esc(err.message)}). Revisa Ajustes › Privacidad › Localización › Safari.</li>`; }, {enableHighAccuracy: true, timeout: 12000});
};
$('#varChips').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; S.mVar = b.dataset.v; store.set('atm.mVar', S.mVar); loadModels(); });
$('#modelChips').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; const id = b.dataset.m; S.mModels = S.mModels.includes(id) ? S.mModels.filter(x => x !== id) : [...S.mModels, id]; store.set('atm.mModels', S.mModels); loadModels(); });
$('#daysSeg').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; S.mDays = +b.dataset.d; store.set('atm.mDays', S.mDays); loadModels(); });
$('#ensModel').addEventListener('change', e => { S.eModel = e.target.value; store.set('atm.eModel', S.eModel); loadEnsemble(); });
$('#ensVar').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; S.eVar = b.dataset.v; store.set('atm.eVar', S.eVar); loadEnsemble(); });
$('#layerChips').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b) return; S.layer = b.dataset.l; applyLayer(); });
$('#rvPlay').onclick = () => {
  if (rvTimer) return stopRadar();
  $('#rvPlay').textContent = '❚❚';
  rvTimer = setInterval(() => { rvIdx = (rvIdx + 1) % rvFrames.length; showFrame(rvIdx); }, 650);
};
$('#wOverlay').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; S.wOv = b.dataset.w; renderWindy(); });
$('#wProd').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; S.wProd = b.dataset.p; renderWindy(); });
addEventListener('hashchange', () => route(false));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.cur === 'ahora') loadNow(); });
route(true);

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
