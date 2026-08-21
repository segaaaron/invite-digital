(function(){
'use strict';

var STORE_KEY = 'vh_dashboard_state_v1';

function defaultState(){
  return {
    settings: { name:'Marcia & Ricardo', date:'2026-10-18', venue:'Hacienda Los Encinos, Cuernavaca', slug:'marciayricardo', lang:'Español', privacy:'public', password:'', currency:'BOB' },
    plan: { current:'premium', cycle:'monthly' },
    guests: [
      {id:1,name:'Ana Lucía Vega',group:'Amigas Marcia',rsvp:'ok',companions:2,diet:'—',table:3,vip:false,confirmedAt:'02 may, 14:18',phone:'+591 70011223',email:'ana.vega@gmail.com',invited:true},
      {id:2,name:'Patricia Olmos',group:'Familia Marcia',rsvp:'ok',companions:1,diet:'Vegetariano',table:1,vip:false,confirmedAt:'02 may, 13:42',phone:'+591 70022334',email:'patricia.olmos@gmail.com',invited:true},
      {id:3,name:'Daniel Mendoza',group:'Trabajo Ricardo',rsvp:'no',companions:0,diet:'—',table:null,vip:false,confirmedAt:'02 may, 10:18',phone:'+591 70033445',email:'',invited:true},
      {id:4,name:'Familia García (4)',group:'Familia Ricardo',rsvp:'pending',companions:3,diet:'—',table:null,vip:false,confirmedAt:'',phone:'',email:'familia.garcia@gmail.com',invited:false},
      {id:5,name:'Sergio Aldama',group:'Padrino',rsvp:'ok',companions:1,diet:'Sin gluten',table:1,vip:true,confirmedAt:'01 may, 22:30',phone:'+591 70044556',email:'',invited:true,partyLabel:'Sergio Aldama y señora, Valeria Ríos de Aldama',checkedIn:false},
      {id:6,name:'Roberto Núñez',group:'Amigos Ricardo',rsvp:'ok',companions:0,diet:'—',table:5,vip:false,confirmedAt:'01 may, 19:14'},
      {id:7,name:'Lucía Saavedra',group:'Madrina',rsvp:'ok',companions:2,diet:'Vegano',table:2,vip:true,confirmedAt:'01 may, 18:08'},
      {id:8,name:'Mario Torres',group:'Trabajo Marcia',rsvp:'maybe',companions:0,diet:'—',table:null,vip:false,confirmedAt:'30 abr, 11:55'},
      {id:9,name:'Carmen Ríos',group:'Familia Marcia',rsvp:'ok',companions:1,diet:'—',table:4,vip:false,confirmedAt:'29 abr, 20:01'},
      {id:10,name:'Esperanza García',group:'Madrina',rsvp:'ok',companions:0,diet:'—',table:2,vip:true,confirmedAt:'29 abr, 16:24'},
      {id:11,name:'Jorge Villalba',group:'Amigos Ricardo',rsvp:'pending',companions:1,diet:'—',table:null,vip:false,confirmedAt:''},
      {id:12,name:'Rosa Elena Díaz',group:'Familia Marcia',rsvp:'ok',companions:2,diet:'—',table:3,vip:false,confirmedAt:'28 abr, 09:12'},
      {id:13,name:'Felipe Castro',group:'Trabajo Ricardo',rsvp:'pending',companions:0,diet:'—',table:null,vip:false,confirmedAt:''},
      {id:14,name:'Marta Jiménez',group:'Familia Ricardo',rsvp:'ok',companions:1,diet:'—',table:4,vip:false,confirmedAt:'27 abr, 15:40'},
      {id:15,name:'Andrés Salgado',group:'Amigos Marcia',rsvp:'ok',companions:0,diet:'—',table:5,vip:false,confirmedAt:'26 abr, 12:05'},
      {id:16,name:'Valentina Ruiz',group:'Familia Marcia',rsvp:'pending',companions:2,diet:'—',table:null,vip:false,confirmedAt:''},
      {id:17,name:'Tomás Herrera',group:'Padrino',rsvp:'ok',companions:1,diet:'—',table:1,vip:true,confirmedAt:'25 abr, 08:50'},
      {id:18,name:'Camila Fuentes',group:'Amigas Marcia',rsvp:'ok',companions:0,diet:'—',table:3,vip:false,confirmedAt:'24 abr, 21:33'},
      {id:19,name:'Iván Contreras',group:'Trabajo Ricardo',rsvp:'no',companions:0,diet:'—',table:null,vip:false,confirmedAt:'23 abr, 17:02'},
      {id:20,name:'Renata Vidal',group:'Familia Marcia',rsvp:'pending',companions:0,diet:'—',table:null,vip:false,confirmedAt:''}
    ],
    nextGuestId: 21,
    tables: [
      {id:1,label:'Mesa 01',capacity:8},{id:2,label:'Mesa 02',capacity:8},{id:3,label:'Mesa 03',capacity:8},
      {id:4,label:'Mesa 04',capacity:8},{id:5,label:'Mesa 05',capacity:8},{id:6,label:'Mesa 06',capacity:8},
      {id:7,label:'Mesa 07',capacity:8},{id:8,label:'Mesa 08',capacity:8}
    ],
    nextTableId: 9,
    zones: [
      {id:1,type:'dance',label:'Pista de baile',x:35,y:32,w:30,h:34},
      {id:2,type:'bar',label:'Barra',x:78,y:30,w:16,h:12},
      {id:3,type:'stage',label:'Mesa de honor',x:33,y:6,w:34,h:10},
      {id:4,type:'music',label:'Banda / DJ',x:6,y:6,w:16,h:10},
      {id:5,type:'entrance',label:'Entrada',x:6,y:86,w:16,h:10}
    ],
    nextZoneId: 6,
    gifts: [
      {id:1,name:'Juego de sábanas premium',price:45,status:'available',by:'',store:'Liverpool',link:''},
      {id:2,name:'Cafetera espresso',price:120,status:'reserved',by:'Ana Lucía Vega',store:'Amazon',link:''},
      {id:3,name:'Set de copas de vino',price:60,status:'available',by:'',store:'Crate & Barrel',link:''},
      {id:4,name:'Vajilla de porcelana (12 piezas)',price:220,status:'purchased',by:'Sergio Aldama',store:'Liverpool',link:''},
      {id:5,name:'Robot de cocina',price:310,status:'available',by:'',store:'Amazon',link:''},
      {id:6,name:'Ropa de cama de lino',price:95,status:'reserved',by:'Carmen Ríos',store:'Zara Home',link:''},
      {id:7,name:'Set de toallas egipcias',price:70,status:'available',by:'',store:'Crate & Barrel',link:''}
    ],
    nextGiftId: 8,
    funds: [
      {id:1,name:'Luna de miel',desc:'Nuestra primera aventura como esposos, destino sorpresa.',goal:3000,contributions:[{name:'Roberto Núñez',amount:150,method:'Transferencia',msg:'¡Felicidades!',date:'01 may'},{name:'Familia García',amount:300,method:'Sobre en el evento',msg:'',date:'29 abr'}]},
      {id:2,name:'Enganche para casa',desc:'Nuestro primer hogar juntos.',goal:5000,contributions:[{name:'Lucía Saavedra',amount:200,method:'Tarjeta',msg:'Con todo el cariño',date:'27 abr'}]}
    ],
    nextFundId: 3,
    messages: [
      {id:1,name:'Ana Lucía Vega',c1:'#d4566c',c2:'#ff9d9d',text:'¡No puedo esperar a celebrar con ustedes! Confirmo con 4 personas más.',time:'HACE 2M',unread:true,favorite:false},
      {id:2,name:'Roberto Núñez',c1:'#5a705c',c2:'#8aa080',text:'Felicidades a los dos, será un honor estar ahí. ¡Los queremos mucho!',time:'HACE 18M',unread:true,favorite:false},
      {id:3,name:'Familia García',c1:'#c4a572',c2:'#e0c8a0',text:'Qué emoción, ya estamos contando los días. ¿Hay código de vestimenta?',time:'HACE 1H',unread:true,favorite:false},
      {id:4,name:'Patricia Olmos',c1:'#7c5cff',c2:'#c8b8f0',text:'Confirmado, solicito menú vegetariano para mí. ¡Nos vemos pronto!',time:'HACE 3H',unread:false,favorite:true},
      {id:5,name:'Daniel Mendoza',c1:'#a3553a',c2:'#c87555',text:'Lamentablemente no podré asistir por un viaje de trabajo. ¡Felicidades!',time:'HACE 5H',unread:false,favorite:false},
      {id:6,name:'Carmen Ríos',c1:'#1170a3',c2:'#7ab8d4',text:'Ya elegimos su regalo de la mesa, ¡esperamos que les encante!',time:'HACE 7H',unread:false,favorite:false}
    ],
    visits: 847
  };
}

function load(){
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (raw) { var parsed = JSON.parse(raw); return Object.assign(defaultState(), parsed); }
  } catch(e){}
  return defaultState();
}
var STATE = load();
if (['BOB','USD','CAD'].indexOf(STATE.settings.currency) === -1) STATE.settings.currency = 'BOB';
var POS_VERSION = 3;
if (STATE.posVersion !== POS_VERSION) {
  STATE.tables.forEach(function(tb){ delete tb.x; delete tb.y; });
  STATE.zones = defaultState().zones;
  STATE.posVersion = POS_VERSION;
}
function save(){ try { localStorage.setItem(STORE_KEY, JSON.stringify(STATE)); } catch(e){} }

function t(msg){
  var el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(function(){ el.remove(); }, 2600);
}
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

var RSVP_LABEL = { ok:'Asistirá', no:'No podrá', pending:'Pendiente', maybe:'Tal vez' };
var RSVP_ORDER = ['pending','ok','maybe','no'];

function computeStats(){
  var g = STATE.guests, total = g.length;
  var ok = g.filter(function(x){return x.rsvp==='ok';}).length;
  var no = g.filter(function(x){return x.rsvp==='no';}).length;
  var pending = g.filter(function(x){return x.rsvp==='pending';}).length;
  var maybe = g.filter(function(x){return x.rsvp==='maybe';}).length;
  function pct(n){ return total? Math.round(n/total*100) : 0; }
  return { total:total, ok:ok, no:no, pending:pending, maybe:maybe, okPct:pct(ok), noPct:pct(no), pendingPct:pct(pending), maybePct:pct(maybe) };
}

function daysUntil(dateStr){
  var target = new Date(dateStr + 'T00:00:00');
  var now = new Date('2026-08-20T00:00:00');
  return Math.round((target - now) / 86400000);
}

/* ---------------- View switching ---------------- */
function showView(view){
  document.querySelectorAll('.view').forEach(function(v){ v.hidden = (v.id !== 'view-' + view); });
  document.querySelectorAll('.nav-item[data-view]').forEach(function(n){ n.classList.toggle('active', n.dataset.view === view); });
  window.scrollTo(0,0);
}
document.querySelectorAll('.nav-item[data-view]').forEach(function(n){
  n.addEventListener('click', function(){ showView(n.dataset.view); });
});
document.querySelectorAll('[data-goto]').forEach(function(b){
  b.addEventListener('click', function(){ showView(b.dataset.goto); });
});

/* ---------------- Modals ---------------- */
function openModal(name){ document.getElementById('modal-' + name).classList.add('show'); }
function closeModal(name){ document.getElementById('modal-' + name).classList.remove('show'); }
window.DASH = window.DASH || {};
window.DASH.closeModal = closeModal;
document.querySelectorAll('[data-open-modal]').forEach(function(b){
  b.addEventListener('click', function(){
    if (b.dataset.openModal === 'guest') openGuestModal(null);
    else openModal(b.dataset.openModal);
  });
});
document.querySelectorAll('[data-close-modal]').forEach(function(b){
  b.addEventListener('click', function(){ closeModal(b.dataset.closeModal); });
});
document.querySelectorAll('.modal-overlay').forEach(function(ov){
  ov.addEventListener('click', function(e){ if (e.target === ov) ov.classList.remove('show'); });
});

/* ---------------- Guest CRUD ---------------- */
function openGuestModal(guest){
  document.getElementById('guest-modal-title').textContent = guest ? 'Editar invitado' : 'Añadir invitado';
  document.getElementById('g-id').value = guest ? guest.id : '';
  document.getElementById('g-name').value = guest ? guest.name : '';
  document.getElementById('g-group').value = guest ? guest.group : '';
  document.getElementById('g-companions').value = guest ? guest.companions : 0;
  document.getElementById('g-rsvp').value = guest ? guest.rsvp : 'pending';
  document.getElementById('g-diet').value = guest && guest.diet !== '—' ? guest.diet : '';
  document.getElementById('g-phone').value = guest ? (guest.phone||'') : '';
  document.getElementById('g-email').value = guest ? (guest.email||'') : '';
  document.getElementById('g-partylabel').value = guest ? (guest.partyLabel||'') : '';
  document.getElementById('g-vip').checked = guest ? !!guest.vip : false;
  openModal('guest');
}
document.getElementById('guest-form').addEventListener('submit', function(e){
  e.preventDefault();
  var id = document.getElementById('g-id').value;
  var data = {
    name: document.getElementById('g-name').value.trim(),
    group: document.getElementById('g-group').value.trim() || 'Sin grupo',
    companions: parseInt(document.getElementById('g-companions').value,10) || 0,
    rsvp: document.getElementById('g-rsvp').value,
    diet: document.getElementById('g-diet').value.trim() || '—',
    phone: document.getElementById('g-phone').value.trim(),
    email: document.getElementById('g-email').value.trim(),
    partyLabel: document.getElementById('g-partylabel').value.trim(),
    vip: document.getElementById('g-vip').checked
  };
  if (!data.name) return;
  if (id) {
    var g = STATE.guests.find(function(x){return x.id==id;});
    Object.assign(g, data);
    if (data.rsvp === 'ok' && !g.confirmedAt) g.confirmedAt = 'hoy';
    t('✓ INVITADO ACTUALIZADO');
  } else {
    data.id = STATE.nextGuestId++;
    data.table = null;
    data.invited = false;
    data.checkedIn = false;
    data.confirmedAt = data.rsvp === 'ok' ? 'hoy' : '';
    STATE.guests.push(data);
    t('✓ INVITADO AÑADIDO');
  }
  save(); closeModal('guest'); renderAll();
});

function cycleRsvp(id){
  var g = STATE.guests.find(function(x){return x.id===id;});
  var idx = RSVP_ORDER.indexOf(g.rsvp);
  g.rsvp = RSVP_ORDER[(idx+1) % RSVP_ORDER.length];
  if (g.rsvp === 'ok' && !g.confirmedAt) g.confirmedAt = 'hoy';
  if (g.rsvp !== 'ok') g.table = g.rsvp !== 'ok' ? g.table : g.table;
  save(); renderAll();
  t('RSVP → ' + RSVP_LABEL[g.rsvp].toUpperCase());
}
function deleteGuest(id){
  if (!confirm('¿Eliminar este invitado?')) return;
  STATE.guests = STATE.guests.filter(function(x){return x.id!==id;});
  save(); renderAll();
  t('✓ INVITADO ELIMINADO');
}

var guestFilter = 'all', guestSearch = '', guestPage = 1, GUEST_PAGE_SIZE = 10;
function filteredGuests(){
  return STATE.guests.filter(function(g){
    var matchesFilter = guestFilter === 'all' || (guestFilter === 'vip' ? g.vip : g.rsvp === guestFilter);
    var q = guestSearch.toLowerCase();
    var matchesSearch = !q || g.name.toLowerCase().indexOf(q) > -1 || g.group.toLowerCase().indexOf(q) > -1;
    return matchesFilter && matchesSearch;
  });
}

function guestRowHtml(g, withActions){
  var pill = '<button class="pill ' + g.rsvp + '" onclick="DASH.cycleRsvp(' + g.id + ')">' + RSVP_LABEL[g.rsvp] + '</button>';
  var vip = g.vip ? '<span class="vip-star">★</span>' : '';
  var tableLbl = g.table ? 'Mesa ' + String(g.table).padStart(2,'0') : '—';
  var row = '<tr><td>' + esc(g.name) + vip + '</td><td>' + esc(g.group) + '</td><td>' + pill + '</td><td>' + (g.companions||'—') + '</td>';
  if (withActions) {
    row += '<td>' + esc(g.diet) + '</td><td>' + tableLbl + '</td><td><span class="pill ' + (g.invited?'sent':'notsent') + '">' + (g.invited?'Enviado':'Pendiente') + '</span></td><td>' + (g.confirmedAt||'—') + '</td>';
    row += '<td><div class="row-actions"><button class="icon-btn" title="Ver pase" onclick="DASH.openPass(' + g.id + ')">▣</button><button class="icon-btn" title="Editar" onclick="DASH.editGuest(' + g.id + ')">✎</button><button class="icon-btn" title="Eliminar" onclick="DASH.deleteGuest(' + g.id + ')">×</button></div></td>';
  } else {
    row += '<td>' + tableLbl + '</td>';
  }
  return row + '</tr>';
}
Object.assign(window.DASH, { cycleRsvp: cycleRsvp, deleteGuest: deleteGuest, editGuest: function(id){ openGuestModal(STATE.guests.find(function(x){return x.id===id;})); } });
function partyLabelFor(g){
  if (g.partyLabel) return g.partyLabel;
  return g.name + (g.companions ? ' y ' + g.companions + ' acompañante' + (g.companions>1?'s':'') : '');
}
function ensureCheckInCode(g){
  if (!g.checkInCode) g.checkInCode = 'INV-' + g.id + '-' + Math.random().toString(36).slice(2,6).toUpperCase();
  return g.checkInCode;
}

function renderGuestsView(){
  var list = filteredGuests();
  var totalPages = Math.max(1, Math.ceil(list.length / GUEST_PAGE_SIZE));
  guestPage = Math.min(guestPage, totalPages);
  var pageList = list.slice((guestPage-1)*GUEST_PAGE_SIZE, guestPage*GUEST_PAGE_SIZE);
  var body = document.getElementById('guests-body');
  body.innerHTML = pageList.length ? pageList.map(function(g){ return guestRowHtml(g, true); }).join('') : '<tr class="empty-row"><td colspan="9">Sin resultados</td></tr>';
  document.getElementById('guests-sub').textContent = STATE.guests.length + ' invitados en total · ' + list.length + ' filtrados';
  renderGuestPagination(totalPages);
}
function renderGuestPagination(totalPages){
  var el = document.getElementById('guests-pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  var html = '<button class="pg-arrow" ' + (guestPage===1?'disabled':'') + ' onclick="DASH.goGuestPage(' + (guestPage-1) + ')">‹ Anterior</button>';
  for (var i=1;i<=totalPages;i++){
    html += '<button class="' + (i===guestPage?'active':'') + '" onclick="DASH.goGuestPage(' + i + ')">' + i + '</button>';
  }
  html += '<button class="pg-arrow" ' + (guestPage===totalPages?'disabled':'') + ' onclick="DASH.goGuestPage(' + (guestPage+1) + ')">Siguiente ›</button>';
  el.innerHTML = html;
}
window.DASH.goGuestPage = function(p){ guestPage = p; renderGuestsView(); };
document.getElementById('guest-search').addEventListener('input', function(e){ guestSearch = e.target.value; guestPage = 1; renderGuestsView(); });
document.querySelectorAll('#view-invitados .filter-chip').forEach(function(c){
  c.addEventListener('click', function(){
    document.querySelectorAll('#view-invitados .filter-chip').forEach(function(x){x.classList.remove('active');});
    c.classList.add('active'); guestFilter = c.dataset.filter; guestPage = 1; renderGuestsView();
  });
});
document.getElementById('btn-export-csv').addEventListener('click', exportCsv);
document.getElementById('btn-export-summary').addEventListener('click', exportCsv);
function exportCsv(){
  var rows = [['Nombre','Grupo','RSVP','Acompañantes','Restricciones','Mesa','VIP']];
  STATE.guests.forEach(function(g){ rows.push([g.name,g.group,RSVP_LABEL[g.rsvp],g.companions,g.diet,g.table||'',g.vip?'Sí':'No']); });
  var csv = rows.map(function(r){ return r.map(function(v){ return '"' + String(v).replace(/"/g,'""') + '"'; }).join(','); }).join('\n');
  var blob = new Blob([csv], {type:'text/csv'});
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'invitados.csv'; a.click();
  t('✓ CSV EXPORTADO');
}

/* ---------------- Enviar invitaciones ---------------- */
var sendChannel = 'whatsapp';
var SEND_TEMPLATES = {
  whatsapp: 'Hola {nombre}! 💍 Nos encantaría contar con tu presencia en nuestra boda. Aquí tienes todos los detalles y el RSVP: https://invita.online/{slug}',
  email: 'Hola {nombre}, con mucho cariño te invitamos a celebrar nuestra boda. Encuentra todos los detalles y confirma tu asistencia aquí: https://invita.online/{slug}',
  sms: '{nombre}, te invitamos a nuestra boda. Detalles y RSVP: https://invita.online/{slug}',
  link: 'Comparte este enlace con {nombre}: https://invita.online/{slug}'
};
function fillTemplate(str, g){ return str.replace('{nombre}', g.name.split(' ')[0]).replace('{slug}', STATE.settings.slug); }
document.getElementById('btn-open-send').addEventListener('click', function(){
  document.getElementById('send-message').value = SEND_TEMPLATES[sendChannel];
  renderSendRecipients();
  openModal('send');
});
document.querySelectorAll('#send-channels .send-channel').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('#send-channels .send-channel').forEach(function(x){x.classList.remove('active');});
    b.classList.add('active'); sendChannel = b.dataset.channel;
    document.getElementById('send-message').value = SEND_TEMPLATES[sendChannel];
    renderSendRecipients();
  });
});
function renderSendRecipients(){
  var list = STATE.guests.filter(function(g){ return g.rsvp !== 'no'; });
  document.getElementById('send-recipients').innerHTML = list.map(function(g){
    var contact = sendChannel === 'email' ? (g.email || 'sin correo') : (g.phone || 'sin teléfono');
    var msg = fillTemplate(document.getElementById('send-message').value || SEND_TEMPLATES[sendChannel], g);
    var action;
    if (sendChannel === 'whatsapp') {
      var phone = (g.phone||'').replace(/[^0-9+]/g,'');
      action = phone ? '<a class=\"btn\" style=\"padding:6px 12px;\" target=\"_blank\" href=\"https://wa.me/' + encodeURIComponent(phone) + '?text=' + encodeURIComponent(msg) + '\" onclick=\"DASH.markSent(' + g.id + ')\">Enviar</a>' : '<span style=\"font-size:11px; opacity:0.45;\">agrega su WhatsApp</span>';
    } else if (sendChannel === 'email') {
      action = g.email ? '<a class=\"btn\" style=\"padding:6px 12px;\" target=\"_blank\" href=\"mailto:' + encodeURIComponent(g.email) + '?subject=' + encodeURIComponent('Nuestra boda — ' + STATE.settings.name) + '&body=' + encodeURIComponent(msg) + '\" onclick=\"DASH.markSent(' + g.id + ')\">Enviar</a>' : '<span style=\"font-size:11px; opacity:0.45;\">agrega su correo</span>';
    } else if (sendChannel === 'sms') {
      var phone2 = (g.phone||'').replace(/[^0-9+]/g,'');
      action = phone2 ? '<a class=\"btn\" style=\"padding:6px 12px;\" target=\"_blank\" href=\"sms:' + encodeURIComponent(phone2) + '?body=' + encodeURIComponent(msg) + '\" onclick=\"DASH.markSent(' + g.id + ')\">Enviar</a>' : '<span style=\"font-size:11px; opacity:0.45;\">agrega su teléfono</span>';
    } else {
      action = '<button class=\"btn\" style=\"padding:6px 12px;\" onclick=\"DASH.copyGuestLink(' + g.id + ')\">Copiar enlace</button>';
    }
    return '<div class=\"send-row\"><div class=\"sr-name\">' + esc(g.name) + '<div class=\"sr-contact\">' + esc(contact) + '</div></div>' + (g.invited ? '<span class=\"sr-sent\">✓ ENVIADO</span>' : '') + action + '</div>';
  }).join('') || '<div style=\"padding:16px; font-size:12px; opacity:0.5;\">Sin invitados para mostrar.</div>';
}
document.getElementById('send-message').addEventListener('input', renderSendRecipients);
window.DASH.markSent = function(id){
  var g = STATE.guests.find(function(x){return x.id===id;});
  g.invited = true; save(); renderSendRecipients(); renderGuestsView();
  t('✓ INVITACIÓN ENVIADA A ' + g.name.toUpperCase());
};
window.DASH.copyGuestLink = function(id){
  var link = 'https://invita.online/' + STATE.settings.slug;
  if (navigator.clipboard) navigator.clipboard.writeText(link).catch(function(){});
  window.DASH.markSent(id);
};
document.getElementById('btn-mark-all-sent').addEventListener('click', function(){
  STATE.guests.filter(function(g){return g.rsvp!=='no';}).forEach(function(g){ g.invited = true; });
  save(); renderSendRecipients(); renderGuestsView();
  t('✓ TODOS MARCADOS COMO ENVIADOS');
});

/* ---------------- Mesas ---------------- */
function renderTablesView(){
  var stats = computeStats();
  var totalCap = STATE.tables.reduce(function(a,tb){return a+tb.capacity;},0);
  var assigned = STATE.guests.filter(function(g){return g.table;}).length;
  document.getElementById('tables-sub').textContent = STATE.tables.length + ' mesas · capacidad ' + totalCap + ' · ' + assigned + '/' + totalCap + ' asignados';
  renderCateringReport();

  var unassigned = STATE.guests.filter(function(g){ return !g.table && g.rsvp !== 'no'; });
  document.getElementById('unassigned-list').innerHTML = unassigned.length ? unassigned.map(function(g){
    return '<span class="guest-chip">' + esc(g.name) + ' <span style="opacity:.5">(' + RSVP_LABEL[g.rsvp] + ')</span></span>';
  }).join('') : '<div class="no-guests">Todos los invitados confirmados están asignados.</div>';

  ensurePositions();
  renderFloorMap();

  document.getElementById('seat-view-cards').innerHTML = STATE.tables.map(function(tb){
    var seated = STATE.guests.filter(function(g){return g.table===tb.id;});
    var pct = Math.round(seated.length / tb.capacity * 100);
    var options = STATE.guests.filter(function(g){return !g.table && g.rsvp!=='no';});
    var shape = tb.shape || 'round';
    return '<div class="table-card tilt-card" data-tid="' + tb.id + '">'
      + '<span class="tilt-shine"></span>'
      + '<div class="th-row"><div class="tname">' + esc(tb.label) + '</div><div class="th-actions"><div class="occ">' + seated.length + '/' + tb.capacity + '</div><button class="icon-btn" title="Editar mesa" onclick="DASH.editTable(' + tb.id + ')">✎</button><button class="icon-btn" title="Eliminar mesa" onclick="DASH.deleteTable(' + tb.id + ')">×</button></div></div>'
      + (tb.notes ? '<div class="tnotes">📌 ' + esc(tb.notes) + '</div>' : '')
      + '<div class="progress"><div class="bar" style="width:' + pct + '%; background:' + (pct>=100?'#5a705c':'#c4a572') + '"></div></div>'
      + seatVisualHtml(tb, seated, shape)
      + '<div>' + (seated.length ? seated.map(function(g){ return '<span class="guest-chip">' + esc(g.name) + (g.diet&&g.diet!=='—'?' 🍽':'') + '<button onclick="DASH.unseat(' + g.id + ')">×</button></span>'; }).join('') : '<span class="no-guests">Sin invitados asignados</span>') + '</div>'
      + (options.length ? '<select onchange="if(this.value){DASH.seat(' + tb.id + ',parseInt(this.value)); this.value=\'\'}"><option value="">+ asignar invitado…</option>' + options.map(function(g){ return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; }).join('') + '</select>' : '')
      + '</div>';
  }).join('');
}
function renderCateringReport(){
  var attending = STATE.guests.filter(function(g){ return g.rsvp === 'ok'; });
  var counts = {};
  attending.forEach(function(g){
    var k = (g.diet && g.diet !== '—') ? g.diet : 'Sin restricción';
    counts[k] = (counts[k]||0) + 1;
  });
  var total = attending.length;
  var rows = Object.keys(counts).sort(function(a,b){ return a==='Sin restricción' ? 1 : b==='Sin restricción' ? -1 : counts[b]-counts[a]; }).map(function(k){
    return '<div class="funnel-row"><div class="flabel">' + esc(k) + '</div><div class="ftrack"><div class="ffill" style="width:' + Math.round(counts[k]/Math.max(1,total)*100) + '%"></div></div><div class="fval">' + counts[k] + '</div></div>';
  }).join('');
  var el = document.getElementById('catering-report');
  if (el) el.innerHTML = '<div style="font-size:11px; opacity:0.6; margin-bottom:10px;">' + total + ' comensales confirmados · para compartir con el servicio de banquetes</div>' + (rows || '<div class="no-guests">Aún sin confirmados.</div>');
}
function ensurePositions(){
  var n = STATE.tables.length;
  var cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  var rows = Math.max(1, Math.ceil(n / cols));
  var xStep = cols > 1 ? 70 / (cols - 1) : 0;
  var yStep = rows > 1 ? 46 / (rows - 1) : 0;
  STATE.tables.forEach(function(tb, i){
    if (tb.x == null || tb.y == null) {
      var col = i % cols, row = Math.floor(i / cols);
      tb.x = 15 + col * xStep;
      tb.y = 44 + row * yStep;
    }
  });
}
function renderFloorMap(){
  var map = document.getElementById('floor-map');
  map.innerHTML = '';
  STATE.zones.forEach(function(z){
    var el = document.createElement('div');
    el.className = 'zone zone-' + z.type;
    el.style.left = z.x + '%'; el.style.top = z.y + '%'; el.style.width = z.w + '%'; el.style.height = z.h + '%';
    el.innerHTML = '<span>' + esc((z.label||'').toUpperCase()) + '</span>'
      + '<div class="zone-controls"><button title="Editar" onclick="event.stopPropagation();DASH.editZone(' + z.id + ')">✎</button><button title="Eliminar" onclick="event.stopPropagation();DASH.deleteZone(' + z.id + ')">×</button></div>'
      + '<div class="zone-resize"></div>';
    bindZoneDrag(el, z);
    map.appendChild(el);
  });
  STATE.tables.forEach(function(tb){
    var seated = STATE.guests.filter(function(g){return g.table===tb.id;});
    var shape = tb.shape || 'round';
    var marker = document.createElement('div');
    marker.className = 'table-marker'; marker.dataset.tid = tb.id;
    marker.style.left = tb.x + '%'; marker.style.top = tb.y + '%';
    marker.innerHTML = seatVisualHtml(tb, seated, shape) + '<div class="tm-label">' + esc(tb.label) + '</div><div class="tm-occ">' + seated.length + '/' + tb.capacity + '</div>';
    bindDrag(marker, tb);
    map.appendChild(marker);
  });
}
function bindZoneDrag(el, z){
  el.addEventListener('pointerdown', function(e){
    if (e.target.classList.contains('zone-resize') || e.target.closest('.zone-controls')) return;
    e.preventDefault();
    var map = document.getElementById('floor-map');
    var rect = map.getBoundingClientRect();
    var startX = e.clientX, startY = e.clientY, origX = z.x, origY = z.y;
    el.setPointerCapture(e.pointerId);
    function move(ev){
      var dx = (ev.clientX - startX) / rect.width * 100, dy = (ev.clientY - startY) / rect.height * 100;
      z.x = Math.min(97 - z.w, Math.max(0, origX + dx)); z.y = Math.min(97 - z.h, Math.max(0, origY + dy));
      el.style.left = z.x + '%'; el.style.top = z.y + '%';
    }
    function up(){ el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); save(); }
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  });
  var handle = el.querySelector('.zone-resize');
  handle.addEventListener('pointerdown', function(e){
    e.preventDefault(); e.stopPropagation();
    var map = document.getElementById('floor-map');
    var rect = map.getBoundingClientRect();
    var startX = e.clientX, startY = e.clientY, origW = z.w, origH = z.h;
    handle.setPointerCapture(e.pointerId);
    function move(ev){
      var dw = (ev.clientX - startX) / rect.width * 100, dh = (ev.clientY - startY) / rect.height * 100;
      z.w = Math.min(90, Math.max(8, origW + dw)); z.h = Math.min(90, Math.max(8, origH + dh));
      el.style.width = z.w + '%'; el.style.height = z.h + '%';
    }
    function up(){ handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); save(); }
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
  });
}
var ZONE_PRESET_LABEL = { dance:'Pista de baile', bar:'Barra', stage:'Mesa de honor', music:'Banda / DJ', entrance:'Entrada', kitchen:'Cocina / servicio', photo:'Photobooth', custom:'Elemento' };
function openZoneModal(z){
  document.getElementById('zone-modal-title').textContent = z ? 'Editar elemento' : 'Añadir elemento del salón';
  document.getElementById('zn-id').value = z ? z.id : '';
  document.getElementById('zn-type').value = z ? z.type : 'dance';
  document.getElementById('zn-label').value = z ? z.label : '';
  document.getElementById('zn-label-field').style.display = (z && z.type === 'custom') ? 'block' : 'none';
  openModal('zone');
}
document.getElementById('zn-type').addEventListener('change', function(){
  document.getElementById('zn-label-field').style.display = this.value === 'custom' ? 'block' : 'none';
});
window.DASH.editZone = function(id){ openZoneModal(STATE.zones.find(function(x){return x.id===id;})); };
window.DASH.deleteZone = function(id){
  STATE.zones = STATE.zones.filter(function(x){return x.id!==id;});
  save(); renderAll();
};
document.getElementById('btn-add-zone').addEventListener('click', function(){ openZoneModal(null); });
document.getElementById('zone-form').addEventListener('submit', function(e){
  e.preventDefault();
  var id = document.getElementById('zn-id').value;
  var type = document.getElementById('zn-type').value;
  var label = type === 'custom' ? (document.getElementById('zn-label').value.trim() || 'Elemento') : ZONE_PRESET_LABEL[type];
  if (id) {
    var z = STATE.zones.find(function(x){return x.id==id;});
    z.type = type; z.label = label;
  } else {
    STATE.zones.push({id: STATE.nextZoneId++, type:type, label:label, x:35, y:40, w:20, h:14});
  }
  save(); closeModal('zone'); renderAll(); t('✓ SALÓN ACTUALIZADO');
});
function bindDrag(el, tb){
  el.addEventListener('pointerdown', function(e){
    e.preventDefault();
    var map = document.getElementById('floor-map');
    var rect = map.getBoundingClientRect();
    el.setPointerCapture(e.pointerId);
    function move(ev){
      var x = (ev.clientX - rect.left) / rect.width * 100;
      var y = (ev.clientY - rect.top) / rect.height * 100;
      x = Math.min(97, Math.max(3, x)); y = Math.min(97, Math.max(3, y));
      el.style.left = x + '%'; el.style.top = y + '%';
      tb.x = x; tb.y = y;
    }
    function up(){ el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); save(); }
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  });
}
function seatVisualHtml(tb, seated, shape){
  var n = tb.capacity, seats = '', i, x, y, guest, cls, label, title;
  if (shape === 'rect' || shape === 'imperial') {
    var topCount = Math.ceil(n/2), botCount = n - topCount;
    var margin = 12, span = 100 - 2*margin, idx = 0;
    for (i=0;i<topCount;i++){
      x = margin + (topCount > 1 ? i * (span/(topCount-1)) : span/2);
      guest = seated[idx++];
      cls = guest ? (guest.vip ? 'seat filled vip' : 'seat filled') : 'seat';
      label = guest ? esc(guest.name.charAt(0)) : (idx);
      title = guest ? esc(guest.name) + (guest.diet && guest.diet!=='—' ? ' · ' + esc(guest.diet) : '') : 'Asiento libre';
      seats += '<div class="' + cls + '" style="left:' + x + '%; top:6%; transform:translate(-50%,-50%)" title="' + title + '">' + label + '</div>';
    }
    for (i=0;i<botCount;i++){
      x = margin + (botCount > 1 ? i * (span/(botCount-1)) : span/2);
      guest = seated[idx++];
      cls = guest ? (guest.vip ? 'seat filled vip' : 'seat filled') : 'seat';
      label = guest ? esc(guest.name.charAt(0)) : (idx);
      title = guest ? esc(guest.name) + (guest.diet && guest.diet!=='—' ? ' · ' + esc(guest.diet) : '') : 'Asiento libre';
      seats += '<div class="' + cls + '" style="left:' + x + '%; top:94%; transform:translate(-50%,-50%)" title="' + title + '">' + label + '</div>';
    }
  } else {
    for (i=0;i<n;i++){
      var angle = (i / n) * 2 * Math.PI - Math.PI/2;
      var rx = shape==='sweetheart' ? 40 : 58, ry = shape==='sweetheart' ? 40 : 58;
      x = 50 + (rx/1.48) * Math.cos(angle);
      y = 50 + (ry/1.48) * Math.sin(angle);
      guest = seated[i];
      cls = guest ? (guest.vip ? 'seat filled vip' : 'seat filled') : 'seat';
      label = guest ? esc(guest.name.charAt(0)) : (i+1);
      title = guest ? esc(guest.name) + (guest.diet && guest.diet!=='—' ? ' · ' + esc(guest.diet) : '') : 'Asiento libre';
      seats += '<div class="' + cls + '" style="left:' + x + '%; top:' + y + '%; transform:translate(-50%,-50%)" title="' + title + '">' + label + '</div>';
    }
  }
  var centerLabel = shape === 'sweetheart' ? '♥' : esc(tb.label.replace('Mesa ','#'));
  return '<div class="table-visual ' + shape + '"><div class="table-disc">' + centerLabel + '</div>' + seats + '</div>';
}
window.DASH.seat = function(tableId, guestId){
  var g = STATE.guests.find(function(x){return x.id===guestId;});
  var tb = STATE.tables.find(function(x){return x.id===tableId;});
  var occ = STATE.guests.filter(function(x){return x.table===tableId;}).length;
  if (occ >= tb.capacity) {
    if (!confirm('⚠ ' + tb.label + ' ya está a su capacidad (' + occ + '/' + tb.capacity + '). ¿Asignar de todos modos?')) return;
  }
  g.table = tableId; save(); renderAll(); t('✓ INVITADO ASIGNADO A MESA');
};
window.DASH.unseat = function(guestId){
  var g = STATE.guests.find(function(x){return x.id===guestId;});
  g.table = null; save(); renderAll();
};
var SHAPE_DEFAULT_CAP = { round:8, rect:10, imperial:16, sweetheart:2 };
function openTableModal(tb){
  document.getElementById('table-modal-title').textContent = tb ? 'Editar mesa' : 'Añadir mesa';
  document.getElementById('tb-id').value = tb ? tb.id : '';
  document.getElementById('tb-label').value = tb ? tb.label : 'Mesa ' + String(STATE.nextTableId).padStart(2,'0');
  document.getElementById('tb-capacity').value = tb ? tb.capacity : 8;
  document.getElementById('tb-shape').value = tb ? (tb.shape||'round') : 'round';
  document.getElementById('tb-notes').value = tb ? (tb.notes||'') : '';
  openModal('table');
}
document.getElementById('tb-shape').addEventListener('change', function(){
  if (!document.getElementById('tb-id').value) document.getElementById('tb-capacity').value = SHAPE_DEFAULT_CAP[this.value] || 8;
});
window.DASH.editTable = function(id){ openTableModal(STATE.tables.find(function(x){return x.id===id;})); };
window.DASH.deleteTable = function(id){
  if (!confirm('¿Eliminar esta mesa? Los invitados asignados quedarán sin mesa.')) return;
  STATE.guests.forEach(function(g){ if (g.table===id) g.table = null; });
  STATE.tables = STATE.tables.filter(function(x){return x.id!==id;});
  save(); renderAll(); t('✓ MESA ELIMINADA');
};
document.getElementById('btn-add-table').addEventListener('click', function(){ openTableModal(null); });
document.getElementById('table-form').addEventListener('submit', function(e){
  e.preventDefault();
  var id = document.getElementById('tb-id').value;
  var label = document.getElementById('tb-label').value.trim();
  var capacity = Math.max(2, Math.min(20, parseInt(document.getElementById('tb-capacity').value,10) || 8));
  var shape = document.getElementById('tb-shape').value;
  var notes = document.getElementById('tb-notes').value.trim();
  if (!label) return;
  if (id) {
    var tb = STATE.tables.find(function(x){return x.id==id;});
    tb.label = label; tb.capacity = capacity; tb.shape = shape; tb.notes = notes;
    var seatedCount = STATE.guests.filter(function(g){return g.table===tb.id;});
    if (seatedCount.length > capacity) seatedCount.slice(capacity).forEach(function(g){ g.table = null; });
    t('✓ MESA ACTUALIZADA');
  } else {
    STATE.tables.push({id: STATE.nextTableId++, label:label, capacity:capacity, shape:shape, notes:notes});
    t('✓ MESA AÑADIDA');
  }
  save(); closeModal('table'); renderAll();
});

