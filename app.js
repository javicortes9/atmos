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
  if (!box.querySelector('.t')) box.innerHTML = '<div class="state">Cargando el tiempo actual…</div>';
  const u = `https://api.open-meteo.com/v1/forecast?${LL()}&timezone=auto&forecast_days=16&past_hours=24` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,weather_code,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,uv_index,shortwave_radiation,freezing_level_height,cape' +
    '&minutely_15=precipitation,precipitation_probability&forecast_minutely_15=24' +
    '&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day,pressure_msl,cloud_cover,uv_index,shortwave_radiation,visibility,soil_moisture_3_to_9cm,soil_temperature_6cm,et0_fao_evapotranspiration,vapour_pressure_deficit' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset,uv_index_max,daylight_duration';
  try {
    const j = await getJSON(u);
    store.set('atm.cacheNow', {k: LL(), j});
    renderNow(j);
  } catch (e) {
    const c = store.get('atm.cacheNow');
    if (c && c.k === LL()) { renderNow(c.j); box.insertAdjacentHTML('beforeend', '<p class="note err">Sin conexión: mostrando la última predicción guardada.</p>'); }
    else box.innerHTML = `<div class="state err">No se pudo cargar la predicción: ${esc(e.message)}</div>`;
  }
  initNowRadar();
  loadAQ();
}
const DIR = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const dirTxt = d => d == null ? '' : DIR[Math.round(d / 45) % 8];
const hhmm = t => t.slice(11, 16);
function nowcast(j) {
  const m = j.minutely_15, c = j.current;
  if (!m || !m.precipitation || m.precipitation.every(v => v == null)) return null;
  let k0 = m.time.findIndex(t => t >= c.time); if (k0 < 0) k0 = 0;
  const T = m.time.slice(k0), P = m.precipitation.slice(k0).map(v => v || 0), PP = m.precipitation_probability ? m.precipitation_probability.slice(k0) : [];
  const total = P.reduce((x, y) => x + y, 0), maxPP = Math.max(0, ...PP.filter(v => v != null));
  const wetNow = (c.precipitation || 0) > 0 || P[0] >= 0.05;
  if (wetNow) {
    const stop = P.findIndex(v => v < 0.05);
    return {wet: true, t: stop < 0 ? 'Está lloviendo y seguirá en las próximas 6 horas' : `Está lloviendo; debería parar hacia las ${hhmm(T[stop])}`, s: `${num(total, 1)} mm previstos en 6 h`};
  }
  const start = P.findIndex(v => v >= 0.05);
  if (start < 0) return {wet: false, t: 'Sin lluvia en las próximas 6 horas', s: maxPP >= 30 ? `Aun así, hasta un ${maxPP} % de probabilidad de algún chubasco` : 'Probabilidad de lluvia muy baja'};
  let end = P.findIndex((v, i) => i > start && v < 0.05); const sum = P.slice(start, end < 0 ? undefined : end).reduce((x, y) => x + y, 0);
  return {wet: true, t: `Lluvia a partir de las ${hhmm(T[start])}`, s: `${num(sum, 1)} mm${end > 0 ? ' hasta las ' + hhmm(T[end]) : ' en el resto del periodo'} · probabilidad máx. ${maxPP} %`};
}
function renderNow(j) {
  const c = j.current, d = j.daily, h = j.hourly;
  const hr = +c.time.slice(11, 13);
  const sal = hr >= 6 && hr < 14 ? 'Buenos días' : hr >= 14 && hr < 21 ? 'Buenas tardes' : 'Buenas noches';
  const who = store.get('atm.user', '');
  $('#hello').innerHTML = `${sal}${who ? ', ' + esc(who) : ''}<small>Así está el tiempo en ${esc(S.loc.name)} ahora mismo${who ? '' : ' · toca aquí para decirnos tu nombre'}</small>`;
  S.lastNow = j;
  const cur = c.time.slice(0, 13);
  let i0 = h.time.findIndex(t => t.slice(0, 13) >= cur); if (i0 < 0) i0 = 0;
  const nc = nowcast(j);
  const ty = i0 >= 24 ? h.temperature_2m[i0 - 24] : null;
  const dT = ty == null ? null : c.temperature_2m - ty;
  const yd = dT == null ? '' : `<span class="yday">${Math.abs(dT) < 0.5 ? 'Igual que ayer a esta hora' : `${num(Math.abs(dT))}° ${dT > 0 ? 'más' : 'menos'} que ayer a esta hora`}</span>`;
  const today = c.time.slice(0, 10);
  const todaySum = 'Hoy: ' + daySummary(h, h.time.map((t, i) => t.startsWith(today) ? i : -1).filter(i => i >= 0)).t;
  $('#nowBox').style.background = `linear-gradient(150deg, ${tCol(c.temperature_2m)} -30%, var(--bg2) 70%)`;
  $('#nowBox').innerHTML = `${wx(c.weather_code, c.is_day)}
    <div class="m" style="margin:0 0 4px">Ahora · ${hhmm(c.time)} h</div>
    <div class="t">${num(c.temperature_2m)}°</div>
    <div class="d">${esc(WMO[c.weather_code] || '')}</div>
    <div class="m">Sensación ${num(c.apparent_temperature)}° · Máx ${num(d.temperature_2m_max[0])}° · Mín ${num(d.temperature_2m_min[0])}°</div>
    ${nc ? `<div class="cast${nc.wet ? ' wet' : ''}">${esc(nc.t)}<small>${esc(nc.s)}</small></div>` : ''}
    ${yd}
    <div class="m" style="margin-top:10px;color:var(--ink)">${esc(todaySum)}</div>
    <div class="m" style="margin-top:10px">${esc(S.loc.name)}${S.loc.admin ? ', ' + esc(S.loc.admin) : ''} · ${j.elevation != null ? num(j.elevation) + ' m' : ''}</div>
    <div class="more-btn">${$('#nowKv').hidden ? 'Ver todos los datos del momento' : 'Ocultar datos'} <span>▾</span></div>`;
  $('#nowBox').setAttribute('aria-expanded', String(!$('#nowKv').hidden));
  const p3 = i0 >= 3 ? h.pressure_msl[i0] - h.pressure_msl[i0 - 3] : null;
  const trend = p3 == null ? '' : p3 > 0.8 ? 'subiendo' : p3 < -0.8 ? 'bajando' : 'estable';
  const dl = d.daylight_duration?.[0];
  const vis = c.visibility;
  $('#nowKv').innerHTML = [
    ['Viento', `${arrow(c.wind_direction_10m)} ${num(c.wind_speed_10m)} km/h`, `del ${dirTxt(c.wind_direction_10m)} (${num(c.wind_direction_10m)}°)`],
    ['Rachas', num(c.wind_gusts_10m) + ' km/h', ''],
    ['Humedad', num(c.relative_humidity_2m) + ' %', `rocío ${num(c.dew_point_2m, 1)}°`],
    ['Presión', num(c.pressure_msl) + ' hPa', p3 == null ? '' : `${trend} (${sgn(p3, 1)} en 3 h)`],
    ['Nubes', num(c.cloud_cover) + ' %', `baja ${num(c.cloud_cover_low)} · media ${num(c.cloud_cover_mid)} · alta ${num(c.cloud_cover_high)}`],
    ['Precip. ahora', num(c.precipitation, 1) + ' mm', `hoy ${num(d.precipitation_sum[0], 1)} mm`],
    ['Radiación', num(c.shortwave_radiation) + ' W/m²', `UV ${num(c.uv_index, 1)} · máx. hoy ${num(d.uv_index_max[0], 1)}`],
    ['Visibilidad', vis == null ? '–' : vis >= 10000 ? '> 10 km' : num(vis / 1000, 1) + ' km', ''],
    ['Isocero', num(c.freezing_level_height) + ' m', c.cape > 50 ? `CAPE ${num(c.cape)} J/kg` : 'atmósfera estable'],
    ['Sol', `${d.sunrise[0]?.slice(11, 16) || '–'} – ${d.sunset[0]?.slice(11, 16) || '–'}`, dl ? `${Math.floor(dl / 3600)} h ${Math.round(dl % 3600 / 60)} min de luz` : ''],
    ['Lluvia 24 h', num(h.precipitation.slice(i0, i0 + 24).reduce((x, y) => x + (y || 0), 0), 1) + ' mm', `prob. máx. ${Math.max(0, ...h.precipitation_probability.slice(i0, i0 + 24).filter(v => v != null))} %`],
    ['Temp. en 3 h', num(h.temperature_2m[i0 + 3]) + '°', `a las ${h.time[i0 + 3]?.slice(11, 13)} h`]
  ].map(([k, v, s]) => `<div><small>${k}</small><strong>${v}</strong>${s ? `<em>${s}</em>` : ''}</div>`).join('');
  // lluvia 15 min
  const m = j.minutely_15;
  if (m && m.precipitation && m.precipitation.some(v => v != null)) {
    let k0 = m.time.findIndex(t => t >= c.time); if (k0 < 0) k0 = 0;
    const T = m.time.slice(k0), P = m.precipitation.slice(k0), PP = m.precipitation_probability ? m.precipitation_probability.slice(k0) : [];
    setChart('nowRain', {type: 'bar', data: {labels: T.map(hhmm), datasets: [
      {type: 'line', label: 'Probabilidad %', data: PP, borderColor: '#f7e463', yAxisID: 'y1', borderWidth: 2},
      {label: 'Lluvia mm/15 min', data: P, backgroundColor: '#4fc1c6', borderRadius: 3, yAxisID: 'y'}]},
      options: {interaction: {mode: 'index', intersect: false}, plugins: {legend: {display: false}},
        scales: {x: {grid: {display: false}, ticks: {maxTicksLimit: 7, maxRotation: 0}}, y: {beginAtZero: true, suggestedMax: 1, title: {display: true, text: 'mm'}}, y1: {position: 'right', min: 0, max: 100, grid: {display: false}, ticks: {callback: v => v + ' %'}}}}});
    const s = (n) => P.slice(0, n).reduce((x, y) => x + (y || 0), 0);
    $('#rainSum').innerHTML = [['Próxima hora', s(4)], ['Próximas 3 h', s(12)], ['Próximas 6 h', s(24)]].map(([k, v]) => `<div><small>${k}</small><strong>${num(v, 1)} mm</strong></div>`).join('');
  } else { $('#rainSum').innerHTML = '<div class="note" style="grid-column:1/-1">Sin datos de 15 minutos para este punto.</div>'; }
  // tira 48 h
  const idx = Array.from({length: 48}, (_, k) => i0 + k).filter(i => i < h.time.length);
  $('#hours').innerHTML = idx.map(i => {
    const t = h.temperature_2m[i], p = h.precipitation[i], pp = h.precipitation_probability[i];
    const dark = t > 8 && t < 31;
    return `<div class="hr" style="background:${tCol(t)};color:${dark ? '#0b1433' : '#fff'}">
      <div class="h">${i === i0 ? 'Ahora' : h.time[i].slice(11, 13) + 'h'}</div>${wx(h.weather_code[i], h.is_day[i])}
      <div class="v">${num(t)}°</div><div class="p">${p >= 0.1 ? num(p, 1) + ' mm' : (pp ? pp + ' %' : '')}</div>
      <div class="w">${arrow(h.wind_direction_10m[i])}${num(h.wind_speed_10m[i])}</div></div>`;
  }).join('');
  setChart('h48', {type: 'bar', data: {labels: idx.map(i => lblH(h.time[i])), datasets: [
    {type: 'line', label: 'Temperatura °C', data: idx.map(i => h.temperature_2m[i]), borderColor: '#f59a3a', yAxisID: 'yt', borderWidth: 2.4,
      segment: {borderColor: ctx => tCol(ctx.p1.parsed.y)}},
    {type: 'line', label: 'Prob. lluvia %', data: idx.map(i => h.precipitation_probability[i]), borderColor: 'rgba(247,228,99,.7)', borderDash: [4, 4], borderWidth: 1.5, yAxisID: 'yp'},
    {label: 'Lluvia mm', data: idx.map(i => h.precipitation[i]), backgroundColor: '#4fc1c6', borderRadius: 2, yAxisID: 'yr'}]},
    options: {interaction: {mode: 'index', intersect: false}, plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}},
      scales: {x: {ticks: xTicks(), grid: {display: false}}, yt: {position: 'left', title: {display: !narrow(), text: '°C'}}, yr: {position: 'right', beginAtZero: true, suggestedMax: 2, grid: {display: false}, title: {display: !narrow(), text: 'mm'}}, yp: {display: false, min: 0, max: 100}}}});
  S.days16 = d.time;
  renderAlert(j);
  renderActs(j);
  // 16 días
  const lo = Math.min(...d.temperature_2m_min.filter(v => v != null)), hi = Math.max(...d.temperature_2m_max.filter(v => v != null));
  const span = Math.max(1, hi - lo);
  $('#days').innerHTML = d.time.map((t, i) => {
    const mn = d.temperature_2m_min[i], mx = d.temperature_2m_max[i];
    if (mn == null) return '';
    const a = (mn - lo) / span * 100, b = (mx - lo) / span * 100;
    const p = pd(t);
    return `<div class="day" data-day="${t}" role="button" tabindex="0" aria-label="Detalle del ${DOW[p.w]} ${p.d}"><div class="n">${i === 0 ? 'Hoy' : DOW[p.w]}<small>${p.d} ${MON[p.m - 1]}</small></div>${wx(d.weather_code[i], 1)}
      <div class="rng"><span>${num(mn)}°</span><div class="bar"><i style="left:${a}%;width:${Math.max(3, b - a)}%;background:linear-gradient(90deg,${tCol(mn)},${tCol(mx)})"></i></div><span>${num(mx)}°</span></div>
      <div class="pp">${d.precipitation_probability_max[i] != null ? d.precipitation_probability_max[i] + ' %' : ''}${d.precipitation_sum[i] >= 0.5 ? '<br>' + num(d.precipitation_sum[i], 1) + ' mm' : ''}</div><span class="go">›</span></div>`;
  }).join('');
}
/* ---------- alerta «sal ya o te mojas» ---------- */
const locEpoch = (t, off) => { const [d, hm] = t.split('T'); const [y, m, dd] = d.split('-').map(Number); const [H, M] = hm.split(':').map(Number); return Date.UTC(y, m - 1, dd, H, M) - off * 1000; };
function renderAlert(j) {
  const box = $('#rainAlert'), m = j.minutely_15;
  if (!m || !m.precipitation) { box.innerHTML = ''; return; }
  const off = j.utc_offset_seconds || 0, now = Date.now();
  const slots = m.time.map((t, i) => ({ts: t, t0: locEpoch(t, off) - 15 * 60e3, t1: locEpoch(t, off), p: m.precipitation[i] || 0})).filter(s => s.t1 > now);
  // minutely_15: cada valor es la suma de los 15 min ANTERIORES a su hora
  if (!slots.length) { box.innerHTML = ''; return; }
  const wet = s => s.p >= 0.1;
  const drops = Array.from({length: 14}, (_, i) => `<i style="left:${5 + i * 7}%;animation-delay:${(i * 0.37) % 1.1}s"></i>`).join('');
  if (wet(slots[0]) || (j.current.precipitation || 0) > 0) {
    const stop = slots.findIndex(s => !wet(s));
    const mins = stop < 0 ? null : Math.max(0, Math.round((slots[stop].t0 - now) / 60e3));
    const tot = slots.slice(0, stop < 0 ? 8 : stop).reduce((x, s) => x + s.p, 0);
    box.innerHTML = `<div class="ralert now" role="status">${drops}<div class="cd">${mins == null ? '<b>+2 h</b><small>seguirá</small>' : `<b>${mins}</b><small>min</small>`}</div><div><h3>Está lloviendo</h3><p>${mins == null ? 'Seguirá lloviendo al menos 2 horas' : `Debería parar en unos ${mins} minutos`} · ${num(tot, 1)} mm más</p></div></div>`;
    return;
  }
  const start = slots.findIndex(wet);
  if (start < 0) { box.innerHTML = ''; return; }
  const mins = Math.max(0, Math.round((slots[start].t0 - now) / 60e3));
  if (mins > 90) { box.innerHTML = ''; return; }
  let end = slots.findIndex((s, i) => i > start && !wet(s));
  const tot = slots.slice(start, end < 0 ? undefined : end).reduce((x, s) => x + s.p, 0);
  const urg = mins <= 30;
  box.innerHTML = `<div class="ralert" role="alert">${drops}<div class="cd"><b>${mins}</b><small>min</small></div><div><h3>${urg ? '¡Sal ya o te mojas!' : 'Lluvia en camino'}</h3><p>Empieza a llover en unos ${mins} minutos · ${num(tot, 1)} mm${end > 0 ? `, hasta las ${hhmm(slots[end - 1].ts)}` : ''}</p></div></div>`;
}
setInterval(() => { if (S.lastNow && S.cur === 'ahora') renderAlert(S.lastNow); }, 30e3);

