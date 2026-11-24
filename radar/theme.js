// ads-daily layout for Competitor Ad Radar: move the clinic finder + ad filters into a left sidebar,
// stats/ranking/cards into the right column. Only moves nodes (ids stay), so the radar's own script keeps working.
(() => {
  const $ = s => document.querySelector(s);
  const shell = document.createElement('div'), side = document.createElement('aside'), content = document.createElement('div');
  shell.className = 'rd-shell'; side.className = 'rd-side'; side.setAttribute('aria-label', 'ตัวกรอง'); content.className = 'rd-content';
  const hero = $('.hero'), near = $('.nearby-wrap'), filters = $('.filters'), main = $('main');
  if (!hero || !near || !filters || !main) return;   // radar markup changed: leave the original layout alone
  hero.before(shell);
  side.append(near, filters);
  content.append(hero, main);
  shell.append(side, content);
})();

// "คลินิกที่ดูแล": one dropdown grouped by owner (พี่ดิน / พี่ใหม่) instead of a wall of chips.
// The radar's own chips stay in the DOM (hidden) and do the work: picking an option clicks the matching chip,
// which runs the radar's nearby search with the usual radius + program rules. Runs after the radar's own scripts.
document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('nb-managed'), list = document.getElementById('nb-managed-list');
  let clinics = [];
  try { clinics = JSON.parse(document.getElementById('dataset').textContent).myClinics || []; } catch { return; }
  if (!box || !list || !clinics.length) return;
  let me = 'ดิน'; try { me = localStorage.getItem('ads-daily-owner') || me; } catch {}
  const owners = [...new Set(clinics.map(c => c.owner || 'ดิน'))].sort((a, b) => (b === me) - (a === me));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const sel = document.createElement('select');
  sel.id = 'rd-clinic'; sel.setAttribute('aria-labelledby', 'nb-managed-label');
  sel.innerHTML = '<option value="">เลือกคลินิกเพื่อดูคู่แข่งรอบๆ…</option>' + owners.map(o =>
    `<optgroup label="พี่${esc(o)}">${clinics.map((c, i) => (c.owner || 'ดิน') === o ? `<option value="${i}" title="${esc(c.label)}">${esc(c.name)}</option>` : '').join('')}</optgroup>`).join('');
  list.hidden = true; list.after(sel);
  sel.addEventListener('change', () => { if (sel.value !== '') list.querySelector(`button[data-managed="${sel.value}"]`)?.click(); });
  // keep the dropdown in step when the radar clears or changes the nearby filter
  new MutationObserver(() => { sel.value = list.querySelector('button[aria-pressed="true"]')?.dataset.managed ?? ''; })
    .observe(list, {childList: true, subtree: true, attributes: true});
});