/* Seating toolbar: view toggle, finder, autofill, print */
document.querySelectorAll('[data-seatview]').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('[data-seatview]').forEach(function(x){x.classList.remove('active');});
    b.classList.add('active');
    document.getElementById('seat-view-map').hidden = b.dataset.seatview !== 'map';
    document.getElementById('seat-view-cards').hidden = b.dataset.seatview !== 'cards';
  });
});
document.getElementById('seat-finder-input').addEventListener('input', function(e){
  var q = e.target.value.trim().toLowerCase();
  var out = document.getElementById('seat-finder-result');
  document.querySelectorAll('.table-marker, .table-card').forEach(function(el){ el.classList.remove('highlight'); });
  if (!q) { out.innerHTML = ''; return; }
  var g = STATE.guests.find(function(x){ return x.name.toLowerCase().indexOf(q) > -1; });
  if (!g) { out.innerHTML = '<div class="miss">Sin coincidencias.</div>'; return; }
  if (!g.table) { out.innerHTML = '<div class="miss">' + esc(g.name) + ' aún no tiene mesa asignada.</div>'; return; }
  var tb = STATE.tables.find(function(x){return x.id===g.table;});
  out.innerHTML = '<div class="hit">' + esc(g.name) + ' → ' + esc(tb ? tb.label : '—') + '</div>';
  document.querySelectorAll('.table-marker[data-tid="' + g.table + '"], .table-card[data-tid="' + g.table + '"]').forEach(function(el){ el.classList.add('highlight'); });
});
document.getElementById('btn-autofill').addEventListener('click', function(){
  var pool = STATE.guests.filter(function(g){ return !g.table && g.rsvp !== 'no'; });
  var placed = 0;
  STATE.tables.forEach(function(tb){
    var free = tb.capacity - STATE.guests.filter(function(g){return g.table===tb.id;}).length;
    while (free > 0 && pool.length) { pool.shift().table = tb.id; free--; placed++; }
  });
  save(); renderAll();
  t(placed ? '✓ ' + placed + ' INVITADOS AUTO-ASIGNADOS' : 'NO HAY ASIENTOS DISPONIBLES');
});
document.getElementById('btn-print-plan').addEventListener('click', function(){
  var byTable = {};
  STATE.guests.filter(function(g){return g.table;}).forEach(function(g){ (byTable[g.table] = byTable[g.table]||[]).push(g); });
  var rows = STATE.tables.map(function(tb){
    var list = (byTable[tb.id]||[]).map(function(g){return g.name + (g.diet&&g.diet!=='—'?' (' + g.diet + ')':'');}).sort().join(', ') || '—';
    return '<tr><td>' + esc(tb.label) + '</td><td>' + esc(list) + '</td></tr>';
  }).join('');
  document.getElementById('print-plan').innerHTML = '<h1>Plan de mesas — ' + esc(STATE.settings.name) + '</h1><div>' + fmtDate(STATE.settings.date) + '</div><table><thead><tr><th>Mesa</th><th>Invitados</th></tr></thead><tbody>' + rows + '</tbody></table>';
  window.print();
});