/* ---------- ¿es buen momento para…? ---------- */
const tri = (v, lo, hi, soft) => v == null ? 0.5 : v >= lo && v <= hi ? 1 : Math.max(0, 1 - (v < lo ? lo - v : v - hi) / soft);
const wlab = ws => ws < 8 ? 'sin apenas viento' : ws < 20 ? `viento flojo (${num(ws)} km/h)` : ws < 35 ? `viento moderado (${num(ws)} km/h)` : `viento fuerte (${num(ws)} km/h)`;
const rlab = x => x.p >= 0.2 ? 'lloviendo' : x.pn6 >= 1 ? `lluvia prevista (${num(x.pn6, 1)} mm en 6 h)` : 'sin lluvia';
const CATS = [
  {k: 'dep', l: 'Deporte', a: [
    {l: 'Correr', dur: 1, hrs: [6, 23], f: x => tri(x.at, 6, 17, 10) * x.dry * (0.55 + 0.45 * tri(x.ws, 0, 20, 20)) * (0.7 + 0.3 * tri(x.uv, 0, 6, 4)) * (0.6 + 0.4 * tri(x.aq, 0, 40, 40)) * (0.8 + 0.2 * tri(x.rh, 30, 75, 25)), why: x => `${num(x.at)}° de sensación, ${wlab(x.ws)}${x.aq != null ? (x.aq <= 40 ? ', aire limpio' : ', aire regular') : ''}`},
    {l: 'Caminar', dur: 2, hrs: [7, 23], f: x => tri(x.at, 9, 24, 10) * x.dry * (0.6 + 0.4 * tri(x.ws, 0, 25, 20)) * (0.75 + 0.25 * tri(x.uv, 0, 6, 4)), why: x => `${num(x.at)}° de sensación, ${rlab(x)}`},
    {l: 'Bicicleta', dur: 2, hrs: [7, 21], f: x => tri(x.at, 11, 25, 10) * x.dry * tri(Math.max(x.ws, x.gu * 0.7), 0, 15, 20) * (x.pp6 > 1 ? 0.6 : 1), why: x => `${num(x.at)}°, ${wlab(x.ws)}${x.pp6 > 1 ? ', firme mojado' : ''}`},
    {l: 'Senderismo y montaña', dur: 4, hrs: [7, 19], f: x => !x.day ? 0 : tri(x.at, 8, 22, 10) * (x.pn6 >= 1 ? 0.2 : x.dry) * tri(x.gu, 0, 40, 30) * (0.7 + 0.3 * tri(x.vis, 20000, 1e9, 15000)) * (0.75 + 0.25 * tri(x.uv, 0, 6, 4)), why: x => `${num(x.at)}°, rachas de ${num(x.gu)} km/h, visibilidad ${x.vis == null ? '–' : x.vis >= 20000 ? 'buena' : num(x.vis / 1000) + ' km'}`},
    {l: 'Pádel y tenis', dur: 2, hrs: [8, 23], f: x => tri(x.at, 12, 27, 9) * x.dry * tri(x.gu, 0, 20, 15) * (x.pp6 > 0.3 ? 0.3 : 1), why: x => `${num(x.at)}°, rachas de ${num(x.gu)} km/h${x.pp6 > 0.3 ? ', pista probablemente mojada' : ''}`},
    {l: 'Golf', dur: 4, hrs: [8, 19], f: x => !x.day ? 0 : tri(x.at, 12, 26, 9) * x.dry * tri(x.ws, 0, 18, 15), why: x => `${num(x.at)}°, ${wlab(x.ws)}`},
    {l: 'Pesca', dur: 2, hrs: [0, 24], f: x => (0.3 * x.fsol + 0.35 * x.flight + 0.35 * x.fpres) * tri(x.ws, 0, 22, 18) * (x.storm ? 0 : x.p > 2 ? 0.5 : 1), why: x => `${x.fsolWhy}; ${x.fpresWhy}. Para el mar, mira la pestaña Mar`},
    {l: 'Nadar al aire libre', dur: 2, hrs: [10, 20], f: x => !x.day ? 0 : tri(x.t, 26, 34, 6) * x.dry * tri(x.ws, 0, 20, 15) * (1 - (x.cc || 0) / 200) * (0.6 + 0.4 * tri(x.uv, 0, 8, 4)), why: x => `${num(x.t)}°, ${x.cc < 30 ? 'sol' : 'nubes'}, UV ${num(x.uv)}`}
  ]},
  {k: 'campo', l: 'Agricultura', a: [
    {l: 'Siembra', dur: 3, hrs: [8, 19], f: x => !x.day ? 0 : tri(x.sm, 0.15, 0.32, 0.1) * tri(x.st, 10, 28, 6) * (x.pn24 >= 15 ? 0.3 : 1) * (x.p >= 0.2 ? 0.1 : 1), why: x => `tempero ${x.sm == null ? '–' : x.sm < 0.15 ? 'seco' : x.sm > 0.32 ? 'encharcado' : 'adecuado'} (${num(x.sm, 2)} m³/m³), suelo a ${num(x.st)}°`},
    {l: 'Recolección y cosecha', dur: 4, hrs: [7, 21], f: x => !x.day ? 0 : (x.pp6 >= 0.5 || x.p >= 0.1 ? 0 : 1) * tri(x.rh, 0, 65, 25) * tri(x.at, 8, 30, 8) * (x.pn6 >= 0.5 ? 0.4 : 1), why: x => `humedad del ${num(x.rh)} %, ${x.pp6 >= 0.5 ? 'llovió hace poco' : 'cultivo seco'}, ${rlab(x)}`},
    {l: 'Tratamientos fitosanitarios', dur: 2, hrs: [6, 22], f: x => tri(x.ws, 3, 10, 6) * tri(x.gu, 0, 20, 10) * (x.pn6 >= 0.3 ? 0.1 : 1) * tri(x.t, 8, 25, 6) * tri(x.rh, 50, 90, 25), why: x => `${wlab(x.ws)}, ${num(x.t)}°, humedad del ${num(x.rh)} %, ${x.pn6 >= 0.3 ? 'lluvia que lavaría el producto' : 'sin lluvia en 6 h'}`},
    {l: 'Riego', dur: 2, hrs: [5, 24], f: x => (x.pn24 >= 5 ? 0.1 : 1) * tri(x.sm, 0, 0.22, 0.12) * (0.4 + 0.6 * tri(x.rad, 0, 50, 300)) * tri(x.ws, 0, 12, 15), why: x => `suelo ${x.sm == null ? '–' : x.sm < 0.18 ? 'seco' : 'con humedad'}, ${x.pn24 >= 5 ? 'lloverá pronto' : 'sin lluvia útil en 24 h'}, ET₀ ${num(x.et0d, 1)} mm/día`},
    {l: 'Laboreo y arado', dur: 4, hrs: [8, 19], f: x => !x.day ? 0 : tri(x.sm, 0.14, 0.28, 0.08) * (x.p >= 0.1 ? 0 : 1) * (x.pp6 >= 2 ? 0.3 : 1), why: x => `tempero ${x.sm == null ? '–' : x.sm < 0.14 ? 'demasiado seco' : x.sm > 0.28 ? 'demasiado húmedo' : 'bueno'}`},
    {l: 'Abonado', dur: 2, hrs: [8, 19], f: x => !x.day ? 0 : (x.pn24 >= 20 ? 0.2 : x.pn24 >= 2 ? 1 : 0.7) * tri(x.ws, 0, 15, 15) * (x.p >= 0.2 ? 0.2 : 1), why: x => x.pn24 >= 20 ? 'riesgo de lavado por lluvia fuerte' : x.pn24 >= 2 ? `lluvia ligera prevista (${num(x.pn24, 1)} mm) que ayuda a incorporarlo` : 'sin lluvia que lo incorpore'}
  ]},
  {k: 'casa', l: 'Tareas de casa', a: [
    {l: 'Tender la ropa', dur: 3, hrs: [8, 19], f: x => x.p >= 0.1 || x.pp >= 35 || !x.day ? 0 : (0.35 + 0.65 * Math.min(1, x.rad / 550)) * (0.45 + 0.55 * tri(x.rh, 0, 60, 35)) * (0.7 + 0.3 * tri(x.ws, 6, 25, 15)), why: x => `${x.rad > 350 ? 'sol' : 'algo de sol'}, humedad del ${num(x.rh)} %${x.ws >= 8 ? ' y brisa' : ''}`},
    {l: 'Lavar el coche', dur: 2, hrs: [9, 20], f: x => !x.day ? 0 : (x.pn24 >= 0.5 ? 0.1 : 1) * tri(x.t, 8, 26, 8) * tri(x.rad, 0, 600, 300), why: x => x.pn24 >= 0.5 ? `lloverá en las próximas 24 h (${num(x.pn24, 1)} mm)` : `seco 24 h, ${num(x.t)}°`},
    {l: 'Ventilar la casa', dur: 1, hrs: [7, 23], f: x => tri(x.t, 14, 25, 8) * x.dry * tri(x.aq, 0, 40, 40) * tri(x.rh, 20, 75, 20), why: x => `${num(x.t)}° fuera${x.aq != null ? `, aire ${x.aq <= 40 ? 'limpio' : 'regular'}` : ''}`},
    {l: 'Regar el jardín', dur: 1, hrs: [6, 24], f: x => (x.pn24 >= 3 ? 0.1 : 1) * (0.3 + 0.7 * tri(x.rad, 0, 30, 250)) * tri(x.ws, 0, 12, 12) * (0.5 + 0.5 * Math.min(1, x.et0d / 4)), why: x => `${x.rad < 50 ? 'sin sol directo' : 'con sol'}, ET₀ ${num(x.et0d, 1)} mm/día${x.pn24 >= 3 ? ', lloverá pronto' : ''}`},
    {l: 'Pintar o trabajos exteriores', dur: 3, hrs: [9, 19], f: x => !x.day ? 0 : tri(x.t, 10, 27, 7) * tri(x.rh, 0, 70, 20) * (x.pn6 >= 0.2 ? 0 : 1) * tri(x.ws, 0, 20, 15) * (x.t - x.td >= 3 ? 1 : 0.3), why: x => `${num(x.t)}°, humedad del ${num(x.rh)} %, ${rlab(x)}`}
  ]},
  {k: 'ocio', l: 'Salir y ocio', a: [
    {l: 'Terraza y bares', dur: 2, hrs: [12, 24], f: x => tri(x.at, 17, 27, 8) * x.dry * tri(x.ws, 0, 15, 15) * (1 - (x.cc || 0) / 300), why: x => `${num(x.at)}° de sensación, ${x.cc < 30 ? 'cielo despejado' : x.cc < 70 ? 'nubes y claros' : 'nublado'}`},
    {l: 'Dar un paseo', dur: 1, hrs: [8, 24], f: x => tri(x.at, 12, 25, 10) * x.dry * tri(x.ws, 0, 22, 18), why: x => `${num(x.at)}° de sensación, ${rlab(x)}`},
    {l: 'Playa', dur: 3, hrs: [10, 20], f: x => !x.day ? 0 : tri(x.t, 25, 33, 6) * x.dry * tri(x.ws, 0, 20, 15) * (1 - (x.cc || 0) / 180), why: x => `${num(x.t)}°, ${wlab(x.ws)}, UV ${num(x.uv)}`},
    {l: 'Picnic o barbacoa', dur: 3, hrs: [11, 22], f: x => tri(x.at, 18, 28, 7) * (x.pn6 >= 0.2 ? 0 : 1) * tri(x.ws, 0, 15, 12) * tri(x.uv, 0, 7, 4), why: x => `${num(x.at)}°, ${wlab(x.ws)}`},
    {l: 'Fotografía (hora dorada)', dur: 1, hrs: [0, 24], f: x => x.gold ? tri(x.cc, 15, 60, 35) * x.dry * (0.7 + 0.3 * tri(x.vis, 20000, 1e9, 15000)) : 0, why: x => `${x.cc < 15 ? 'cielo limpio' : x.cc <= 60 ? 'nubes que darán color' : 'muy nublado'}, junto al ${x.gold}`},
    {l: 'Ver las estrellas', dur: 2, hrs: [0, 24], f: x => x.day ? 0 : tri(x.cc, 0, 10, 40) * tri(x.rh, 0, 75, 25) * x.dry, why: x => `nubes ${num(x.cc)} %, humedad del ${num(x.rh)} %`},
    {l: 'Volar un dron', dur: 1, hrs: [8, 20], f: x => !x.day ? 0 : tri(x.gu, 0, 25, 15) * x.dry * tri(x.vis, 5000, 1e9, 4000) * tri(x.t, 0, 40, 5), why: x => `rachas de ${num(x.gu)} km/h, ${rlab(x)}`}
  ]}
];
S.cat = store.get('atm.cat', 'dep');
const QL = s => s >= 75 ? ['Ideal', '#9be3b0'] : s >= 55 ? ['Buena', '#4fc1c6'] : s >= 35 ? ['Regular', '#f7e463'] : ['Mala', '#f59a3a'];
const scCol = v => scaleCol(v / 100, [[0, '#e8452c'], [.3, '#f59a3a'], [.5, '#f7e463'], [.75, '#4fc1c6'], [1, '#9be3b0']]);
function renderActs(j) {
  const h = j.hourly, d = j.daily, cur = j.current.time.slice(0, 13);
  let i0 = h.time.findIndex(t => t.slice(0, 13) >= cur); if (i0 < 0) i0 = 0;
  const I = Array.from({length: 36}, (_, k) => i0 + k).filter(i => i < h.time.length);
  const P = h.precipitation;
  const win = (i, a, b) => { let s = 0; for (let k = i + a; k <= i + b; k++) if (k >= 0 && k < P.length) s += P[k] || 0; return s; };
  const et0day = {}; h.time.forEach((t, k) => { const dd = t.slice(0, 10); et0day[dd] = (et0day[dd] || 0) + (h.et0_fao_evapotranspiration?.[k] || 0); });
  const golden = i => { const t = h.time[i], dd = t.slice(0, 10), di = d.time.indexOf(dd); if (di < 0) return ''; const H = +t.slice(11, 13) + 0.5; const sr = d.sunrise[di], ss = d.sunset[di]; const hm = s => +s.slice(11, 13) + +s.slice(14, 16) / 60; if (Math.abs(H - hm(sr)) <= 1) return 'amanecer'; if (Math.abs(H - hm(ss)) <= 1) return 'atardecer'; return ''; };
  const X = i => ({t: h.temperature_2m[i], at: h.apparent_temperature[i], td: h.dew_point_2m?.[i], ws: h.wind_speed_10m[i] || 0, gu: h.wind_gusts_10m[i] || 0, p: P[i] || 0, pp: h.precipitation_probability[i] || 0,
    uv: h.uv_index[i] || 0, rh: h.relative_humidity_2m[i], rad: h.shortwave_radiation[i] || 0, cc: h.cloud_cover[i] || 0, day: h.is_day[i], vis: h.visibility?.[i], sm: h.soil_moisture_3_to_9cm?.[i], st: h.soil_temperature_6cm?.[i],
    storm: (h.weather_code[i] || 0) >= 95, ...fishX(i),
    et0d: et0day[h.time[i].slice(0, 10)] || 0, pn6: win(i, 1, 6), pn24: win(i, 1, 24), pp6: win(i, -6, 0), gold: golden(i), aq: S.aqH ? S.aqH[h.time[i]] : null,
    get dry() { return this.p >= 0.2 ? 0 : this.p >= 0.05 ? 0.4 : 1 - Math.max(0, this.pp - 20) / 100; }});
  const off = j.utc_offset_seconds || 0;
  if (!S.solLoc || S.solLoc.k !== LL() + d.time[0]) S.solLoc = {k: LL() + d.time[0], s: typeof SunCalc !== 'undefined' ? solunar(S.loc.lat, S.loc.lon, d.time.slice(0, 4), off) : null};
  function fishX(i) {
    const ms = locEpoch(h.time[i], off) + 1800e3;
    const so = S.solLoc.s ? solFactor(ms, S.solLoc.s) : {f: 0.6, why: ''};
    const li = lightFactor(ms, d.time, d, off, 'surf');
    const p3 = i >= 3 ? h.pressure_msl[i] - h.pressure_msl[i - 3] : 0;
    return {fsol: so.f, fsolWhy: so.why || 'sin datos de la Luna', flight: li.f, fpres: p3 < -3 ? 0.5 : p3 < -0.4 ? 1 : p3 > 1.5 ? 0.55 : 0.85, fpresWhy: p3 < -0.4 && p3 >= -3 ? 'presión bajando suave' : p3 > 1.5 ? 'presión subiendo rápido' : p3 < -3 ? 'presión cayendo deprisa' : 'presión estable'};
  }
  const XS = I.map(X);
  const today = j.current.time.slice(0, 10);
  const dayW = t => t.startsWith(today) ? 'hoy' : 'mañana';
  const cat = CATS.find(c => c.k === S.cat) || CATS[0];
  $('#catChips').innerHTML = CATS.map(c => `<button class="chip" data-cat="${c.k}" aria-pressed="${c.k === cat.k}">${c.l}</button>`).join('');
  $('#acts').innerHTML = cat.a.map(a => {
    const sc = XS.map((x, k) => { const hh = +h.time[I[k]].slice(11, 13); return hh >= a.hrs[0] && hh < a.hrs[1] ? Math.round(100 * Math.max(0, Math.min(1, a.f(x)))) : 0; });
    let best = -1, bi = -1;
    for (let k = 0; k + a.dur <= sc.length; k++) { const w = sc.slice(k, k + a.dur); if (w.some(v => v === 0)) continue; const m = w.reduce((s, v) => s + v, 0) / a.dur; if (m > best + 2) { best = m; bi = k; } }
    const now = sc[0], [qn, qc] = QL(now);
    const t0 = bi < 0 ? null : h.time[I[bi]], t1 = bi < 0 ? null : h.time[I[bi + a.dur - 1]];
    const bestTxt = bi < 0 || best < 35 ? 'Sin buen hueco en las próximas 36 h' : bi === 0 && best - now < 5 ? `Ahora es buen momento · ${QL(best)[0].toLowerCase()}` : `Mejor ${dayW(t0)} de ${t0.slice(11, 13)} a ${String((+t1.slice(11, 13) + 1) % 24).padStart(2, '0')} h · ${QL(best)[0].toLowerCase()}`;
    const ref = bi < 0 ? XS[0] : XS[bi];
    return `<div class="a2"><div class="sc" style="background:${scCol(now)}"><div><b>${now}</b><small>${qn.toLowerCase()}</small></div></div><div>
      <h3>${a.l}</h3>
      <div class="best">${bestTxt}</div><div class="why">${esc(a.why(ref))}</div>
      <div class="hs">${sc.map((v, k) => `<span style="background:${v === 0 ? 'rgba(255,255,255,.06)' : scCol(v)}${bi >= 0 && best >= 35 && k >= bi && k < bi + a.dur ? ';box-shadow:inset 0 -3px #fff' : ''}"></span>`).join('')}</div>
      <div class="hl"><span>ahora</span><span>+12 h</span><span>+24 h</span><span>+36 h</span></div></div></div>`;
  }).join('');
}
$('#catChips').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; S.cat = b.dataset.cat; store.set('atm.cat', S.cat); if (S.lastNow) renderActs(S.lastNow); });