// Sub-pages: one section at a time instead of one long page with a tall side column.
//   สื่อที่ควรทำ (Media Ranking + โจทย์) · คู่แข่งหลัก (top pages + long-running ads) · การ์ดแอด · วิธีคิดคะแนน
// Elements are only moved/wrapped, never recreated, so the radar's script (by id) keeps working.
document.addEventListener('DOMContentLoaded', () => {
  const $ = s => document.querySelector(s), main = $('main');
  const rank = $('#ranking'), watch = $('aside.watch'), results = $('#results'), scoring = $('#scoring');
  if (!main || !rank || !watch || !results || !scoring) return;
  const pane = (id, ...nodes) => { const d = document.createElement('section'); d.className = 'rd-pane'; d.dataset.pane = id; d.append(...nodes); return d; };

  // คู่แข่งหลัก: two columns (top pages | long-running ads) under the short how-to
  const [h4a, h4b] = watch.querySelectorAll('h4'), keepNote = h4b?.nextElementSibling;
  const colA = document.createElement('div'), colB = document.createElement('div');
  colA.className = colB.className = 'rd-col';
  colA.append(h4a, $('#top-pages')); colB.append(h4b, keepNote, $('#top-ads'));
  const cols = document.createElement('div'); cols.className = 'rd-cols'; cols.append(colA, colB);
  watch.append(cols);

  // การ์ดแอด: everything from the results header to the footnote
  const cardNodes = []; for (let n = results; n && n !== scoring; n = n.nextElementSibling) cardNodes.push(n);
  const P = { rank: pane('rank', rank), watch: pane('watch', watch), cards: pane('cards', ...cardNodes), scoring: pane('scoring', scoring) };
  const TABS = [['rank', 'สื่อที่ควรทำ'], ['watch', 'คู่แข่งหลัก'], ['cards', 'การ์ดแอด'], ['scoring', 'วิธีคิดคะแนน']];
  const bar = document.createElement('nav'); bar.className = 'rd-tabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'หน้าในคลังสื่อ');
  bar.innerHTML = TABS.map(([id, l], i) => `<button role="tab" data-tab="${id}" aria-controls="rd-${id}">${l}<kbd>${i + 1}</kbd></button>`).join('');
  const near = $('#near-active');
  (near || main.firstChild).after(bar);
  bar.after(...Object.values(P));
  Object.entries(P).forEach(([id, el]) => { el.id = 'rd-' + id; el.setAttribute('role', 'tabpanel'); });

  const show = id => {
    for (const [k, el] of Object.entries(P)) el.classList.toggle('on', k === id);
    for (const b of bar.children) b.setAttribute('aria-selected', b.dataset.tab === id);
    try { sessionStorage.setItem('rd-tab', id); } catch {}
  };
  bar.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { show(b.dataset.tab); scrollTo({top: 0}); } });
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    const t = TABS[+e.key - 1]; if (t) show(t[0]);
  });
  // the radar's own jumps ("กดชื่อสื่อเพื่อดูแอดตัวอย่าง", "ดูวิธีคิดคะแนน") land on the right sub-page
  document.addEventListener('click', e => {
    if (e.target.closest('#to-scoring')) return show('scoring');
    if (e.target.closest('.why')) return;
    if (e.target.closest('.media, .page-btn, [data-promo]')) setTimeout(() => show('cards'));
  }, true);
  let first = 'rank'; try { first = sessionStorage.getItem('rd-tab') || first; } catch {}
  show(P[first] ? first : 'rank');
});