/* ---------------- Regalos ---------------- */
var GIFT_LABEL = { available:'Disponible', reserved:'Reservado', purchased:'Comprado' };
var CUR_SYMBOL = { BOB:'Bs', USD:'$', CAD:'$' };
function fmtMoney(n){
  var cur = STATE.settings.currency || 'BOB';
  var sym = CUR_SYMBOL[cur];
  return sym === '$' ? (sym + Number(n).toLocaleString() + ' ' + cur) : (sym + ' ' + Number(n).toLocaleString());
}
function renderGiftsView(){
  document.getElementById('gifts-currency').value = STATE.settings.currency || 'BOB';
  var purchased = STATE.gifts.filter(function(g){return g.status==='purchased';});
  var totalItems = STATE.gifts.reduce(function(a,g){return a+g.price;},0);
  var collectedItems = purchased.reduce(function(a,g){return a+g.price;},0);
  var fundsCollected = STATE.funds.reduce(function(a,f){return a + f.contributions.reduce(function(s,c){return s+c.amount;},0);},0);
  var fundsGoal = STATE.funds.reduce(function(a,f){return a+f.goal;},0);
  document.getElementById('gifts-sub').textContent = fmtMoney(fundsCollected) + ' recaudados en fondos · ' + fmtMoney(collectedItems) + ' de ' + fmtMoney(totalItems) + ' en regalos físicos';

  document.getElementById('funds-grid').innerHTML = STATE.funds.map(function(f){
    var collected = f.contributions.reduce(function(s,c){return s+c.amount;},0);
    var pct = Math.min(100, Math.round(collected/f.goal*100));
    var rows = f.contributions.slice().reverse().map(function(c){
      return '<div class="fcontrib-row"><span class="cname">' + esc(c.name) + (c.msg ? ' — “' + esc(c.msg) + '”' : '') + '</span><span class="camt">+' + fmtMoney(c.amount) + '</span></div>';
    }).join('') || '<div style="font-size:11px; opacity:0.5; padding:8px 0;">Aún sin contribuciones.</div>';
    return '<div class="fund-card">'
      + '<div class="ftag">FONDO EN EFECTIVO</div>'
      + '<div class="fname">' + esc(f.name) + '</div>'
      + '<div class="fdesc">' + esc(f.desc||'') + '</div>'
      + '<div class="famounts"><div class="fcollected">' + fmtMoney(collected) + '</div><div class="fgoal">DE ' + fmtMoney(f.goal) + ' · ' + pct + '%</div></div>'
      + '<div class="ftrack2"><div class="ffill2" style="width:' + pct + '%"></div></div>'
      + '<div class="fcontribs">' + rows + '</div>'
      + '<div class="fcta"><button class="btn primary" onclick="DASH.openContribution(' + f.id + ')">+ Registrar contribución</button><button class="btn" onclick="DASH.copyFundLink(' + f.id + ')">Copiar enlace</button><button class="btn" onclick="DASH.deleteFund(' + f.id + ')">Eliminar</button></div>'
      + '</div>';
  }).join('') || '<div style="opacity:0.5; font-size:13px;">Aún no has creado fondos en efectivo.</div>';

  document.getElementById('gifts-grid').innerHTML = STATE.gifts.map(function(g){
    var badgeColor = g.status==='available' ? '#e1ecd6' : g.status==='reserved' ? '#f0ebe0' : '#d6e6ec';
    var badgeText = g.status==='available' ? '#3a5a42' : g.status==='reserved' ? '#8a7848' : '#1a4a5a';
    var nextAction = g.status==='available' ? '<button class="btn" onclick="DASH.giftStatus(' + g.id + ',\'reserved\')">Reservar</button>'
      : g.status==='reserved' ? '<button class="btn" onclick="DASH.giftStatus(' + g.id + ',\'purchased\')">Marcar comprado</button>'
      : '<button class="btn" onclick="DASH.giftStatus(' + g.id + ',\'available\')">Reabrir</button>';
    return '<div class="gift-card tilt-card">'
      + '<span class="tilt-shine"></span>'
      + '<div class="gift-ic">FOTO DEL PRODUCTO</div>'
      + '<div class="gname">' + esc(g.name) + '</div>'
      + '<div class="gprice">' + fmtMoney(g.price) + '</div>'
      + (g.store ? '<div class="gstore">' + esc(g.store) + (g.link ? ' · <a href="' + esc(g.link) + '" target="_blank">VER EN TIENDA ↗</a>' : '') + '</div>' : '')
      + '<span class="pill" style="background:' + badgeColor + '; color:' + badgeText + '; align-self:flex-start;">' + GIFT_LABEL[g.status] + '</span>'
      + (g.by ? '<div class="gby">' + (g.status==='purchased'?'Comprado':'Reservado') + ' por ' + esc(g.by) + '</div>' : '')
      + '<div class="gift-actions">' + nextAction + '<button class="icon-btn" title="Eliminar" onclick="DASH.deleteGift(' + g.id + ')">×</button></div>'
      + '</div>';
  }).join('');
}
document.getElementById('gifts-currency').addEventListener('change', function(e){
  STATE.settings.currency = e.target.value; save(); renderAll();
});
document.querySelectorAll('[data-regtab]').forEach(function(b){
  b.addEventListener('click', function(){
    document.querySelectorAll('[data-regtab]').forEach(function(x){x.classList.remove('active');});
    b.classList.add('active');
    document.getElementById('reg-panel-funds').hidden = b.dataset.regtab !== 'funds';
    document.getElementById('reg-panel-items').hidden = b.dataset.regtab !== 'items';
  });
});
window.DASH.giftStatus = function(id, status){
  var g = STATE.gifts.find(function(x){return x.id===id;});
  g.status = status; g.by = status==='available' ? '' : (g.by || 'Marcia & Ricardo');
  save(); renderAll(); t('✓ REGALO: ' + GIFT_LABEL[status].toUpperCase());
};
window.DASH.deleteGift = function(id){
  if (!confirm('¿Eliminar este regalo?')) return;
  STATE.gifts = STATE.gifts.filter(function(x){return x.id!==id;});
  save(); renderAll();
};
document.getElementById('gift-form').addEventListener('submit', function(e){
  e.preventDefault();
  var name = document.getElementById('gi-name').value.trim();
  var price = parseFloat(document.getElementById('gi-price').value) || 0;
  var store = document.getElementById('gi-store').value.trim();
  var link = document.getElementById('gi-link').value.trim();
  if (!name) return;
  STATE.gifts.push({id: STATE.nextGiftId++, name:name, price:price, status:'available', by:'', store:store, link:link});
  save(); closeModal('gift'); renderAll(); e.target.reset();
  t('✓ REGALO AÑADIDO');
});
document.getElementById('fund-form').addEventListener('submit', function(e){
  e.preventDefault();
  var name = document.getElementById('fu-name').value.trim();
  var goal = parseFloat(document.getElementById('fu-goal').value) || 0;
  var desc = document.getElementById('fu-desc').value.trim();
  if (!name || !goal) return;
  STATE.funds.push({id: STATE.nextFundId++, name:name, goal:goal, desc:desc, contributions:[]});
  save(); closeModal('fund'); renderAll(); e.target.reset();
  t('✓ FONDO CREADO');
});
window.DASH.openContribution = function(fundId){
  document.getElementById('co-fund-id').value = fundId;
  document.getElementById('contribution-form').reset();
  openModal('contribution');
};
document.getElementById('contribution-form').addEventListener('submit', function(e){
  e.preventDefault();
  var fundId = parseInt(document.getElementById('co-fund-id').value,10);
  var f = STATE.funds.find(function(x){return x.id===fundId;});
  var name = document.getElementById('co-name').value.trim();
  var amount = parseFloat(document.getElementById('co-amount').value) || 0;
  var method = document.getElementById('co-method').value;
  var msg = document.getElementById('co-msg').value.trim();
  if (!name || !amount) return;
  f.contributions.push({name:name, amount:amount, method:method, msg:msg, date:'hoy'});
  save(); closeModal('contribution'); renderAll();
  t('✓ CONTRIBUCIÓN REGISTRADA');
});
window.DASH.copyFundLink = function(fundId){
  var link = 'https://invita.online/' + STATE.settings.slug + '/regalos#fondo-' + fundId;
  if (navigator.clipboard) navigator.clipboard.writeText(link).catch(function(){});
  t('✓ ENLACE DEL FONDO COPIADO');
};
window.DASH.deleteFund = function(id){
  if (!confirm('¿Eliminar este fondo? Se perderá el historial de contribuciones.')) return;
  STATE.funds = STATE.funds.filter(function(x){return x.id!==id;});
  save(); renderAll();
};