/* ---------- frase-resumen de un día ---------- */
function daySummary(H, ids) {
  const sumv = (k, I) => I.reduce((x, i) => x + (H[k]?.[i] || 0), 0);
  const avg = (k, I) => { const v = I.map(i => H[k]?.[i]).filter(x => x != null); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  const part = (a, b, name) => {
    const I = ids.filter(i => { const hh = +H.time[i].slice(11, 13); return hh >= a && hh < b; });
    if (!I.length) return null;
    const t = avg('temperature_2m', I), cc = avg('cloud_cover', I), p = sumv('precipitation', I);
    const feel = t < 5 ? 'frío' : t < 12 ? 'fresco' : t < 20 ? 'templado' : t < 28 ? 'cálido' : 'caluroso';
    const sky = p >= 5 ? 'lluvioso' : p >= 0.5 ? 'con algún chubasco' : cc == null ? '' : cc < 25 ? 'despejado' : cc < 65 ? 'con nubes y claros' : 'nublado';
    return `${name}, ${feel}${sky ? (sky.startsWith('con') ? ' ' : ' y ') + sky : ''}`;
  };
  const parts = [part(6, 13, 'por la mañana'), part(13, 20, 'por la tarde'), part(20, 24, 'por la noche')].filter(Boolean);
  const T = ids.map(i => H.temperature_2m[i]);
  const mx = Math.max(...T.filter(x => x != null)), imx = ids[T.indexOf(mx)];
  const wv = Math.max(0, ...ids.map(i => H.wind_speed_10m?.[i] || 0)), gu = Math.max(0, ...ids.map(i => H.wind_gusts_10m?.[i] || 0));
  const wd = H.wind_direction_10m ? dirTxt(avg('wind_direction_10m', ids.filter(i => (H.wind_speed_10m[i] || 0) >= wv * .6))) : '';
  const wtxt = wv < 12 ? 'viento flojo' : wv < 30 ? 'viento moderado' : wv < 50 ? 'viento fuerte' : 'viento muy fuerte';
  const p = sumv('precipitation', ids);
  let s = parts.join('; ');
  s = s.charAt(0).toUpperCase() + s.slice(1);
  const t = `${s}. Máxima de ${num(mx)}° hacia las ${H.time[imx]?.slice(11, 13)} h; ${wtxt}${wd ? ' del ' + wd : ''}${gu >= 40 ? `, rachas de ${num(gu)} km/h` : ''}. ${p >= 0.2 ? num(p, 1) + ' mm de lluvia en total.' : 'Sin lluvia.'}`;
  return {t, mx, p};
}
/* ---------- vista de detalle de un día ---------- */
const DV = 'temperature_2m,apparent_temperature,dew_point_2m,relative_humidity_2m,precipitation,precipitation_probability,rain,showers,snowfall,weather_code,is_day,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_gusts_10m,wind_direction_10m,shortwave_radiation,direct_radiation,diffuse_radiation,uv_index,sunshine_duration,et0_fao_evapotranspiration,vapour_pressure_deficit,pressure_msl,visibility,freezing_level_height,cape,soil_temperature_6cm,soil_moisture_3_to_9cm';
const DVD = 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_hours,precipitation_probability_max,et0_fao_evapotranspiration,shortwave_radiation_sum,sunshine_duration,daylight_duration,sunrise,sunset,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant';
let dvDay = null;
async function openDay(day) {
  dvDay = day;
  const p = pd(day), list = S.days16 || [];
  const k = list.indexOf(day);
  $('#dvTitle').textContent = `${k === 0 ? 'Hoy, ' : ''}${['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][p.w]} ${p.d} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][p.m - 1]}`;
  $('#dvSub').textContent = S.loc.name + ' · detalle hora a hora';
  $('#dvPrev').disabled = k <= 0; $('#dvNext').disabled = k < 0 || k >= list.length - 1;
  $('#dayView').classList.add('on'); document.body.style.overflow = 'hidden';
  if (location.hash !== '#dia') history.pushState(null, '', '#dia');
  const body = $('#dvBody'); body.scrollTop = 0;
  body.innerHTML = '<div class="state">Cargando el detalle horario…</div>';
  try {
    const j = await getJSON(`https://api.open-meteo.com/v1/forecast?${LL()}&timezone=auto&start_date=${day}&end_date=${day}&hourly=${DV}&daily=${DVD}`);
    if (dvDay !== day) return;
    renderDay(j);
  } catch (e) { body.innerHTML = `<div class="state err">No se pudo cargar: ${esc(e.message)}</div>`; }
}
function closeDay() { $('#dayView').classList.remove('on'); document.body.style.overflow = ''; Object.keys(S.charts).filter(k => k.startsWith('dv')).forEach(k => { S.charts[k].destroy(); delete S.charts[k]; }); }
function renderDay(j) {
  const H = j.hourly, D = j.daily, ids = H.time.map((_, i) => i);
  const sm = daySummary(H, ids);
  const lab = H.time.map(t => t.slice(11, 13) + 'h');
  const sun = s => s == null ? '–' : `${Math.floor(s / 3600)} h ${Math.round(s % 3600 / 60)} min`;
  const tiles = [
    ['Máx / mín', `${num(D.temperature_2m_max[0])}° / ${num(D.temperature_2m_min[0])}°`, `sensación ${num(D.apparent_temperature_max[0])}° / ${num(D.apparent_temperature_min[0])}°`],
    ['Precipitación', num(D.precipitation_sum[0], 1) + ' mm', `${num(D.precipitation_hours[0])} h con lluvia · prob. ${num(D.precipitation_probability_max[0])} %`],
    ['Evapotranspiración', num(D.et0_fao_evapotranspiration[0], 1) + ' mm', 'ET₀ FAO-56 de referencia'],
    ['Balance P − ET₀', sgn(D.precipitation_sum[0] - D.et0_fao_evapotranspiration[0], 1) + ' mm', D.precipitation_sum[0] >= D.et0_fao_evapotranspiration[0] ? 'excedente de agua' : 'déficit de agua'],
    ['Radiación', num(D.shortwave_radiation_sum[0], 1) + ' MJ/m²', `UV máx. ${num(D.uv_index_max[0], 1)}`],
    ['Sol', sun(D.sunshine_duration[0]), `de ${sun(D.daylight_duration[0])} de luz`],
    ['Viento', `${num(D.wind_speed_10m_max[0])} km/h`, `rachas ${num(D.wind_gusts_10m_max[0])} · del ${dirTxt(D.wind_direction_10m_dominant[0])}`],
    ['Orto / ocaso', `${D.sunrise[0]?.slice(11, 16)} / ${D.sunset[0]?.slice(11, 16)}`, '']
  ];
  const tm = D.temperature_2m_max[0];
  $('#dvBody').innerHTML = `
    <div class="dvsum" style="background:linear-gradient(135deg, ${tCol(tm)} -40%, var(--bg2) 75%)">${wx(D.weather_code[0], 1)}${esc(sm.t)}<small>${esc(WMO[D.weather_code[0]] || '')}</small></div>
    <div class="kv kv4">${tiles.map(([k, v, s]) => `<div><small>${k}</small><strong>${v}</strong>${s ? `<em>${s}</em>` : ''}</div>`).join('')}</div>
    <div class="dvcharts">
      <div class="card"><h3>Temperatura</h3><div class="fig"><canvas id="dv1"></canvas></div></div>
      <div class="card"><h3>Precipitación</h3><div class="fig"><canvas id="dv2"></canvas></div></div>
      <div class="card"><h3>Viento</h3><div class="fig"><canvas id="dv3"></canvas></div></div>
      <div class="card"><h3>Humedad y nubes</h3><div class="fig"><canvas id="dv4"></canvas></div></div>
      <div class="card"><h3>Radiación y UV</h3><div class="fig"><canvas id="dv5"></canvas></div></div>
      <div class="card"><h3>Evapotranspiración y déficit de presión de vapor</h3><div class="fig"><canvas id="dv6"></canvas></div></div>
      <div class="card"><h3>Presión e isocero</h3><div class="fig"><canvas id="dv7"></canvas></div></div>
      <div class="card"><h3>Suelo</h3><div class="fig"><canvas id="dv8"></canvas></div></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Tabla horaria</h3><p class="sub">Desliza a la derecha para ver todas las variables.</p>
      <div class="scroll" style="max-height:70vh"><table class="htab"><thead><tr>${['Hora', '', 'T °C', 'Sens.', 'Rocío', 'HR %', 'P mm', 'Prob.', 'Viento', 'Rachas', 'Nubes %', 'Rad. W/m²', 'UV', 'ET₀ mm', 'Pres.', 'Visib. km'].map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>
      ${ids.map(i => `<tr><td>${lab[i]}</td><td>${wx(H.weather_code[i], H.is_day[i])}</td><td style="color:${tCol(H.temperature_2m[i])};font-weight:700">${num(H.temperature_2m[i], 1)}</td><td>${num(H.apparent_temperature[i])}</td><td>${num(H.dew_point_2m[i])}</td><td>${num(H.relative_humidity_2m[i])}</td><td>${H.precipitation[i] ? num(H.precipitation[i], 1) : '–'}</td><td>${num(H.precipitation_probability[i])} %</td><td>${arrow(H.wind_direction_10m[i])} ${num(H.wind_speed_10m[i])} ${dirTxt(H.wind_direction_10m[i])}</td><td>${num(H.wind_gusts_10m[i])}</td><td>${num(H.cloud_cover[i])}</td><td>${num(H.shortwave_radiation[i])}</td><td>${num(H.uv_index[i], 1)}</td><td>${num(H.et0_fao_evapotranspiration[i], 2)}</td><td>${num(H.pressure_msl[i])}</td><td>${H.visibility[i] == null ? '–' : num(H.visibility[i] / 1000, 1)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  const X = {x: {grid: {display: false}, ticks: {maxTicksLimit: narrow() ? 7 : 12, maxRotation: 0}}};
  const O = (extra = {}) => ({interaction: {mode: 'index', intersect: false}, plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}}, scales: {...X, ...extra}});
  setChart('dv1', {type: 'line', data: {labels: lab, datasets: [
    {label: 'Temperatura', data: H.temperature_2m, borderColor: '#f59a3a', borderWidth: 2.6, segment: {borderColor: c => tCol(c.p1.parsed.y)}},
    {label: 'Sensación', data: H.apparent_temperature, borderColor: '#ff9ad5', borderDash: [5, 4]},
    {label: 'Punto de rocío', data: H.dew_point_2m, borderColor: '#4fc1c6', borderWidth: 1.5}]}, options: O({y: {title: {display: true, text: '°C'}}})});
  setChart('dv2', {type: 'bar', data: {labels: lab, datasets: [
    {type: 'line', label: 'Probabilidad %', data: H.precipitation_probability, borderColor: '#f7e463', yAxisID: 'y1'},
    {label: 'Lluvia', data: H.rain.map((r, i) => (r || 0) + (H.showers[i] || 0)), backgroundColor: '#4fc1c6', stack: 'p'},
    {label: 'Nieve (cm)', data: H.snowfall, backgroundColor: '#ffffff', stack: 'p'}]},
    options: O({y: {beginAtZero: true, suggestedMax: 1, stacked: true, title: {display: true, text: 'mm'}}, y1: {position: 'right', min: 0, max: 100, grid: {display: false}}, x: {...X.x, stacked: true}})});
  setChart('dv3', {type: 'line', data: {labels: lab, datasets: [
    {label: 'Viento medio', data: H.wind_speed_10m, borderColor: '#8ea2ff', borderWidth: 2.4},
    {label: 'Rachas', data: H.wind_gusts_10m, borderColor: '#e8452c', borderDash: [5, 4]}]},
    options: {...O({y: {beginAtZero: true, title: {display: true, text: 'km/h'}}}), plugins: {legend: {position: 'bottom'}, tooltip: {callbacks: {afterBody: it => 'Dirección: del ' + dirTxt(H.wind_direction_10m[it[0].dataIndex]) + ` (${num(H.wind_direction_10m[it[0].dataIndex])}°)`}}}}});
  setChart('dv4', {type: 'line', data: {labels: lab, datasets: [
    {label: 'Humedad relativa %', data: H.relative_humidity_2m, borderColor: '#4fc1c6', borderWidth: 2.4},
    {label: 'Nubes bajas', data: H.cloud_cover_low, borderColor: 'rgba(223,229,255,.9)', backgroundColor: 'rgba(223,229,255,.25)', fill: 'origin', borderWidth: 1},
    {label: 'Medias', data: H.cloud_cover_mid, borderColor: 'rgba(174,185,230,.8)', borderWidth: 1, borderDash: [3, 3]},
    {label: 'Altas', data: H.cloud_cover_high, borderColor: 'rgba(142,162,255,.8)', borderWidth: 1, borderDash: [1, 3]}]}, options: O({y: {min: 0, max: 100, title: {display: true, text: '%'}}})});
  setChart('dv5', {type: 'line', data: {labels: lab, datasets: [
    {label: 'Global', data: H.shortwave_radiation, borderColor: '#f7e463', backgroundColor: 'rgba(247,228,99,.22)', fill: 'origin'},
    {label: 'Directa', data: H.direct_radiation, borderColor: '#f59a3a', borderWidth: 1.5},
    {label: 'Difusa', data: H.diffuse_radiation, borderColor: '#aeb9e6', borderWidth: 1.5},
    {label: 'Índice UV', data: H.uv_index, borderColor: '#ff5fb0', borderDash: [5, 4], yAxisID: 'y1'}]},
    options: O({y: {beginAtZero: true, title: {display: true, text: 'W/m²'}}, y1: {position: 'right', beginAtZero: true, grid: {display: false}, title: {display: true, text: 'UV'}}})});
  setChart('dv6', {type: 'bar', data: {labels: lab, datasets: [
    {type: 'line', label: 'Déficit de presión de vapor (kPa)', data: H.vapour_pressure_deficit, borderColor: '#f59a3a', yAxisID: 'y1'},
    {label: 'ET₀ (mm/h)', data: H.et0_fao_evapotranspiration, backgroundColor: '#9be3b0'}]},
    options: O({y: {beginAtZero: true, title: {display: true, text: 'mm'}}, y1: {position: 'right', beginAtZero: true, grid: {display: false}, title: {display: true, text: 'kPa'}}})});
  setChart('dv7', {type: 'line', data: {labels: lab, datasets: [
    {label: 'Presión (hPa)', data: H.pressure_msl, borderColor: '#eef1ff'},
    {label: 'Isocero (m)', data: H.freezing_level_height, borderColor: '#4fc1c6', borderDash: [5, 4], yAxisID: 'y1'}]},
    options: O({y: {title: {display: true, text: 'hPa'}}, y1: {position: 'right', grid: {display: false}, title: {display: true, text: 'm'}}})});
  setChart('dv8', {type: 'line', data: {labels: lab, datasets: [
    {label: 'Temperatura del suelo a 6 cm (°C)', data: H.soil_temperature_6cm, borderColor: '#d6b38a'},
    {label: 'Humedad del suelo 3–9 cm (m³/m³)', data: H.soil_moisture_3_to_9cm, borderColor: '#4fc1c6', yAxisID: 'y1'}]},
    options: O({y: {title: {display: true, text: '°C'}}, y1: {position: 'right', grid: {display: false}, title: {display: true, text: 'm³/m³'}}})});
}
$('#days').addEventListener('click', e => { const r = e.target.closest('[data-day]'); if (r) openDay(r.dataset.day); });
$('#days').addEventListener('keydown', e => { const r = e.target.closest('[data-day]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDay(r.dataset.day); } });
$('#dvBack').onclick = () => history.back();
$('#dvPrev').onclick = () => { const L = S.days16 || [], k = L.indexOf(dvDay); if (k > 0) openDay(L[k - 1]); };
$('#dvNext').onclick = () => { const L = S.days16 || [], k = L.indexOf(dvDay); if (k >= 0 && k < L.length - 1) openDay(L[k + 1]); };

/* radar de la portada */
let rvPromise = null, rvAt = 0;
const rvData = () => { if (!rvPromise || Date.now() - rvAt > 5 * 60e3) { rvAt = Date.now(); rvPromise = getJSON('https://api.rainviewer.com/public/weather-maps.json').catch(e => { rvPromise = null; throw e; }); } return rvPromise; };
let nowMap, nowMk, nowRv = [], nowFrames = [], nowIdx = 0, nowTimer = null;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function nowShow(i) {
  nowRv.forEach((l, k) => { if (k === i) { if (!nowMap.hasLayer(l)) l.addTo(nowMap); l.setOpacity(.85); } else if (nowMap.hasLayer(l)) l.setOpacity(0); });
  const f = nowFrames[i]; if (f) $('#nowRvTime').textContent = (i === nowFrames.length - 1 ? 'Último: ' : '') + new Date(f.time * 1000).toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
}
function nowPlay(on) {
  clearInterval(nowTimer); nowTimer = null;
  $('#nowPlay').textContent = on ? '❚❚' : '▶';
  if (!on || !nowFrames.length) { if (nowFrames.length) { nowIdx = nowFrames.length - 1; nowShow(nowIdx); } return; }
  let hold = 0;
  nowTimer = setInterval(() => {
    if (nowIdx === nowFrames.length - 1 && hold++ < 3) return; hold = 0;
    nowIdx = (nowIdx + 1) % nowFrames.length; nowShow(nowIdx);
  }, 600);
}
async function initNowRadar() {
  const ll = [S.loc.lat, S.loc.lon];
  if (!nowMap) {
    nowMap = L.map('nowMap', {zoomControl: false, scrollWheelZoom: false, attributionControl: true}).setView(ll, 8);
    nowMap.createPane('labels'); nowMap.getPane('labels').style.zIndex = 650; nowMap.getPane('labels').style.pointerEvents = 'none';
    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
    L.tileLayer(esri + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom: 14, attribution: '© Esri · Radar © RainViewer'}).addTo(nowMap);
    L.tileLayer(esri + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {maxZoom: 14, pane: 'labels'}).addTo(nowMap);
    nowMk = L.circleMarker(ll, {radius: 7, color: '#0b1433', weight: 2, fillColor: '#f7e463', fillOpacity: 1, pane: 'labels'}).addTo(nowMap);
    L.control.zoom({position: 'topleft'}).addTo(nowMap);
  } else { nowMap.invalidateSize(); nowMap.setView(ll, 8); nowMk.setLatLng(ll); }
  try {
    const j = await rvData();
    nowRv.forEach(l => nowMap.removeLayer(l));
    nowFrames = j.radar?.past || [];
    nowRv = nowFrames.map(f => L.tileLayer(`${j.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`, {opacity: 0, maxNativeZoom: 7, maxZoom: 14, zIndex: 5}));
    nowIdx = nowFrames.length - 1; nowShow(nowIdx);
    if (!reduceMotion) { nowIdx = 0; nowPlay(true); } else nowPlay(false);
  } catch (e) { $('#nowRvTime').textContent = 'Radar no disponible'; }
}
const AQI = [[20,'Buena','#4fc1c6'],[40,'Aceptable','#9be3b0'],[60,'Moderada','#f7e463'],[80,'Mala','#f59a3a'],[100,'Muy mala','#e8452c'],[1e9,'Extremadamente mala','#8e1236']];
async function loadAQ() {
  // solo se usa para calcular la idoneidad de las actividades
  try {
    const j = await getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?${LL()}&timezone=auto&forecast_days=3&hourly=european_aqi`);
    S.aqH = {}; j.hourly.time.forEach((t, k) => S.aqH[t] = j.hourly.european_aqi[k]);
    if (S.lastNow) renderActs(S.lastNow);
  } catch (e) { S.aqH = null; }
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
   MAR
   ========================================================= */
const BEACHES = [
  ['Matalascañas', 36.99, -6.56], ['Mazagón', 37.13, -6.82], ['Punta Umbría', 37.17, -6.97], ['Isla Cristina', 37.19, -7.32],
  ['Chipiona', 36.74, -6.44], ['Cádiz, La Caleta', 36.53, -6.31], ['Cádiz, La Victoria', 36.51, -6.28], ['La Barrosa', 36.37, -6.18],
  ['Conil', 36.27, -6.09], ['Zahara de los Atunes', 36.13, -5.85], ['Bolonia', 36.09, -5.77], ['Tarifa, Los Lances', 36.03, -5.62],
  ['Marbella', 36.51, -4.88], ['Málaga, La Malagueta', 36.72, -4.41], ['Nerja', 36.75, -3.87], ['Cabo de Gata', 36.78, -2.24],
  ['Valencia, Malvarrosa', 39.48, -0.32], ['Barcelona', 41.38, 2.19], ['Donostia, La Concha', 43.32, -1.99], ['Gijón, San Lorenzo', 43.54, -5.65],
  ['A Coruña, Riazor', 43.37, -8.41], ['Las Palmas, Las Canteras', 28.14, -15.44]
].map(([n, lat, lon]) => ({name: n, lat, lon}));
S.beach = store.get('atm.beach', null);
S.fishMode = store.get('atm.fish', 'surf');
let beachMap, beachMk, beachRes = [];
const MOON = p => p < 0.03 || p > 0.97 ? 'Luna nueva' : p < 0.22 ? 'Creciente' : p < 0.28 ? 'Cuarto creciente' : p < 0.47 ? 'Creciente gibosa' : p < 0.53 ? 'Luna llena' : p < 0.72 ? 'Menguante gibosa' : p < 0.78 ? 'Cuarto menguante' : 'Menguante';
const card8 = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const from = d => d == null ? '–' : 'del ' + card8[Math.round(d / 45) % 8];
function renderBeachChips() {
  const fav = S.beach && !BEACHES.some(b => b.name === S.beach.name) ? [S.beach] : [];
  $('#beachChips').innerHTML = [...fav, ...BEACHES].map((b, i) => `<button class="chip" data-b="${i}" aria-pressed="${S.beach && S.beach.name === b.name}">${esc(b.name)}</button>`).join('');
  $('#beachChips').dataset.list = JSON.stringify([...fav, ...BEACHES]);
}
function setBeach(b) { S.beach = b; store.set('atm.beach', b); renderBeachChips(); $('#beachRes').innerHTML = ''; loadSea(); if (beachMk) beachMk.setLatLng([b.lat, b.lon]); }
/* Luna y períodos solunares por día (hora local del punto) */
function solunar(lat, lon, days, off) {
  return days.map(day => {
    const t0 = locEpoch(day + 'T00:00', off), N = 145, alt = [];
    for (let k = 0; k < N; k++) { const t = t0 + k * 600e3; alt.push([t, SunCalc.getMoonPosition(new Date(t), lat, lon).altitude]); }
    let up = alt[0], lo = alt[0], rise = null, set = null;
    alt.forEach((a, k) => { if (a[1] > up[1]) up = a; if (a[1] < lo[1]) lo = a; if (k) { const p = alt[k - 1]; if (p[1] < 0 && a[1] >= 0 && !rise) rise = a[0]; if (p[1] >= 0 && a[1] < 0 && !set) set = a[0]; } });
    const ill = SunCalc.getMoonIllumination(new Date(t0 + 12 * 3600e3));
    return {day, mid: t0 + 12 * 3600e3, major: [up[0], lo[0]], minor: [rise, set].filter(Boolean), rise, set, frac: ill.fraction, phase: ill.phase};
  });
}
const fmtT = (ms, off) => { if (!ms) return '–'; const d = new Date(ms + off * 1000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
function solFactor(ms, sol) {
  let f = 0.45, why = 'fuera de períodos solunares';
  for (const s of sol) {
    for (const m of s.major) if (Math.abs(ms - m) <= 60 * 60e3) { f = 1; why = 'período solunar mayor (Luna en el meridiano)'; }
    if (f < 1) for (const m of s.minor) if (Math.abs(ms - m) <= 30 * 60e3) { f = 0.8; why = 'período solunar menor (salida o puesta de la Luna)'; }
  }
  const s = sol.reduce((p, x) => !p || Math.abs(ms - x.mid) < Math.abs(ms - p.mid) ? x : p, null);
  const ph = s ? s.phase : 0.5, nearNF = Math.min(Math.abs(ph - 0), Math.abs(ph - 0.5), Math.abs(ph - 1)) < 0.1;
  return {f: Math.min(1, f * (nearNF ? 1.1 : 1)), why: why + (nearNF ? '; luna nueva o llena: más actividad' : '')};
}
function lightFactor(ms, days, D, off, mode) {
  const di = days.findIndex(d => ms >= locEpoch(d + 'T00:00', off) && ms < locEpoch(d + 'T00:00', off) + 864e5); if (di < 0) return {f: 0.6, why: ''};
  const sr = locEpoch(D.sunrise[di], off), ss = locEpoch(D.sunset[di], off);
  if (Math.abs(ms - sr) <= 90 * 60e3) return {f: 1, why: 'alba: los peces se acercan a comer'};
  if (Math.abs(ms - ss) <= 90 * 60e3) return {f: 1, why: 'ocaso: hora de máxima actividad'};
  if (ms < sr || ms > ss) return {f: mode === 'sub' ? 0 : 0.75, why: mode === 'sub' ? 'de noche no se practica' : 'noche: buena para especies nocturnas'};
  return {f: mode === 'barco' || mode === 'sub' ? 0.8 : 0.55, why: 'pleno día: actividad más baja'};
}
const FMODES = [
  {k: 'surf', l: 'Surfcasting (playa)'}, {k: 'roca', l: 'Spinning y roca'}, {k: 'barco', l: 'Desde embarcación'}, {k: 'sub', l: 'Pesca submarina'}
];
async function loadSea() {
  renderBeachChips();
  renderFishModes();
  const b = S.beach;
  if (!b) { $('#seaNow').innerHTML = '<div class="state">Elige una playa arriba para ver el mar.</div>'; return; }
  $('#seaNow').innerHTML = '<div class="state">Cargando el estado del mar…</div>';
  const L = `latitude=${b.lat.toFixed(4)}&longitude=${b.lon.toFixed(4)}`;
  try {
    const [m, w] = await Promise.all([
      getJSON(`https://marine-api.open-meteo.com/v1/marine?${L}&timezone=auto&past_days=1&forecast_days=7&minutely_15=sea_level_height_msl&hourly=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature,ocean_current_velocity,ocean_current_direction&daily=wave_height_max,wave_direction_dominant,wave_period_max`),
      getJSON(`https://api.open-meteo.com/v1/forecast?${L}&timezone=auto&past_days=1&forecast_days=7&current=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,is_day&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,pressure_msl,precipitation,precipitation_probability,weather_code,cloud_cover,uv_index,is_day,visibility&daily=sunrise,sunset,wind_speed_10m_max,wind_gusts_10m_max,temperature_2m_max`)
    ]);
    S.sea = {m, w}; renderSea();
  } catch (e) { $('#seaNow').innerHTML = `<div class="state err">No hay datos marinos para este punto (${esc(e.message)}). Prueba a tocar un poco más dentro del mar.</div>`; }
}
function tideExtrema(T, V, off) {
  const out = [];
  for (let k = 2; k < V.length - 2; k++) {
    const v = V[k]; if (v == null || V[k - 1] == null || V[k + 1] == null) continue;
    const hi = v >= V[k - 1] && v > V[k + 1] && v >= V[k - 2] && v >= V[k + 2], lo = v <= V[k - 1] && v < V[k + 1] && v <= V[k - 2] && v <= V[k + 2];
    if (!hi && !lo) continue;
    const ms = locEpoch(T[k], off), last = out[out.length - 1];
    if (last && ms - last.ms < 3 * 3600e3) { if ((hi && v > last.v && last.hi) || (lo && v < last.v && !last.hi)) out[out.length - 1] = {ms, t: T[k], v, hi}; continue; }
    out.push({ms, t: T[k], v, hi});
  }
  return out;
}
function renderSea() {
  const {m, w} = S.sea, b = S.beach, off = m.utc_offset_seconds || 0, now = Date.now();
  const mh = m.hourly, wh = w.hourly, D = w.daily;
  const T15 = m.minutely_15.time, V15 = m.minutely_15.sea_level_height_msl;
  const ex = tideExtrema(T15, V15, off);
  let k15 = T15.findIndex(t => locEpoch(t, off) >= now); if (k15 < 1) k15 = 1;
  const tNow = V15[k15], rising = V15[k15] > V15[k15 - 1];
  const nextEx = ex.find(e => e.ms > now);
  const curH = w.current.time.slice(0, 13); let i0 = mh.time.findIndex(t => t.slice(0, 13) >= curH); if (i0 < 0) i0 = 0;
  let j0 = wh.time.findIndex(t => t.slice(0, 13) >= curH); if (j0 < 0) j0 = 0;
  const c = w.current;
  const days = D.time.filter(d => d >= c.time.slice(0, 10));
  const ranges = D.time.map(d => { const v = V15.filter((x, k) => T15[k].startsWith(d) && x != null); return v.length ? Math.max(...v) - Math.min(...v) : null; });
  const maxR = Math.max(...ranges.filter(x => x != null));
  const todayR = ranges[D.time.indexOf(c.time.slice(0, 10))];
  const spring = todayR == null ? '' : todayR >= 0.85 * maxR ? 'mareas vivas' : todayR <= 0.6 * maxR ? 'mareas muertas' : 'mareas intermedias';
  const sol = solunar(b.lat, b.lon, D.time, off);
  S.seaSol = sol;
  const ms = Math.abs(nextEx ? (nextEx.ms - now) / 60e3 : 0), hh = Math.floor(ms / 60), mm = Math.round(ms % 60);
  $('#seaNow').innerHTML = `<div class="bn">${esc(b.name)}</div><div class="bs">${esc(WMO[c.weather_code] || '')} · aire ${num(c.temperature_2m)}° · punto del modelo ${num(m.latitude, 2)}, ${num(m.longitude, 2)}</div>
    <div class="tidebar">Marea ${rising ? 'subiendo ↑ (llenante)' : 'bajando ↓ (vaciante)'} · ${num(tNow, 2)} m${nextEx ? `<small>${nextEx.hi ? 'Pleamar' : 'Bajamar'} a las ${hhmm(nextEx.t)} (${num(nextEx.v, 2)} m), dentro de ${hh ? hh + ' h ' : ''}${mm} min · ${spring}</small>` : ''}</div>
    <div class="seabig">
      <div><small>Olas</small><strong>${num(mh.wave_height[i0], 1)} m</strong><em>${num(mh.wave_period[i0])} s · ${from(mh.wave_direction[i0])}</em></div>
      <div><small>Mar de fondo</small><strong>${num(mh.swell_wave_height[i0], 1)} m</strong><em>${num(mh.swell_wave_period[i0])} s · ${from(mh.swell_wave_direction[i0])}</em></div>
      <div><small>Agua</small><strong>${num(mh.sea_surface_temperature[i0], 1)}°</strong><em>superficie</em></div>
      <div><small>Viento</small><strong>${num(c.wind_speed_10m)}</strong><em>km/h ${from(c.wind_direction_10m)} · rachas ${num(c.wind_gusts_10m)}</em></div>
      <div><small>Mar de viento</small><strong>${num(mh.wind_wave_height[i0], 1)} m</strong><em>olas locales</em></div>
      <div><small>Corriente</small><strong>${num(mh.ocean_current_velocity[i0], 1)}</strong><em>km/h hacia ${card8[Math.round((mh.ocean_current_direction[i0] || 0) / 45) % 8]}</em></div>
    </div>`;
  // mareas: desde 6 h antes hasta 66 h después
  const a = Math.max(0, k15 - 24), z = Math.min(T15.length, k15 + 264);
  const Tt = T15.slice(a, z), Vt = V15.slice(a, z), exSet = new Set(ex.map(e => e.t));
  setChart('tideChart', {type: 'line', data: {labels: Tt.map(t => lblD(t) + ' ' + hhmm(t)), datasets: [{label: 'Nivel del mar (m)', data: Vt, borderColor: '#4fc1c6', backgroundColor: 'rgba(79,193,198,.18)', fill: 'start', tension: .3,
    pointRadius: Tt.map((t, k) => exSet.has(t) ? 4 : k === k15 - a ? 6 : 0), pointBackgroundColor: Tt.map((t, k) => k === k15 - a ? '#f7e463' : '#fff')}]},
    options: {plugins: {legend: {display: false}, tooltip: {intersect: false, mode: 'index'}}, scales: {x: {grid: {display: false}, ticks: {maxTicksLimit: narrow() ? 4 : 7, maxRotation: 0, callback: function (v) { const l = this.getLabelForValue(v); return l.endsWith('00:00') || l.endsWith('12:00') ? l.replace(' 00:00', '').replace(' 12:00', ' 12h') : null; }}}, y: {title: {display: true, text: 'm'}}}}});
  $('#tideSub').textContent = `Altura del mar cada 15 minutos. Hoy, carrera de marea de ${num(todayR, 2)} m (${spring}). El punto amarillo es ahora.`;
  $('#tideTable').innerHTML = days.slice(0, 4).map(d => { const e = ex.filter(x => x.t.startsWith(d)); return `<div class="tday"><b>${lblD(d)}</b>${e.map(x => `<span class="${x.hi ? 'hi' : 'lo'}">${x.hi ? '▲' : '▼'} ${hhmm(x.t)} · ${num(x.v, 1)}</span>`).join('')}</div>`; }).join('');
  // oleaje 7 días
  const ia = Math.max(0, i0 - 3), I = mh.time.map((_, i) => i).filter(i => i >= ia);
  setChart('waveChart', {type: 'line', data: {labels: I.map(i => lblH(mh.time[i])), datasets: [
    {label: 'Altura total', data: I.map(i => mh.wave_height[i]), borderColor: '#eef1ff', borderWidth: 2.4, backgroundColor: 'rgba(238,241,255,.12)', fill: 'origin'},
    {label: 'Mar de fondo', data: I.map(i => mh.swell_wave_height[i]), borderColor: '#4fc1c6'},
    {label: 'Mar de viento', data: I.map(i => mh.wind_wave_height[i]), borderColor: '#f59a3a', borderDash: [4, 3]},
    {label: 'Periodo (s)', data: I.map(i => mh.wave_period[i]), borderColor: 'rgba(247,228,99,.8)', borderWidth: 1.3, yAxisID: 'y1'}]},
    options: {interaction: {mode: 'index', intersect: false}, plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}}, scales: {x: {ticks: xTicks(), grid: {display: false}}, y: {beginAtZero: true, title: {display: true, text: 'm'}}, y1: {position: 'right', beginAtZero: true, grid: {display: false}, title: {display: true, text: 's'}}}}});
  const J = wh.time.map((_, i) => i).filter(i => i >= Math.max(0, j0 - 3));
  setChart('windSea', {type: 'line', data: {labels: J.map(i => lblH(wh.time[i])), datasets: [
    {label: 'Viento km/h', data: J.map(i => wh.wind_speed_10m[i]), borderColor: '#8ea2ff'}, {label: 'Rachas', data: J.map(i => wh.wind_gusts_10m[i]), borderColor: '#e8452c', borderDash: [4, 3]}]},
    options: {interaction: {mode: 'index', intersect: false}, plugins: {legend: {position: 'bottom', labels: {font: {size: 11}}}, tooltip: {callbacks: {afterBody: it => 'Dirección: ' + from(wh.wind_direction_10m[J[it[0].dataIndex]])}}}, scales: {x: {ticks: xTicks(), grid: {display: false}}, y: {beginAtZero: true}}}});
  renderFish();
  // otras actividades
  const SX = i => { const t = mh.time[i], j = wh.time.indexOf(t); return {wave: mh.wave_height[i], swell: mh.swell_wave_height[i], per: mh.swell_wave_period[i] ?? mh.wave_period[i], sst: mh.sea_surface_temperature[i], ws: wh.wind_speed_10m[j] || 0, gu: wh.wind_gusts_10m[j] || 0, p: wh.precipitation[j] || 0, day: wh.is_day[j], uv: wh.uv_index[j] || 0, t: wh.temperature_2m[j], storm: (wh.weather_code[j] || 0) >= 95}; };
  const SA = [
    {l: 'Baño', f: x => !x.day || x.storm ? 0 : tri(x.wave, 0, 0.6, 0.7) * tri(x.ws, 0, 18, 15) * tri(x.sst, 20, 28, 4) * tri(x.t, 22, 34, 6) * (x.p > 0.2 ? 0.3 : 1), why: x => `olas de ${num(x.wave, 1)} m, agua a ${num(x.sst)}°, aire a ${num(x.t)}°`},
    {l: 'Surf', f: x => !x.day || x.storm ? 0 : tri(x.swell, 0.8, 2.5, 0.8) * tri(x.per, 9, 16, 4) * tri(x.ws, 0, 15, 15), why: x => `mar de fondo de ${num(x.swell, 1)} m con ${num(x.per)} s de periodo, viento ${num(x.ws)} km/h`},
    {l: 'Kayak y paddle surf', f: x => !x.day || x.storm ? 0 : tri(x.wave, 0, 0.4, 0.4) * tri(x.ws, 0, 12, 10) * tri(x.gu, 0, 20, 10), why: x => `olas de ${num(x.wave, 1)} m, viento ${num(x.ws)} km/h, rachas ${num(x.gu)}`},
    {l: 'Navegar a vela', f: x => !x.day || x.storm ? 0 : tri(x.ws, 10, 28, 10) * tri(x.gu, 0, 40, 10) * tri(x.wave, 0, 1.5, 1), why: x => `viento ${num(x.ws)} km/h, olas de ${num(x.wave, 1)} m`},
    {l: 'Paseo por la orilla', f: x => x.storm ? 0 : tri(x.t, 12, 28, 8) * tri(x.ws, 0, 25, 15) * (x.p > 0.2 ? 0.2 : 1), why: x => `${num(x.t)}°, viento ${num(x.ws)} km/h`}
  ];
  const Is = Array.from({length: 48}, (_, k) => i0 + k).filter(i => i < mh.time.length);
  $('#seaActs').innerHTML = SA.map(a => {
    const sc = Is.map(i => Math.round(100 * Math.max(0, Math.min(1, a.f(SX(i))))));
    let best = -1, bi = -1; sc.forEach((v, k) => { if (v > best + 2) { best = v; bi = k; } });
    const now = sc[0], t0 = mh.time[Is[bi]];
    return `<div class="a2"><div class="sc" style="background:${scCol(now)}"><div><b>${now}</b><small>${QL(now)[0].toLowerCase()}</small></div></div><div><h3>${a.l}</h3>
      <div class="best">${best < 35 ? 'Sin buen momento en 48 h' : bi === 0 ? 'Ahora es buen momento' : `Mejor ${t0.startsWith(c.time.slice(0, 10)) ? 'hoy' : lblD(t0)} a las ${t0.slice(11, 13)} h · ${QL(best)[0].toLowerCase()}`}</div>
      <div class="why">${esc(a.why(SX(Is[bi < 0 ? 0 : bi])))}</div><div class="hs">${sc.map(v => `<span style="background:${v === 0 ? 'rgba(255,255,255,.06)' : scCol(v)}"></span>`).join('')}</div><div class="hl"><span>ahora</span><span>+24 h</span><span>+48 h</span></div></div></div>`;
  }).join('');
  // 7 días
  $('#seaDays').innerHTML = `<thead><tr><th>Día</th><th>Olas máx.</th><th>Dirección</th><th>Periodo</th><th>Viento máx.</th><th>Rachas</th><th>Agua</th><th>Pleamares</th><th>Bajamares</th><th>Luna</th></tr></thead><tbody>${m.daily.time.filter(d => d >= c.time.slice(0, 10)).map(d => {
    const k = m.daily.time.indexOf(d), q = D.time.indexOf(d), e = ex.filter(x => x.t.startsWith(d)), s = sol.find(x => x.day === d);
    const sst = mh.sea_surface_temperature.filter((v, i) => mh.time[i].startsWith(d) && v != null);
    return `<tr><td>${lblD(d)}</td><td>${num(m.daily.wave_height_max[k], 1)} m</td><td>${from(m.daily.wave_direction_dominant[k])}</td><td>${num(m.daily.wave_period_max[k])} s</td><td>${num(D.wind_speed_10m_max[q])} km/h</td><td>${num(D.wind_gusts_10m_max[q])}</td><td>${sst.length ? num(sst.reduce((x, y) => x + y, 0) / sst.length, 1) + '°' : '–'}</td><td>${e.filter(x => x.hi).map(x => hhmm(x.t)).join(' · ')}</td><td>${e.filter(x => !x.hi).map(x => hhmm(x.t)).join(' · ')}</td><td>${s ? MOON(s.phase) + ' ' + num(s.frac * 100) + ' %' : ''}</td></tr>`;
  }).join('')}</tbody>`;
}
function renderFishModes() { $('#fishMode').innerHTML = FMODES.map(f => `<button class="chip" data-f="${f.k}" aria-pressed="${f.k === S.fishMode}">${f.l}</button>`).join(''); }
function renderFish() {
  if (!S.sea) return;
  const {m, w} = S.sea, off = m.utc_offset_seconds || 0, now = Date.now(), mode = S.fishMode;
  const mh = m.hourly, wh = w.hourly, D = w.daily, sol = S.seaSol;
  const T15 = m.minutely_15.time, V15 = m.minutely_15.sea_level_height_msl, ex = tideExtrema(T15, V15, off);
  const lvl = ms => { const k = T15.findIndex(t => locEpoch(t, off) >= ms); return k < 1 ? null : k; };
  const hours = wh.time.map((t, j) => ({t, j, ms: locEpoch(t, off)})).filter(o => o.ms >= now - 3600e3).slice(0, 72);
  const score = o => {
    const j = o.j, i = mh.time.indexOf(o.t), k = lvl(o.ms);
    // marea: velocidad del agua y cercanía a la pleamar
    let rate = 0, mx = 0.01; if (k) { rate = Math.abs(V15[k + 1] - V15[k - 1]); for (let q = Math.max(1, k - 48); q < Math.min(V15.length - 1, k + 48); q++) mx = Math.max(mx, Math.abs(V15[q + 1] - V15[q - 1])); }
    const nearHi = ex.some(e => e.hi && e.ms - o.ms <= 2 * 3600e3 && o.ms - e.ms <= 3600e3);
    const nearLo = ex.some(e => !e.hi && Math.abs(e.ms - o.ms) <= 3600e3);
    let tide = 0.35 + 0.65 * Math.min(1, rate / mx); if (mode === 'surf' && nearHi) tide = Math.max(tide, 1); if (mode === 'sub') tide = nearHi || nearLo ? 1 : 0.6;
    const tideWhy = mode === 'sub' ? (nearHi || nearLo ? 'repunte de marea: agua parada y más clara' : 'corriente de marea') : nearHi ? 'en torno a la pleamar (2 h antes a 1 h después)' : rate / mx > 0.6 ? 'marea moviendo mucha agua' : rate / mx < 0.25 ? 'marea casi parada (repunte)' : 'marea moviéndose';
    const so = solFactor(o.ms, sol), li = lightFactor(o.ms, D.time, D, off, mode);
    const p3 = j >= 3 ? wh.pressure_msl[j] - wh.pressure_msl[j - 3] : 0;
    const pres = p3 < -3 ? 0.5 : p3 < -0.4 ? 1 : p3 > 1.5 ? 0.55 : 0.85;
    const presWhy = p3 < -3 ? 'presión cayendo deprisa: llega temporal' : p3 < -0.4 ? 'presión bajando suave: los peces comen más' : p3 > 1.5 ? 'presión subiendo rápido: suelen parar' : 'presión estable';
    const ws = wh.wind_speed_10m[j] || 0, gu = wh.wind_gusts_10m[j] || 0, wv = i >= 0 ? mh.wave_height[i] : null;
    const wind = mode === 'barco' ? tri(ws, 0, 15, 10) * tri(gu, 0, 25, 10) : mode === 'sub' ? tri(ws, 0, 12, 10) : mode === 'roca' ? tri(ws, 0, 20, 15) : tri(ws, 0, 25, 20);
    const wave = wv == null ? 0.7 : mode === 'surf' ? tri(wv, 0.5, 1.5, 1) : mode === 'roca' ? (wv > 2 ? 0 : tri(wv, 0.3, 1.2, 0.8)) : mode === 'barco' ? tri(wv, 0, 0.8, 0.6) : tri(wv, 0, 0.5, 0.4);
    const p = wh.precipitation[j] || 0, storm = (wh.weather_code[j] || 0) >= 95;
    const rain = storm ? 0 : p > 2 ? 0.5 : p > 0.3 ? 0.85 : 1;
    const bio = 0.3 * tide + 0.25 * so.f + 0.25 * li.f + 0.2 * pres;
    const s = Math.round(100 * Math.min(1, bio) * wind * wave * rain * (li.f === 0 ? 0 : 1));
    return {s, o, i, F: [['Marea', tide, tideWhy], ['Luna', so.f, so.why], ['Luz', li.f, li.why], ['Presión', pres, presWhy + ` (${sgn(p3, 1)} hPa en 3 h)`], ['Viento', wind, `${num(ws)} km/h ${from(wh.wind_direction_10m[j])}, rachas ${num(gu)}`], ['Oleaje', wave, wv == null ? 'sin dato' : `${num(wv, 1)} m`], ['Lluvia', rain, storm ? 'tormenta: no pesques' : p > 0.3 ? `${num(p, 1)} mm` : 'seco']], wv, ws};
  };
  const R = hours.map(score);
  let bestK = 0; R.forEach((r, k) => { if (r.s > R[bestK].s) bestK = k; });
  // tres mejores ventanas separadas
  const tops = []; [...R].sort((x, y) => y.s - x.s).forEach(r => { if (tops.length < 3 && r.s >= 35 && !tops.some(q => Math.abs(q.o.ms - r.o.ms) < 4 * 3600e3)) tops.push(r); });
  const sel = S.fishSel != null && R[S.fishSel] ? R[S.fishSel] : R[bestK];
  const lab = r => `${r.o.t.startsWith(w.current.time.slice(0, 10)) ? 'hoy' : lblD(r.o.t)} a las ${r.o.t.slice(11, 13)} h`;
  $('#fishBest').innerHTML = `<div class="fbest"><div class="sc" style="background:${scCol(R[0].s)}"><div><b>${R[0].s}</b><small>ahora</small></div></div><div><h3>${FMODES.find(f => f.k === mode).l}</h3><p>${tops.length ? 'Mejores momentos: ' + tops.map(r => `<b style="color:var(--ink)">${lab(r)}</b> (${r.s})`).join(', ') : 'No hay buenos momentos en las próximas 72 h.'}</p></div></div>`;
  setChart('fishChart', {type: 'bar', data: {labels: R.map(r => lblH(r.o.t)), datasets: [{label: 'Nota de pesca', data: R.map(r => r.s), backgroundColor: R.map(r => scCol(r.s)), borderRadius: 2, categoryPercentage: 1, barPercentage: .9}]},
    options: {plugins: {legend: {display: false}}, onClick: (e, els) => { if (els.length) { S.fishSel = els[0].index; renderFish(); } }, scales: {x: {ticks: xTicks(), grid: {display: false}}, y: {min: 0, max: 100}}}});
  $('#fishWhen').textContent = `Para ${lab(sel)} · nota ${sel.s}. Toca una barra de la gráfica para ver otra hora.`;
  $('#fishFactors').innerHTML = sel.F.map(([k, v, why]) => `<div class="fac"><span>${k}</span><div class="b"><i style="width:${Math.round(v * 100)}%;background:${scCol(v * 100)}"></i></div><span>${Math.round(v * 100)}</span><em>${esc(why)}</em></div>`).join('');
  const tips = [];
  if (mode === 'surf') tips.push(sel.wv >= 0.5 && sel.wv <= 1.5 ? '<b>Mar con movimiento:</b> busca la segunda rompiente y los canales entre bancos de arena; la lubina y la dorada entran a comer.' : sel.wv > 1.5 ? '<b>Mar grande:</b> plomos de garra y lances largos; mejor en playas abrigadas.' : '<b>Mar en calma:</b> agua clara; aleja el lance, baja el grosor del bajo de línea y prueba de noche.');
  if (mode === 'roca') tips.push('<b>Spinning:</b> las primeras y últimas luces con espuma en las piedras son lo mejor para la lubina. Ojo con el oleaje en zonas de roca.');
  if (mode === 'barco') tips.push(sel.ws > 15 ? '<b>Precaución:</b> viento por encima de 15 km/h; consulta los avisos de Salvamento Marítimo y AEMET antes de salir.' : '<b>Buen día de barco</b> si el oleaje se mantiene bajo; aprovecha los repuntes para fondear en piedra.');
  if (mode === 'sub') tips.push('<b>Pesca submarina:</b> solo de día, con boya y acompañado. Necesita mar en calma y agua clara; la visibilidad mejora en los repuntes de marea.');
  tips.push('Comprueba siempre la normativa: licencia de pesca recreativa de tu comunidad, tallas mínimas y zonas protegidas.');
  $('#fishTips').innerHTML = tips.join('<br><br>');
  // calendario solunar
  $('#solTable').innerHTML = `<thead><tr><th>Día</th><th>Luna</th><th>Mayor 1</th><th>Mayor 2</th><th>Salida luna</th><th>Puesta luna</th><th>Pleamares</th><th>Bajamares</th><th>Alba / ocaso</th></tr></thead><tbody>${sol.filter(s => s.day >= w.current.time.slice(0, 10)).map(s => {
    const e = ex.filter(x => x.t.startsWith(s.day)), q = D.time.indexOf(s.day), mj = s.major.slice().sort((a, b) => a - b);
    return `<tr><td>${lblD(s.day)}</td><td>${MOON(s.phase)} · ${num(s.frac * 100)} %</td><td>${fmtT(mj[0], off)}</td><td>${fmtT(mj[1], off)}</td><td>${fmtT(s.rise, off)}</td><td>${fmtT(s.set, off)}</td><td>${e.filter(x => x.hi).map(x => hhmm(x.t)).join(' · ')}</td><td>${e.filter(x => !x.hi).map(x => hhmm(x.t)).join(' · ')}</td><td>${D.sunrise[q]?.slice(11, 16)} / ${D.sunset[q]?.slice(11, 16)}</td></tr>`;
  }).join('')}</tbody>`;
}
$('#beachChips').addEventListener('click', e => { const bt = e.target.closest('[data-b]'); if (!bt) return; const L = JSON.parse($('#beachChips').dataset.list || '[]'); setBeach(L[+bt.dataset.b]); });
$('#fishMode').addEventListener('click', e => { const bt = e.target.closest('[data-f]'); if (!bt) return; S.fishMode = bt.dataset.f; S.fishSel = null; store.set('atm.fish', S.fishMode); renderFishModes(); renderFish(); });
let beachT;
async function beachSearch(q) {
  if (q.trim().length < 2) { $('#beachRes').innerHTML = ''; return; }
  try {
    const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=es&format=json`);
    beachRes = j.results || [];
    $('#beachRes').innerHTML = beachRes.length ? beachRes.map((r, i) => `<li><button class="go" data-br="${i}">${esc(r.name)} <small>${esc([r.admin2, r.admin1, r.country].filter(Boolean).join(', '))}</small></button></li>`).join('') : '<li class="note" style="padding:10px 0">Sin resultados. Prueba con el pueblo o elige en el mapa.</li>';
  } catch (e) { $('#beachRes').innerHTML = `<li class="err">${esc(e.message)}</li>`; }
}
$('#beachQ').addEventListener('input', e => { clearTimeout(beachT); beachT = setTimeout(() => beachSearch(e.target.value), 300); });
$('#beachForm').addEventListener('submit', e => { e.preventDefault(); beachSearch($('#beachQ').value); });
$('#beachRes').addEventListener('click', e => { const bt = e.target.closest('[data-br]'); if (!bt) return; const r = beachRes[+bt.dataset.br]; $('#beachQ').value = ''; setBeach({name: r.name, lat: r.latitude, lon: r.longitude}); });
$('#beachMapBtn').onclick = () => {
  const wrap = $('#beachMapWrap'); wrap.hidden = !wrap.hidden; if (wrap.hidden) return;
  const ll = S.beach ? [S.beach.lat, S.beach.lon] : [36.6, -6.3];
  if (!beachMap) {
    beachMap = L.map('beachMap', {scrollWheelZoom: false}).setView(ll, 9);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom: 17, attribution: '© Esri'}).addTo(beachMap);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {maxZoom: 17}).addTo(beachMap);
    beachMk = L.circleMarker(ll, {radius: 8, color: '#0b1433', weight: 2, fillColor: '#f7e463', fillOpacity: 1}).addTo(beachMap);
    beachMap.on('click', e => setBeach({name: `Punto ${num(e.latlng.lat, 3)}, ${num(e.latlng.lng, 3)}`, lat: e.latlng.lat, lon: e.latlng.lng}));
  } else { setTimeout(() => beachMap.invalidateSize(), 50); beachMap.setView(ll); }
};

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
const VIEWS = ['ahora', 'modelos', 'mapas', 'mar', 'clima', 'visores'];
function route(force) {
  if (location.hash === '#dia') return;
  if ($('#dayView').classList.contains('on')) closeDay();
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'ahora';
  VIEWS.forEach(x => $('#v-' + x).classList.toggle('on', x === v));
  document.querySelectorAll('nav.tabs a').forEach(a => a.toggleAttribute('aria-current', false) || (a.getAttribute('href') === '#' + v && a.setAttribute('aria-current', 'page')));
  if (!force && S.cur === v && S.loaded[v]) return;
  S.cur = v;
  if (S.loaded[v]) { if (v === 'ahora' && nowMap) setTimeout(() => nowMap.invalidateSize(), 50); return; }
  S.loaded[v] = true;
  if (v === 'ahora') loadNow();
  if (v === 'modelos') { loadModels(); loadEnsemble(); }
  if (v === 'mapas') { renderWindy(); renderWx(); }
  if (v === 'mar') loadSea();
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
$('#nowPlay').onclick = () => nowPlay(!nowTimer);
const toggleKv = () => { const k = $('#nowKv'); k.hidden = !k.hidden; $('#nowBox').setAttribute('aria-expanded', String(!k.hidden)); const b = $('#nowBox .more-btn'); if (b) b.firstChild.textContent = k.hidden ? 'Ver todos los datos del momento ' : 'Ocultar datos '; };
$('#nowBox').addEventListener('click', e => { if (e.target.closest('a,button,input')) return; toggleKv(); });
$('#nowBox').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleKv(); } });
$('#wOverlay').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; S.wOv = b.dataset.w; renderWindy(); });
$('#wProd').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; S.wProd = b.dataset.p; renderWindy(); });
/* nombre de la persona usuaria */
function askName() { $('#nameIn').value = store.get('atm.user', ''); $('#nameSheet').classList.add('on'); setTimeout(() => $('#nameIn').focus(), 80); }
function saveName(v) { store.set('atm.user', (v || '').trim().slice(0, 30)); store.set('atm.asked', true); $('#nameSheet').classList.remove('on'); if (S.lastNow) renderNow(S.lastNow); }
$('#nameOk').onclick = () => saveName($('#nameIn').value);
$('#nameForm').addEventListener('submit', e => { e.preventDefault(); saveName($('#nameIn').value); });
$('#nameSkip').onclick = () => { store.set('atm.asked', true); $('#nameSheet').classList.remove('on'); };
$('#hello').addEventListener('click', askName);
/* ---------- introducción y bienvenida ---------- */
const STR = ['#08519c','#2171b5','#4292c6','#6baed6','#9ecae1','#c6dbef','#fee0d2','#fcbba1','#fc9272','#fb6a4a','#ef3b2c','#cb181d'];
const ILL = {
  hola: `<svg class="ill" viewBox="0 0 300 300"><defs><clipPath id="sky"><rect x="0" y="0" width="300" height="172"/></clipPath></defs><g clip-path="url(#sky)"><g class="spin">${Array.from({length: 12}, (_, i) => `<rect x="146" y="20" width="8" height="34" rx="4" fill="#f7e463" transform="rotate(${i * 30} 150 150)"/>`).join('')}</g><circle cx="150" cy="150" r="70" fill="#f7e463"/></g><g transform="translate(0 175)">${STR.map((c, i) => `<rect class="grow" style="animation-delay:${i * 80}ms" x="${30 + i * 20}" y="0" width="20" height="90" fill="${c}"/>`).join('')}</g><rect x="30" y="172" width="240" height="6" fill="#0b1433"/></svg>`,
  ahora: `<svg class="ill" viewBox="0 0 300 300"><g class="float"><path d="M70 150h150a40 40 0 0 0 0-80 60 60 0 0 0-112-14 44 44 0 0 0-38 94z" fill="#dfe5ff"/></g>${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect class="grow" style="animation-delay:${i * 120}ms" x="${62 + i * 26}" y="${270 - [20, 45, 80, 60, 95, 40, 25][i]}" width="16" height="${[20, 45, 80, 60, 95, 40, 25][i]}" rx="4" fill="#4fc1c6"/>`).join('')}<text x="150" y="128" text-anchor="middle" font-family="Red Hat Display" font-weight="800" font-size="46" fill="#0b1433">18°</text></svg>`,
  modelos: `<svg class="ill" viewBox="0 0 300 300"><rect x="30" y="40" width="240" height="220" rx="22" fill="rgba(255,255,255,.05)"/>${[['#f7e463', 'M45 200 C90 120 130 170 170 110 S240 90 255 70'], ['#e8452c', 'M45 210 C95 140 135 180 175 130 S240 110 255 95'], ['#4fc1c6', 'M45 190 C85 150 140 150 175 120 S235 120 255 110'], ['#8ea2ff', 'M45 220 C90 170 130 200 170 150 S235 140 255 130']].map(([c, d], i) => `<path class="draw" style="animation-delay:${i * 250}ms" d="${d}" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`).join('')}</svg>`,
  mapas: `<svg class="ill" viewBox="0 0 300 300"><circle cx="150" cy="150" r="120" fill="#13306b"/><path d="M80 120c30-30 70-20 90-40s50 10 55 40-25 45-15 75-40 40-70 25-60-10-70-45 0-40 10-55z" fill="#2f6b4f"/><circle cx="150" cy="150" r="120" fill="none" stroke="#4fc1c6" stroke-opacity=".5"/><circle cx="150" cy="150" r="80" fill="none" stroke="#4fc1c6" stroke-opacity=".35"/><circle cx="150" cy="150" r="40" fill="none" stroke="#4fc1c6" stroke-opacity=".25"/><g class="sweep"><path d="M150 150L150 30A120 120 0 0 1 254 90z" fill="url(#sw)"/></g><defs><linearGradient id="sw" x1="0" x2="1"><stop offset="0" stop-color="#4fc1c6" stop-opacity="0"/><stop offset="1" stop-color="#4fc1c6" stop-opacity=".6"/></linearGradient></defs><circle class="pulse" cx="185" cy="115" r="16" fill="#f7e463"/><circle class="pulse" style="animation-delay:1.2s" cx="120" cy="185" r="12" fill="#e8452c"/><circle cx="150" cy="150" r="7" fill="#f7e463" stroke="#0b1433" stroke-width="3"/></svg>`,
  clima: `<svg class="ill" viewBox="0 0 300 300">${Array.from({length: 24}, (_, i) => { const k = Math.min(11, Math.max(0, Math.round(i / 2 + Math.sin(i * 1.7) * 1.5))); return `<rect class="grow" style="animation-delay:${i * 45}ms" x="${30 + i * 10}" y="50" width="10" height="200" fill="${STR[k]}"/>`; }).join('')}<path class="draw" d="M30 210 C80 205 120 190 160 160 S240 90 270 70" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  listo: `<svg class="ill" viewBox="0 0 300 300"><circle class="pulse" cx="150" cy="150" r="90" fill="#4fc1c6"/><circle cx="150" cy="150" r="90" fill="#f7e463"/><path d="M110 152l28 28 54-60" fill="none" stroke="#0b1433" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};
const SLIDES = [
  {k: 'hola', tag: 'PREDICCIÓN Y CLIMA EN TU BOLSILLO', h: 'Hola, te damos la bienvenida a Atmos', p: 'Antes de empezar, ¿cómo te llamas? Solo lo usaremos para saludarte, y se queda en este móvil.', name: true},
  {k: 'ahora', tag: 'AHORA', h: 'El tiempo, en este momento', p: 'Toca el recuadro grande para ver todos los datos del momento. Aviso de lluvia, radar en directo, 16 días hora a hora y si es buen momento para correr, sembrar, tender la ropa o ir de terraza.'},
  {k: 'modelos', tag: 'MODELOS', h: 'Compara los mejores modelos', p: 'ECMWF y su versión con inteligencia artificial, ICON, GFS, AROME, Met Office… y sus conjuntos, para saber cuánta confianza merece la previsión.'},
  {k: 'mapas', tag: 'MAPAS', h: 'Los mapas de los modelos', p: 'Windy animado con su meteograma y WXCharts con todos sus mapas, para ver de un vistazo lo que llega.'},
  {k: 'clima', tag: 'CLIMA', h: 'El clima de tu lugar desde 1940', p: 'Franjas de calentamiento, anomalías, climograma y proyecciones hasta 2050, con datos de Copernicus.'},
  {k: 'listo', tag: 'TODO LISTO', h: '¡A disfrutarlo!', p: 'Cambia tu ubicación arriba a la derecha y explora las pestañas de abajo. En «Visores» tienes más de 20 webs especializadas.', last: true}
];
let introIdx = 0;
function renderIntro() {
  const nm = store.get('atm.user', '');
  $('#slides').innerHTML = SLIDES.map((s, i) => `<section class="slide" aria-roledescription="diapositiva" aria-label="${i + 1} de ${SLIDES.length}">${ILL[s.k]}<div class="tag">${s.tag}</div><h1 ${s.last ? 'id="introLastH"' : ''}>${s.last && nm ? `¡A disfrutarlo, ${esc(nm)}!` : s.h}</h1><p>${s.p}</p>${s.name ? `<input id="introName" type="text" maxlength="30" placeholder="Tu nombre" autocomplete="given-name" enterkeyhint="next" value="${esc(nm)}">` : ''}${s.last || s.name ? '<div class="by">Elaborada por <b>Javier Cortés López</b></div>' : ''}</section>`).join('');
  $('#dots').innerHTML = SLIDES.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('');
  introIdx = 0; setIntroBtn();
  $('#introName').addEventListener('input', e => { const v = e.target.value.trim(); $('#introLastH').textContent = v ? `¡A disfrutarlo, ${v}!` : '¡A disfrutarlo!'; });
  $('#introName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); goIntro(1); } });
}
function setIntroBtn() { $('#introNext').textContent = introIdx === SLIDES.length - 1 ? 'Empezar' : 'Siguiente'; $('#dots').querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === introIdx)); }
function goIntro(i) { const sl = $('#slides'); sl.scrollTo({left: i * sl.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth'}); }
function finishIntro() {
  const v = ($('#introName')?.value || '').trim();
  if (v) store.set('atm.user', v.slice(0, 30));
  store.set('atm.asked', true); store.set('atm.introDone', true);
  $('#intro').classList.remove('on'); document.body.style.overflow = '';
  if (S.lastNow) renderNow(S.lastNow);
  setTimeout(() => nowMap && nowMap.invalidateSize(), 60);
}
function showIntro() { renderIntro(); $('#intro').classList.add('on'); document.body.style.overflow = 'hidden'; $('#slides').scrollLeft = 0; }
$('#slides').addEventListener('scroll', () => { const sl = $('#slides'); const i = Math.round(sl.scrollLeft / sl.clientWidth); if (i !== introIdx) { introIdx = i; setIntroBtn(); if (i > 0) $('#introName')?.blur(); } }, {passive: true});
$('#introNext').onclick = () => introIdx >= SLIDES.length - 1 ? finishIntro() : goIntro(introIdx + 1);
$('#introSkip').onclick = finishIntro;
$('#replayIntro').onclick = showIntro;
addEventListener('keydown', e => { if (!$('#intro').classList.contains('on')) return; if (e.key === 'ArrowRight') goIntro(Math.min(SLIDES.length - 1, introIdx + 1)); if (e.key === 'ArrowLeft') goIntro(Math.max(0, introIdx - 1)); });
function showSplash() {
  const hr = new Date().getHours(), nm = store.get('atm.user', '');
  const sal = hr >= 6 && hr < 14 ? 'Buenos días' : hr >= 14 && hr < 21 ? 'Buenas tardes' : 'Buenas noches';
  $('#spHi').textContent = sal + (nm ? ', ' + nm : '');
  const sp = $('#splash'); sp.classList.add('on');
  setTimeout(() => sp.classList.add('out'), 1300);
  setTimeout(() => { sp.classList.remove('on', 'out'); }, 1850);
}
if (!store.get('atm.introDone', false)) showIntro(); else showSplash();
addEventListener('hashchange', () => route(false));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.cur === 'ahora') loadNow(); });
if (location.hash === '#dia') history.replaceState(null, '', '#ahora');
route(true);

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