// Funnel triangle (left) + detail of the picked stage (right) on "สื่อที่ควรทำ", and a shorter filter panel.
// Reads the radar's own rendered rows (#funnel-body tr, #briefs li, #grid cards) and re-applies after every re-render.
document.addEventListener('DOMContentLoaded', () => {
  const $ = s => document.querySelector(s), byId = id => document.getElementById(id);
  const rankMain = $('.rank-main'), body = byId('funnel-body'), briefs = byId('briefs'), grid = byId('grid'), stageSel = byId('stage');
  if (!rankMain || !body || !briefs || !grid || !stageSel) return;
  const STAGES = [['aware', 'รู้จัก', 'ให้คนในพื้นที่รู้ว่ามีร้านนี้'], ['interest', 'สนใจ', 'ให้เชื่อว่าทำได้จริง'], ['decide', 'ตัดสินใจ', 'ให้ทักหรือจองตอนนี้']];
  let pick = 0; try { pick = +sessionStorage.getItem('rd-stage') || 0; } catch {}

  // left: the triangle, one clickable layer per stage
  const funnel = document.createElement('div');
  funnel.className = 'rd-funnel'; funnel.setAttribute('role', 'tablist'); funnel.setAttribute('aria-label', 'ขั้น Funnel');
  funnel.innerHTML = STAGES.map(([k, l, g], i) =>
    `<button type="button" role="tab" class="rd-layer l${i}" data-i="${i}"><b>${l}</b><small>${g}</small></button>`).join('') +
    '<p class="rd-funnel-note">กดชั้นเพื่อดูสื่อที่ควรทำและแอดคู่แข่งของขั้นนั้น</p>';
  // right: stage title, top-3 media (the radar's row), brief, sample ads
  const detail = document.createElement('div'); detail.className = 'rd-detail';
  const head = document.createElement('div'); head.className = 'rd-stage-head';
  const samples = document.createElement('div'); samples.className = 'rd-samples';
  detail.append(head, ...[...rankMain.children]); rankMain.append(funnel, detail);
  byId('briefs').closest('.briefs')?.after(samples);

  function apply(){
    const [key, label, goal] = STAGES[pick];
    funnel.querySelectorAll('.rd-layer').forEach((b, i) => { b.setAttribute('aria-selected', i === pick); b.classList.toggle('on', i === pick); });
    head.innerHTML = `<h3>${label}</h3><p>${goal}</p><span class="rd-sub">สื่อ 3 อันดับที่คู่แข่งยิงได้ผลในขั้นนี้</span>`;
    [...body.rows].forEach((tr, i) => tr.hidden = i !== pick);
    [...briefs.children].forEach(li => li.hidden = !li.textContent.trim().startsWith(label));
    // sample ads: the best-scoring cards of this stage that the radar has rendered (clones; links still work)
    const cards = [...grid.querySelectorAll(':scope > .card')].filter(c => [...c.querySelectorAll('.chip.stage')].some(x => x.textContent.trim() === label)).slice(0, 6);
    samples.innerHTML = `<div class="rd-samples-h"><h3>ตัวอย่างแอดคู่แข่ง · ${label}</h3><button type="button" class="rd-all" data-stage="${key}">ดูทั้งหมดในการ์ดแอด</button></div>`;
    const g = document.createElement('div'); g.className = 'grid';
    cards.forEach(c => g.append(c.cloneNode(true)));
    samples.append(cards.length ? g : Object.assign(document.createElement('p'), {className: 'none', textContent: 'ยังไม่มีแอดของขั้นนี้ในชุดที่แสดง กด "ดูทั้งหมด" เพื่อค้นทั้งคลัง'}));
  }
  funnel.addEventListener('click', e => { const b = e.target.closest('.rd-layer'); if (!b) return; pick = +b.dataset.i; try { sessionStorage.setItem('rd-stage', pick); } catch {} apply(); });
  let ours = false;  // stage filter set by "ดูทั้งหมด": cleared again when going back to the funnel
  samples.addEventListener('click', e => {
    const b = e.target.closest('.rd-all'); if (!b) return;
    stageSel.value = b.dataset.stage; stageSel.dispatchEvent(new Event('change', {bubbles: true})); ours = true;
    document.querySelector('[data-tab="cards"]')?.click();
  });
  document.addEventListener('click', e => {
    if (ours && e.target.closest('[data-tab="rank"]')) { ours = false; stageSel.value = ''; stageSel.dispatchEvent(new Event('change', {bubbles: true})); }
  });
  let t; const later = () => { clearTimeout(t); t = setTimeout(apply, 30); };
  new MutationObserver(later).observe(body, {childList: true});
  new MutationObserver(later).observe(grid, {childList: true});
  apply();

  // filter panel: หมวดหัตถการ + โปรแกรม stay; the rest folds under "ตัวกรองเพิ่มเติม"; stage is the funnel now
  const inner = $('.filter-inner'); if (!inner) return;
  const field = id => byId(id)?.closest('.field');
  field('stage')?.setAttribute('hidden', '');
  const more = document.createElement('details'); more.className = 'rd-more';
  more.innerHTML = '<summary>ตัวกรองเพิ่มเติม</summary><div class="rd-more-in"></div>';
  ['format', 'angle', 'promo', 'combo', 'status', 'sort', 'query'].forEach(id => { const f = field(id); if (f) more.lastChild.append(f); });
  const reset = byId('reset'); reset ? reset.before(more) : inner.append(more);
  // open it when something inside is already set, so a hidden filter is never silently active
  const busy = () => [...more.querySelectorAll('select,input')].some(x => x.id !== 'sort' && x.value);
  more.open = busy(); more.addEventListener('change', () => { if (busy()) more.open = true; });
});