/* ---------------- Mensajes ---------------- */
function renderMessagesView(){
  var unread = STATE.messages.filter(function(m){return m.unread;}).length;
  document.getElementById('msgs-sub').textContent = STATE.messages.length + ' mensajes en tu libro de firmas · ' + unread + ' sin leer';
  document.getElementById('messages-list').innerHTML = STATE.messages.map(function(m){
    var initials = m.name.charAt(0);
    return '<div class="msg-card ' + (m.unread?'unread':'') + '">'
      + '<span class="quote-mark">”</span>'
      + '<div class="msg-head"><div class="avatar" style="--c1:' + m.c1 + '; --c2:' + m.c2 + '">' + initials + '</div>'
      + '<div class="who"><div class="name">' + esc(m.name) + '</div></div><div class="time">' + m.time + '</div></div>'
      + '<div class="msg-text">' + esc(m.text) + '</div>'
      + '<div class="msg-foot"><button class="msg-pill ' + (m.unread?'':'on') + '" onclick="DASH.toggleRead(' + m.id + ')">' + (m.unread?'Marcar leído':'Leído ✓') + '</button><button class="msg-pill gold ' + (m.favorite?'on':'') + '" onclick="DASH.toggleFavorite(' + m.id + ')">' + (m.favorite?'★ Destacado':'☆ Destacar') + '</button></div>'
      + '</div>';
  }).join('');
}
window.DASH.toggleRead = function(id){
  var m = STATE.messages.find(function(x){return x.id===id;});
  m.unread = !m.unread; save(); renderAll();
};
window.DASH.toggleFavorite = function(id){
  var m = STATE.messages.find(function(x){return x.id===id;});
  m.favorite = !m.favorite; save(); renderAll();
};

/* ---------------- Resumen ---------------- */
function renderResumen(){
  var stats = computeStats();
  document.getElementById('event-meta').innerHTML = fmtDate(STATE.settings.date) + ' · <span style="color:#5a705c; font-weight:500;">faltan ' + daysUntil(STATE.settings.date) + ' días</span>';
  document.getElementById('s-total').textContent = stats.total;
  document.getElementById('s-ok').textContent = stats.ok;
  document.getElementById('s-pending').textContent = stats.pending;
  document.getElementById('s-total-change').textContent = '↑ ' + Math.max(1, Math.round(stats.total*0.08)) + ' esta semana';
  document.getElementById('s-ok-change').textContent = '↑ ' + Math.max(1, Math.round(stats.ok*0.08)) + ' esta semana';
  document.getElementById('s-pending-change').textContent = '↓ ' + Math.max(0, Math.round(stats.pending*0.1)) + ' esta semana';
  document.getElementById('s-total-bar').style.width = '100%';
  document.getElementById('s-ok-bar').style.width = stats.okPct + '%';
  document.getElementById('s-pending-bar').style.width = stats.pendingPct + '%';

  setDonut('donut-ok','donut-pending','donut-no','donut-big', stats);
  document.getElementById('rsvp-legend').innerHTML = legendHtml(stats);

  document.getElementById('feed-list').innerHTML = STATE.messages.slice(0,6).map(function(m){
    return '<div class="feed-item"><div class="avatar" style="--c1:' + m.c1 + '; --c2:' + m.c2 + '">' + m.name.charAt(0) + '</div>'
      + '<div class="info"><div class="name">' + esc(m.name) + '</div><div class="action">' + esc(m.text.slice(0,48)) + (m.text.length>48?'…':'') + '</div></div>'
      + '<div class="time">' + m.time + '</div></div>';
  }).join('');

  document.getElementById('recent-guests-body').innerHTML = STATE.guests.slice(0,6).map(function(g){ return guestRowHtml(g, false); }).join('');

  var totalCap = STATE.tables.reduce(function(a,tb){return a+tb.capacity;},0);
  var assigned = STATE.guests.filter(function(g){return g.table;}).length;
  document.getElementById('plates-preview').innerHTML = STATE.tables.slice(0,12).map(function(tb){
    var seated = STATE.guests.filter(function(g){return g.table===tb.id;}).length;
    var cls = seated>=tb.capacity ? 'full' : seated>0 ? 'partial' : '';
    return '<div class="plate ' + cls + '" onclick="DASH.goto(\'mesas\')"><div class="num">' + String(tb.id).padStart(2,'0') + '</div><div class="lbl" ' + (cls==='full'?'style="color:rgba(255,255,255,0.7)"':'') + '>' + seated + '/' + tb.capacity + '</div></div>';
  }).join('');
  document.getElementById('tables-summary-a').textContent = STATE.tables.length + ' mesas · capacidad ' + totalCap;
  document.getElementById('tables-summary-b').textContent = assigned + '/' + totalCap + ' asignados';

  document.getElementById('qa-remind-d').textContent = 'Email + WhatsApp · ' + stats.pending + ' invitados';
  document.getElementById('qa-link-d').textContent = 'invita.online/' + STATE.settings.slug;

  var days = daysUntil(STATE.settings.date);
  document.getElementById('rsvp-deadline-title').textContent = 'Fecha límite RSVP en ' + Math.max(days-14,0) + ' días';
  document.getElementById('rsvp-deadline-desc').textContent = 'Activa el recordatorio automático para los ' + stats.pending + ' pendientes.';
}
window.DASH.goto = showView;
function fmtDate(d){
  var dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('es-MX', {day:'numeric', month:'long', year:'numeric'});
}
function setDonut(idOk, idPending, idNo, idBig, stats){
  document.getElementById(idOk).setAttribute('stroke-dasharray', stats.okPct + ' 100');
  document.getElementById(idPending).setAttribute('stroke-dasharray', stats.pendingPct + ' 100');
  document.getElementById(idPending).setAttribute('stroke-dashoffset', -stats.okPct);
  document.getElementById(idNo).setAttribute('stroke-dasharray', stats.noPct + ' 100');
  document.getElementById(idNo).setAttribute('stroke-dashoffset', -(stats.okPct+stats.pendingPct));
  document.getElementById(idBig).textContent = stats.okPct + '%';
}
function legendHtml(stats){
  return '<div class="legend-item"><div class="swatch" style="background:#5a705c"></div><div class="name">Asistirán</div><div class="val">' + stats.ok + ' (' + stats.okPct + '%)</div></div>'
    + '<div class="legend-item"><div class="swatch" style="background:#c4a572"></div><div class="name">Pendientes</div><div class="val">' + stats.pending + ' (' + stats.pendingPct + '%)</div></div>'
    + '<div class="legend-item"><div class="swatch" style="background:#a3553a"></div><div class="name">No podrán</div><div class="val">' + stats.no + ' (' + stats.noPct + '%)</div></div>'
    + '<div class="legend-item" style="border:none"><div class="swatch" style="background:#d6e6ec"></div><div class="name">Tal vez</div><div class="val">' + stats.maybe + ' (' + stats.maybePct + '%)</div></div>';
}

document.getElementById('btn-share-link').addEventListener('click', function(){ copyLink(); });
document.getElementById('qa-link').addEventListener('click', function(){ copyLink(); });
function copyLink(){
  var link = 'https://invita.online/' + STATE.settings.slug;
  if (navigator.clipboard) navigator.clipboard.writeText(link).catch(function(){});
  t('✓ ENLACE COPIADO');
}
document.getElementById('qa-remind').addEventListener('click', function(){
  var stats = computeStats();
  t('✓ RECORDATORIO ENVIADO A ' + stats.pending + ' INVITADOS');
});
document.getElementById('qa-qr').addEventListener('click', function(){
  t('✓ QR GENERADO Y LISTO PARA DESCARGAR');
});
document.getElementById('qa-edit').addEventListener('click', function(){ window.location.href = 'Editor.html'; });
document.getElementById('btn-activate-reminder').addEventListener('click', function(){
  t('✓ RECORDATORIO AUTOMÁTICO ACTIVADO');
});

/* ---------------- Estadísticas ---------------- */
function renderStatsView(){
  var stats = computeStats();
  setDonut('donut2-ok','donut2-pending','donut2-no','donut2-big', stats);
  document.getElementById('rsvp-legend2').innerHTML = legendHtml(stats);

  var visits = STATE.visits, invited = stats.total, confirmed = stats.ok;
  var funnel = [
    {label:'Invitados', val: invited, max: invited},
    {label:'Visitaron enlace', val: Math.round(invited*0.83), max: invited},
    {label:'Vieron RSVP', val: Math.round(invited*0.6), max: invited},
    {label:'Confirmaron', val: confirmed, max: invited}
  ];
  document.getElementById('funnel').innerHTML = funnel.map(function(f){
    var pct = Math.round(f.val/f.max*100);
    return '<div class="funnel-row"><div class="flabel">' + f.label + '</div><div class="ftrack"><div class="ffill" style="width:' + pct + '%"></div></div><div class="fval">' + f.val + '</div></div>';
  }).join('');

  var devices = [{label:'Móvil',pct:68},{label:'Escritorio',pct:24},{label:'Tablet',pct:8}];
  document.getElementById('devices').innerHTML = devices.map(function(d){
    return '<div class="funnel-row"><div class="flabel">' + d.label + '</div><div class="ftrack"><div class="ffill" style="width:' + d.pct + '%; background:#7c5cff"></div></div><div class="fval">' + d.pct + '%</div></div>';
  }).join('');
  var sources = [{label:'WhatsApp',pct:52},{label:'Enlace directo',pct:31},{label:'Instagram',pct:12},{label:'Email',pct:5}];
  document.getElementById('sources').innerHTML = sources.map(function(s){
    return '<div class="funnel-row"><div class="flabel">' + s.label + '</div><div class="ftrack"><div class="ffill" style="width:' + s.pct + '%; background:#c4a572"></div></div><div class="fval">' + s.pct + '%</div></div>';
  }).join('');
}

/* ---------------- Configuración ---------------- */
function renderConfigView(){
  var s = STATE.settings;
  document.getElementById('cfg-name').value = s.name;
  document.getElementById('cfg-date').value = s.date;
  document.getElementById('cfg-venue').value = s.venue;
  document.getElementById('cfg-slug').value = s.slug;
  document.getElementById('cfg-lang').value = s.lang;
  document.getElementById('cfg-currency').value = s.currency || 'BOB';
  document.getElementById('cfg-priv-public').checked = s.privacy === 'public';
  document.getElementById('cfg-priv-password').checked = s.privacy === 'password';
  document.getElementById('cfg-password').value = s.password || '';
  document.getElementById('cfg-password-field').style.display = s.privacy === 'password' ? 'block' : 'none';
  document.getElementById('cfg-preview-name').textContent = s.name;
  document.getElementById('cfg-preview-date').textContent = fmtDate(s.date);
  document.getElementById('cfg-preview-venue').textContent = s.venue;
  document.getElementById('cfg-preview-url').textContent = 'invita.online/' + s.slug;
  var privLbl = document.getElementById('cfg-preview-privacy');
  privLbl.textContent = s.privacy === 'password' ? 'Protegida con contraseña' : 'Pública';
  privLbl.style.background = s.privacy === 'password' ? '#f0ebe0' : '#e1ecd6';
  privLbl.style.color = s.privacy === 'password' ? '#8a7848' : '#3a5a42';
}
document.querySelectorAll('input[name=privacy]').forEach(function(r){
  r.addEventListener('change', function(){ document.getElementById('cfg-password-field').style.display = r.value === 'password' && r.checked ? 'block' : 'none'; });
});
document.getElementById('settings-form').addEventListener('submit', function(e){
  e.preventDefault();
  STATE.settings = {
    name: document.getElementById('cfg-name').value.trim(),
    date: document.getElementById('cfg-date').value,
    venue: document.getElementById('cfg-venue').value.trim(),
    slug: document.getElementById('cfg-slug').value.trim().toLowerCase().replace(/\s+/g,'-'),
    lang: document.getElementById('cfg-lang').value,
    currency: document.getElementById('cfg-currency').value,
    privacy: document.querySelector('input[name=privacy]:checked').value,
    password: document.getElementById('cfg-password').value
  };
  save(); renderAll(); t('✓ CAMBIOS GUARDADOS');
});
document.getElementById('btn-delete-event').addEventListener('click', function(){
  if (!confirm('Esta acción es permanente. ¿Eliminar el evento y todos sus datos?')) return;
  localStorage.removeItem(STORE_KEY);
  STATE = defaultState(); save(); renderAll();
  t('EVENTO ELIMINADO — datos reiniciados');
});

/* ---------------- Plan ---------------- */
var PLANS = [
  {id:'basico', name:'Básico', monthly:0, annual:0, features:['1 invitación digital','Hasta 50 invitados','RSVP básico','Soporte por email']},
  {id:'premium', name:'Premium', monthly:299, annual:2990, features:['Invitados ilimitados','Mesa de regalos','Gestión de mesas','Estadísticas avanzadas','Soporte prioritario']},
  {id:'lujo', name:'Boda de Lujo', monthly:599, annual:5990, features:['Todo lo de Premium','Diseño personalizado a medida','Dominio propio','Gestor de evento dedicado','WhatsApp automatizado']}
];
function renderPlanView(){
  document.querySelectorAll('#billing-toggle button').forEach(function(b){ b.classList.toggle('active', b.dataset.cycle === STATE.plan.cycle); });
  document.getElementById('plans-grid').innerHTML = PLANS.map(function(p){
    var price = STATE.plan.cycle === 'monthly' ? p.monthly : p.annual;
    var unit = STATE.plan.cycle === 'monthly' ? '/mes' : '/año';
    var isCurrent = p.id === STATE.plan.current;
    return '<div class="plan-card tilt-card ' + (isCurrent?'current':'') + '">'
      + '<span class="tilt-shine"></span>'
      + (isCurrent ? '<div class="ptag">PLAN ACTUAL</div>' : '<div class="ptag" style="opacity:0">·</div>')
      + '<div class="pname">' + p.name + '</div>'
      + '<div class="pprice">$' + price.toLocaleString() + ' <span>MXN' + unit + '</span></div>'
      + '<ul>' + p.features.map(function(f){ return '<li>' + f + '</li>'; }).join('') + '</ul>'
      + (isCurrent ? '<button class="btn" disabled>Plan actual</button>' : '<button class="btn primary" onclick="DASH.changePlan(\'' + p.id + '\')">Cambiar a ' + p.name + '</button>')
      + '</div>';
  }).join('');
  document.getElementById('user-plan-label').textContent = 'PLAN ' + PLANS.find(function(p){return p.id===STATE.plan.current;}).name.toUpperCase();
}
window.DASH.changePlan = function(id){
  STATE.plan.current = id; save(); renderAll(); t('✓ PLAN ACTUALIZADO A ' + PLANS.find(function(p){return p.id===id;}).name.toUpperCase());
};
document.querySelectorAll('#billing-toggle button').forEach(function(b){
  b.addEventListener('click', function(){ STATE.plan.cycle = b.dataset.cycle; save(); renderPlanView(); });
});

/* ---------------- Ayuda ---------------- */
var FAQS = [
  {q:'¿Cómo comparto mi invitación con los invitados?', a:'Ve a Resumen y haz clic en "Compartir enlace", o cópialo desde Acciones rápidas. También puedes descargar el código QR para imprimir.'},
  {q:'¿Cómo agrego o edito invitados?', a:'Entra a la sección Invitados y usa "+ Añadir invitado", o el ícono de lápiz en cada fila para editar sus datos.'},
  {q:'¿Puedo cambiar el diseño de mi invitación después de publicarla?', a:'Sí, desde "Editar invitación" en el menú de Diseño puedes modificar el diseño en cualquier momento sin perder tus RSVPs.'},
  {q:'¿Cómo funciona la mesa de regalos?', a:'Añade productos desde la sección Regalos. Los invitados podrán reservarlos o marcarlos como comprados directamente desde tu invitación.'},
  {q:'¿Qué pasa si cambio de plan?', a:'Puedes subir o bajar de plan en cualquier momento desde la sección Plan. Los cambios se aplican de inmediato.'},
  {q:'¿Cómo elimino mi evento?', a:'En Configuración, dentro de la Zona de riesgo, encontrarás la opción para eliminar el evento de forma permanente.'}
];
function renderFaq(filter){
  var q = (filter||'').toLowerCase();
  var list = FAQS.filter(function(f){ return !q || f.q.toLowerCase().indexOf(q)>-1 || f.a.toLowerCase().indexOf(q)>-1; });
  document.getElementById('faq-list').innerHTML = list.map(function(f,i){
    return '<div class="faq-item"><div class="faq-q" onclick="this.parentElement.classList.toggle(\'open\')"><span>' + esc(f.q) + '</span><span class="chev">+</span></div><div class="faq-a">' + esc(f.a) + '</div></div>';
  }).join('') || '<div style="padding:20px; opacity:0.5; font-size:13px;">Sin resultados.</div>';
}
document.getElementById('faq-search').addEventListener('input', function(e){ renderFaq(e.target.value); });
document.getElementById('help-form').addEventListener('submit', function(e){
  e.preventDefault(); e.target.reset(); t('✓ MENSAJE ENVIADO — te responderemos en 24h');
});

/* ---------------- 3D tilt ---------------- */
function bindTilt(el){
  if (el._tiltBound) return; el._tiltBound = true;
  el.style.position = el.style.position || 'relative';
  el.addEventListener('mousemove', function(e){
    var r = el.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    var rx = (0.5 - py) * 8, ry = (px - 0.5) * 10;
    el.setAttribute('data-tilting','');
    el.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateZ(2px)';
    el.style.setProperty('--mx', (px*100) + '%'); el.style.setProperty('--my', (py*100) + '%');
  });
  el.addEventListener('mouseleave', function(){
    el.removeAttribute('data-tilting');
    el.style.transform = '';
  });
}
function bindTiltAll(){ document.querySelectorAll('.tilt-card').forEach(bindTilt); }
var tiltObserver = new MutationObserver(function(){ bindTiltAll(); });
tiltObserver.observe(document.body, {childList:true, subtree:true});
bindTiltAll();

/* ---------------- Pase de invitado ---------------- */
window.DASH.openPass = function(id){
  var g = STATE.guests.find(function(x){return x.id===id;});
  ensureCheckInCode(g); save();
  document.getElementById('pass-brand').textContent = STATE.settings.name + ' · ' + fmtDate(STATE.settings.date);
  document.getElementById('pass-name').textContent = partyLabelFor(g);
  document.getElementById('pass-meta').textContent = (g.table ? 'Mesa ' + String(g.table).padStart(2,'0') : 'Mesa por asignar') + ' · ' + STATE.settings.venue;
  document.getElementById('pass-code-label').textContent = g.checkInCode;
  var qrEl = document.getElementById('pass-qr'); qrEl.innerHTML = '';
  new QRCode(qrEl, { text: g.checkInCode, width: 160, height: 160, colorDark: '#1a1a1a', colorLight: '#ffffff' });
  openModal('pass');
};
document.getElementById('btn-print-pass').addEventListener('click', function(){ window.print(); });

/* ---------------- Check-in del día del evento ----------------
   El flujo de puerta: la cámara se enciende una vez y queda viva toda la
   recepción. Cada pase se registra en el momento de leerlo — sin diálogo de
   confirmación, porque a la entrada de una boda hay una fila detrás y cada
   toque de más son segundos por invitado. Lo que puede salir mal se resuelve
   después: hay «Deshacer» en el resultado y en la lista de llegadas.        */

function partySize(g){ return 1 + (g.companions || 0); }
/* Esperados y llegados NO son el mismo conjunto. En una boda aparece gente que
   había dicho que no, y su QR es válido: se registra igual. Si los llegados se
   contaran filtrando por RSVP, esa persona entraría, quedaría marcada y aun así
   no saldría ni en el contador ni en las últimas llegadas — mientras el número
   de la barra lateral sí la contaría. Dos cifras contradiciéndose en la puerta. */
function expectedGuests(){ return STATE.guests.filter(function(g){ return g.rsvp !== 'no'; }); }
function arrivedGuests(){ return STATE.guests.filter(function(g){ return g.checkedIn; }); }
function guestByCode(code){
  var c = String(code == null ? '' : code).trim().toUpperCase();
  if (!c) return null;
  return STATE.guests.find(function(x){ ensureCheckInCode(x); return x.checkInCode.toUpperCase() === c; }) || null;
}
function checkInGuest(g, count){
  g.checkedIn = true;
  g.checkedInAt = Date.now();
  g.arrivedCount = count || partySize(g);
  save(); renderAll();
}
function undoCheckIn(g){
  g.checkedIn = false; g.checkedInAt = null; g.arrivedCount = null;
  save(); renderAll();
  t('INGRESO DESHECHO · ' + g.name.toUpperCase());
}

function renderCheckinView(){
  var expected = expectedGuests();
  var arrived = arrivedGuests();
  var pending = expected.filter(function(g){ return !g.checkedIn; });
  var pct = expected.length ? Math.min(100, Math.round(arrived.length/expected.length*100)) : 0;
  var heads = arrived.reduce(function(n,g){ return n + (g.arrivedCount || partySize(g)); }, 0);
  var extra = arrived.filter(function(g){ return g.rsvp === 'no'; }).length;
  document.getElementById('checkin-sub').textContent =
    arrived.length + ' de ' + expected.length + ' pases registrados · ' + heads + ' persona' + (heads===1?'':'s') + ' en el salón'
    + (extra ? ' · ' + extra + ' sin confirmar que vino igual' : '');
  document.getElementById('checkin-donut').setAttribute('stroke-dasharray', pct + ' 100');
  document.getElementById('checkin-donut-big').textContent = pct + '%';
  document.getElementById('checkin-legend').innerHTML =
    '<div class="legend-item"><div class="swatch" style="background:#5a705c"></div><div class="name">Llegaron</div><div class="val">' + arrived.length + '</div></div>' +
    '<div class="legend-item" style="border:none"><div class="swatch" style="background:#f0ebe0"></div><div class="name">Por llegar</div><div class="val">' + pending.length + '</div></div>';

  var sorted = arrived.slice().sort(function(a,b){ return (b.checkedInAt||0) - (a.checkedInAt||0); }).slice(0,12);
  document.getElementById('checkin-arrivals-list').innerHTML = sorted.length ? sorted.map(function(g){
    var n = g.arrivedCount || partySize(g);
    return '<div class="arrival-row">'
      + '<div class="ar-tick">✓</div>'
      + '<div class="ar-who"><div>' + esc(partyLabelFor(g)) + '</div>'
      + '<div class="ar-sub">' + (g.table ? 'MESA ' + String(g.table).padStart(2,'0') : 'SIN MESA') + ' · ' + n + ' PERSONA' + (n===1?'':'S') + '</div></div>'
      + '<button class="ar-undo" data-undo="' + g.id + '">Deshacer</button>'
      + '<div class="ar-time">' + new Date(g.checkedInAt).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'}) + '</div>'
      + '</div>';
  }).join('') : '<div class="no-guests">Aún no hay llegadas registradas.</div>';

  renderLookup();
  if (typeof Door !== 'undefined') Door.updateCount();
}

document.getElementById('checkin-arrivals-list').addEventListener('click', function(e){
  var b = e.target.closest('[data-undo]');
  if (!b) return;
  var g = STATE.guests.find(function(x){ return x.id === Number(b.dataset.undo); });
  if (g) undoCheckIn(g);
});

/* Buscar a mano — la salida cuando el pase no se puede leer */
function matchGuests(q){
  q = q.trim().toLowerCase();
  if (!q) return [];
  return STATE.guests.filter(function(g){
    ensureCheckInCode(g);
    return g.name.toLowerCase().indexOf(q) >= 0
      || String(g.group||'').toLowerCase().indexOf(q) >= 0
      || g.checkInCode.toLowerCase().indexOf(q) >= 0;
  }).slice(0, 12);
}
function renderLookup(){
  var input = document.getElementById('checkin-lookup');
  var box = document.getElementById('checkin-lookup-list');
  var hits = matchGuests(input.value);
  if (!input.value.trim()) { box.innerHTML = ''; return; }
  box.innerHTML = hits.length ? hits.map(function(g){
    return '<div class="lookup-row">'
      + '<div class="lr-who"><div>' + esc(partyLabelFor(g)) + (g.vip?' <span class="vip-star">★</span>':'') + '</div>'
      + '<div class="lr-sub">' + esc(g.group||'Sin grupo') + ' · ' + (g.table?'Mesa ' + String(g.table).padStart(2,'0'):'Sin mesa')
      + (g.rsvp === 'no' ? ' · <b>había dicho que no</b>' : '') + '</div></div>'
      + (g.checkedIn
          ? '<span class="pill ok">Ya llegó</span>'
          : '<button class="btn primary" data-lookup-in="' + g.id + '">Registrar</button>')
      + '</div>';
  }).join('') : '<div class="no-guests" style="padding:16px 4px;">Ningún invitado coincide.</div>';
}
document.getElementById('checkin-lookup').addEventListener('input', renderLookup);
document.getElementById('checkin-lookup').addEventListener('keydown', function(e){
  if (e.key !== 'Enter') return;
  // Un lector de códigos por USB teclea el código y remata con Enter.
  var g = guestByCode(e.target.value);
  if (g) { checkInGuest(g); t('✓ INGRESO REGISTRADO · ' + g.name.toUpperCase()); e.target.value = ''; renderLookup(); }
});
document.getElementById('checkin-lookup-list').addEventListener('click', function(e){
  var b = e.target.closest('[data-lookup-in]');
  if (!b) return;
  var g = STATE.guests.find(function(x){ return x.id === Number(b.dataset.lookupIn); });
  if (!g) return;
  checkInGuest(g);
  t('✓ INGRESO REGISTRADO · ' + g.name.toUpperCase());
});
document.getElementById('btn-manual-checkin').addEventListener('click', function(){ showView('invitados'); });
document.getElementById('btn-door-help').addEventListener('click', function(){ openModal('doorhelp'); });

/* ---------------- Modo puerta ---------------- */
var Door = (function(){
  var stream = null, detector = null, ac = null;
  var video, frameEl, bootEl, resultEl, flashEl, sheetEl;
  var canvas = null, ctx = null;
  var lastCode = '', lastCodeAt = 0, dismissTimer = null;
  var cams = [], camIdx = 0, torchOn = false, muted = false, wakeLock = null;
  var typed = '', typedAt = 0, scanTimer = null;
  /* Diez lecturas por segundo bastan de sobra para un QR en la puerta. Ir a
     cada fotograma multiplicaba por seis o doce el trabajo — y con la pestaña
     de fondo requestAnimationFrame baja a un fotograma por segundo, así que
     el escáner se paraba solo. Un temporizador no depende de nada de eso. */
  var SCAN_MS = 110;
  var SAME_CODE_MS = 2600;

  function el(id){ return document.getElementById(id); }

  /* Sonido sintetizado: sin archivos, funciona sin conexión. Tres timbres
     bien distintos, porque en la puerta se oye antes de lo que se lee. */
  function tone(freq, at, dur, gain){
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ac.currentTime + at);
    g.gain.exponentialRampToValueAtTime(gain || 0.22, ac.currentTime + at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(ac.currentTime + at); o.stop(ac.currentTime + at + dur + 0.02);
  }
  function beep(kind){
    if (muted) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = ac || new AC();
      if (ac.state === 'suspended') ac.resume();
      if (kind === 'ok') { tone(880, 0, 0.08); tone(1318, 0.075, 0.13); }
      else if (kind === 'dup') { tone(520, 0, 0.15); tone(520, 0.22, 0.20); }
      else { tone(190, 0, 0.38, 0.28); }
    } catch (e) {}
  }
  function buzz(kind){
    if (!navigator.vibrate) return;
    try { navigator.vibrate(kind === 'ok' ? 35 : kind === 'dup' ? [70,60,70] : [100,70,100,70,100]); } catch (e) {}
  }

  function boot(title, desc, actions){
    frameEl.hidden = true;
    bootEl.hidden = false;
    el('door-boot-title').textContent = title;
    el('door-boot-desc').textContent = desc;
    el('door-boot-actions').innerHTML = actions || '';
  }
  function live(){ bootEl.hidden = true; frameEl.hidden = false; }

  function cameraError(err){
    var name = err && err.name || '';
    if (!window.isSecureContext) {
      return boot('La cámara necesita HTTPS',
        'El navegador solo permite usar la cámara en sitios seguros o en localhost. Busca al invitado por su nombre, o conecta un lector de códigos por USB.',
        '<button class="btn primary" onclick="DASH.doorFind()">Buscar por nombre</button>');
    }
    if (name === 'NotAllowedError') {
      return boot('Permiso de cámara denegado',
        'Habilita la cámara para este sitio en los ajustes del navegador y vuelve a abrir el modo puerta.',
        '<button class="btn primary" onclick="DASH.doorRetry()">Reintentar</button>');
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return boot('No se encontró ninguna cámara',
        'Este dispositivo no tiene cámara disponible. Usa el buscador por nombre o un lector de códigos.',
        '<button class="btn primary" onclick="DASH.doorFind()">Buscar por nombre</button>');
    }
    if (name === 'NotReadableError') {
      return boot('La cámara está ocupada',
        'Otra aplicación la está usando. Ciérrala y reintenta.',
        '<button class="btn primary" onclick="DASH.doorRetry()">Reintentar</button>');
    }
    boot('No se pudo abrir la cámara', 'Reintenta o busca al invitado por su nombre.',
      '<button class="btn primary" onclick="DASH.doorRetry()">Reintentar</button>');
  }

  function stopStream(){
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = null;
    if (stream) { stream.getTracks().forEach(function(tr){ tr.stop(); }); stream = null; }
    torchOn = false;
    el('door-torch').classList.remove('on');
  }

  function applyTrackFeatures(){
    var track = stream && stream.getVideoTracks()[0];
    var caps = track && track.getCapabilities ? track.getCapabilities() : {};
    el('door-torch').hidden = !(caps && caps.torch);
    el('door-flip').hidden = cams.length < 2;
  }

  function start(deviceId){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return cameraError({ name: 'NotFoundError' });
    }
    boot('Encendiendo la cámara…', 'Acepta el permiso de cámara para empezar a escanear.', '');
    var constraints = deviceId
      ? { video: { deviceId: { exact: deviceId } } }
      : { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } };
    navigator.mediaDevices.getUserMedia(constraints).then(function(s){
      stream = s;
      video.srcObject = s;
      var p = video.play();
      if (p && p.catch) p.catch(function(){});
      // enumerateDevices solo entrega etiquetas y IDs útiles una vez concedido el permiso.
      if (navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(function(list){
          cams = list.filter(function(d){ return d.kind === 'videoinput'; });
          applyTrackFeatures();
        }).catch(function(){ applyTrackFeatures(); });
      } else { applyTrackFeatures(); }
      live();
      loop();
    }).catch(cameraError);
  }

  /* BarcodeDetector es nativo y mucho más rápido donde existe; jsQR queda de
     respaldo para todo lo demás. */
  function ensureDetector(){
    if (detector !== null) return;
    if (window.BarcodeDetector) {
      try { detector = new window.BarcodeDetector({ formats: ['qr_code'] }); return; } catch (e) {}
    }
    detector = false;
  }
  function loop(){
    ensureDetector();
    if (!canvas) { canvas = document.createElement('canvas'); ctx = canvas.getContext('2d', { willReadFrequently: true }); }
    var busy = false;
    function tick(){
      if (!stream) return;
      scanTimer = setTimeout(tick, SCAN_MS);
      if (busy || resultEl.classList.contains('show') || sheetEl.classList.contains('show')) return;
      if (video.readyState !== video.HAVE_ENOUGH_DATA || !video.videoWidth) return;
      if (detector) {
        busy = true;
        detector.detect(video).then(function(codes){
          busy = false;
          if (codes && codes.length && codes[0].rawValue) onCode(codes[0].rawValue);
        }).catch(function(){ busy = false; detector = false; });
        return;
      }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var found = window.jsQR && window.jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (found && found.data) onCode(found.data);
    }
    if (scanTimer) clearTimeout(scanTimer);
    tick();
  }

  /* Sin este freno, sostener el teléfono frente a un QR lo dispara sesenta
     veces por segundo. */
  function onCode(raw){
    var now = Date.now();
    if (raw === lastCode && now - lastCodeAt < SAME_CODE_MS) return;
    lastCode = raw; lastCodeAt = now;
    var g = guestByCode(raw);
    if (!g) return showResult('err', null, raw);
    if (g.checkedIn) return showResult('dup', g);
    checkInGuest(g);
    showResult('ok', g);
  }

  function flash(kind){
    flashEl.style.background = kind === 'ok' ? '#5a705c' : kind === 'dup' ? '#c4a572' : '#a3553a';
    flashEl.classList.remove('fire');
    void flashEl.offsetWidth;
    flashEl.classList.add('fire');
  }

  function showResult(kind, g, rawCode){
    clearTimeout(dismissTimer);
    beep(kind); buzz(kind); flash(kind);
    var ms = kind === 'ok' ? 3200 : kind === 'dup' ? 6000 : 4500;
    var html = '<div class="dr-timer run" style="animation-duration:' + ms + 'ms"></div>';

    if (kind === 'err') {
      html += '<div class="dr-kicker">✕ Pase no válido</div>'
        + '<div class="dr-name">Este código no es de tu evento</div>'
        + '<div class="dr-meta">Puede ser el pase de otra fiesta, o un QR cualquiera.</div>'
        + '<div class="dr-code">' + esc(String(rawCode).slice(0, 120)) + '</div>'
        + '<div class="dr-actions"><button class="btn" data-dr="close">Cerrar</button>'
        + '<button class="btn solid" data-dr="find">Buscar por nombre</button></div>';
    } else {
      var n = g.arrivedCount || partySize(g);
      html += '<div class="dr-kicker">' + (kind === 'ok' ? '✓ Bienvenido' : '! Ya había ingresado') + '</div>'
        + '<div class="dr-name">' + esc(partyLabelFor(g)) + (g.vip ? ' ★' : '') + '</div>'
        + '<div class="dr-meta">' + esc(g.group || 'Sin grupo')
        + (kind === 'dup' ? ' · registrado a las ' + new Date(g.checkedInAt).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'}) : '')
        + '</div>'
        + '<div class="dr-table"><div class="drt-lbl">' + (g.table ? 'Su mesa' : 'Mesa') + '</div>'
        + '<div class="drt-val">' + (g.table ? String(g.table).padStart(2,'0') : '—') + '</div></div>';
      if (kind === 'ok') {
        html += '<div class="dr-party"><div class="drp-lbl">¿Cuántos entraron?</div>'
          + '<div class="dr-step"><button data-dr="minus" ' + (n<=1?'disabled':'') + '>−</button>'
          + '<div class="drs-n" id="dr-n">' + n + '</div>'
          + '<button data-dr="plus" ' + (n>=partySize(g)?'disabled':'') + '>+</button></div></div>'
          + '<div class="dr-actions"><button class="btn" data-dr="undo">Deshacer</button>'
          + '<button class="btn solid" data-dr="close">Siguiente invitado</button></div>';
      } else {
        html += '<div class="dr-actions"><button class="btn" data-dr="close">No dejar pasar</button>'
          + '<button class="btn solid" data-dr="again">Registrar de nuevo</button></div>';
      }
    }

    resultEl.className = 'door-result ' + kind;
    resultEl.innerHTML = html;
    void resultEl.offsetWidth;
    resultEl.classList.add('show');
    el('door').classList.add('result-open');
    resultEl.dataset.gid = g ? g.id : '';
    dismissTimer = setTimeout(dismiss, ms);
  }

  function holdOpen(){
    clearTimeout(dismissTimer);
    var bar = resultEl.querySelector('.dr-timer');
    if (bar) bar.classList.remove('run');
  }
  function dismiss(){
    clearTimeout(dismissTimer);
    resultEl.classList.remove('show');
    el('door').classList.remove('result-open');
    // La ventana de gracia se cuenta desde que se cierra la tarjeta: si no, el
    // mismo pase todavía frente a la cámara vuelve a sonar como repetido.
    lastCodeAt = Date.now();
  }

  function onResultClick(e){
    var b = e.target.closest('[data-dr]');
    if (!b) { holdOpen(); return; }
    var act = b.dataset.dr;
    var g = STATE.guests.find(function(x){ return x.id === Number(resultEl.dataset.gid); });
    if (act === 'close') return dismiss();
    if (act === 'find') { dismiss(); return openSheet(); }
    if (!g) return dismiss();
    if (act === 'undo') { undoCheckIn(g); return dismiss(); }
    if (act === 'again') { checkInGuest(g); dismiss(); return t('✓ INGRESO REGISTRADO DE NUEVO · ' + g.name.toUpperCase()); }
    if (act === 'minus' || act === 'plus') {
      holdOpen();
      var n = (g.arrivedCount || partySize(g)) + (act === 'plus' ? 1 : -1);
      n = Math.max(1, Math.min(partySize(g), n));
      g.arrivedCount = n; save(); renderAll();
      el('dr-n').textContent = n;
      resultEl.querySelector('[data-dr="minus"]').disabled = n <= 1;
      resultEl.querySelector('[data-dr="plus"]').disabled = n >= partySize(g);
    }
  }

  /* Buscar por nombre dentro del modo puerta: nunca hay que salir de aquí. */
  function renderSheet(){
    var q = el('door-search').value;
    var body = el('door-sheet-body');
    var hits = q.trim() ? matchGuests(q) : expectedGuests().filter(function(g){ return !g.checkedIn; }).slice(0, 20);
    body.innerHTML = hits.length ? hits.map(function(g){
      return '<button class="ds-row" data-ds="' + g.id + '">'
        + '<div class="dsr-av">' + esc(g.name.charAt(0)) + '</div>'
        + '<div class="dsr-who"><div>' + esc(partyLabelFor(g)) + (g.vip?' ★':'') + '</div>'
        + '<div class="dsr-sub">' + esc(g.group||'Sin grupo') + ' · ' + (g.table?'Mesa ' + String(g.table).padStart(2,'0'):'Sin mesa')
        + (g.rsvp === 'no' ? ' · había dicho que no' : '') + '</div></div>'
        + (g.checkedIn ? '<span class="pill ok">Ya llegó</span>' : '<span class="pill pending">Registrar</span>')
        + '</button>';
    }).join('') : '<div class="ds-empty">Ningún invitado coincide.</div>';
  }
  function openSheet(){ sheetEl.classList.add('show'); el('door-search').value = ''; renderSheet(); el('door-search').focus(); }
  function closeSheet(){ sheetEl.classList.remove('show'); }

  function keepAwake(){
    if (!navigator.wakeLock) return;
    if (wakeLock && !wakeLock.released) return;
    navigator.wakeLock.request('screen').then(function(w){ wakeLock = w; }).catch(function(){});
  }
  function releaseWake(){ if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; } }

  function open(){
    el('door').classList.add('show');
    document.body.style.overflow = 'hidden';
    updateCount();
    keepAwake();
    start();
  }
  function close(){
    stopStream(); releaseWake(); dismiss(); closeSheet();
    el('door').classList.remove('show');
    document.body.style.overflow = '';
  }
  function updateCount(){
    el('door-arrived').textContent = arrivedGuests().length;
    el('door-total').textContent = ' / ' + expectedGuests().length;
  }

  function init(){
    video = el('door-video'); frameEl = el('door-frame'); bootEl = el('door-boot');
    resultEl = el('door-result'); flashEl = el('door-flash'); sheetEl = el('door-sheet');

    el('btn-open-door').addEventListener('click', open);
    el('door-close').addEventListener('click', close);
    el('door-find').addEventListener('click', openSheet);
    el('door-sheet-close').addEventListener('click', closeSheet);
    el('door-search').addEventListener('input', renderSheet);
    resultEl.addEventListener('click', onResultClick);

    el('door-sheet-body').addEventListener('click', function(e){
      var b = e.target.closest('[data-ds]');
      if (!b) return;
      var g = STATE.guests.find(function(x){ return x.id === Number(b.dataset.ds); });
      if (!g) return;
      closeSheet();
      if (g.checkedIn) return showResult('dup', g);
      checkInGuest(g);
      showResult('ok', g);
    });

    el('door-sound').addEventListener('click', function(){
      muted = !muted;
      this.textContent = muted ? '🔇' : '🔊';
      this.classList.toggle('on', muted);
      this.title = muted ? 'Activar sonido' : 'Silenciar sonido';
    });
    el('door-torch').addEventListener('click', function(){
      var track = stream && stream.getVideoTracks()[0];
      if (!track || !track.applyConstraints) return;
      torchOn = !torchOn;
      track.applyConstraints({ advanced: [{ torch: torchOn }] })
        .then(function(){ el('door-torch').classList.toggle('on', torchOn); })
        .catch(function(){ torchOn = false; el('door-torch').hidden = true; });
    });
    el('door-flip').addEventListener('click', function(){
      if (cams.length < 2) return;
      camIdx = (camIdx + 1) % cams.length;
      stopStream();
      start(cams[camIdx].deviceId);
    });

    document.addEventListener('keydown', function(e){
      if (!el('door').classList.contains('show')) return;
      if (e.key === 'Escape') {
        if (sheetEl.classList.contains('show')) return closeSheet();
        if (resultEl.classList.contains('show')) return dismiss();
        return close();
      }
      if (sheetEl.classList.contains('show')) return;
      // Un lector de códigos por USB o Bluetooth se comporta como un teclado:
      // teclea el código de golpe y remata con Enter. Aquí no hay ningún campo
      // donde escribir, así que el modo puerta lo escucha directo.
      if (e.key === 'Enter') { var c = typed; typed = ''; if (c) onCode(c); return; }
      if (e.key.length !== 1) return;
      if (Date.now() - typedAt > 1200) typed = '';
      typedAt = Date.now();
      typed = (typed + e.key).slice(-64);
    });
    // Volver de otra app deja el bloqueo de pantalla liberado y el vídeo en pausa.
    document.addEventListener('visibilitychange', function(){
      if (document.hidden || !el('door').classList.contains('show')) return;
      keepAwake();
      if (video && video.paused) { var p = video.play(); if (p && p.catch) p.catch(function(){}); }
      if (stream && !scanTimer) loop();
    });

    window.DASH.doorRetry = function(){ stopStream(); start(); };
    window.DASH.doorFind = openSheet;
  }

  return { init: init, updateCount: updateCount, close: close };
})();
Door.init();

/* ---------------- Render all ---------------- */
function renderAll(){
  renderResumen();
  renderGuestsView();
  renderTablesView();
  renderGiftsView();
  renderMessagesView();
  renderCheckinView();
  renderStatsView();
  renderConfigView();
  renderPlanView();
  document.getElementById('nav-count-guests').textContent = STATE.guests.length;
  document.getElementById('nav-count-msgs').textContent = STATE.messages.filter(function(m){return m.unread;}).length;
  document.getElementById('nav-count-checkin').textContent = STATE.guests.filter(function(g){return g.checkedIn;}).length;
}
renderFaq('');
renderAll();
})();
