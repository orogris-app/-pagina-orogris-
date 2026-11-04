'use strict';
// OROGRIS V6: módulos independientes. Sin dependencias ni servicios de pago.
let v6Rentals=[],v6Reservations=[],v6Payments=[],v6Vehicles=[],v6Visits=[];
let v6RentalData=[],v6VehicleData=[],v6Unavailable=[];
let v6RentalEditing='',v6VehicleEditing='',v6Loaded={},v6LoadError='',v6Loading=false;
let v6RentalFiles=[],v6VehicleFiles=[],v6CalendarRental='',v6CalendarOffset=0;
const v6Date=s=>s?String(s).slice(0,10):'';
function v6Money(n){return n===null||n===undefined||n===''?'Por consultar':fmt(n)}
function v6SafePhoto(p){return (Array.isArray(p?.photos)?p.photos:[]).find(s=>typeof s==='string'&&/^https:\/\//i.test(s))||''}
function v6Notice(){return '<div class="tip info"><b>Prueba V6:</b> los datos se guardan en Supabase cuando las tablas V6 están instaladas. La V5 permanece independiente.</div>'}
function v6ErrorMarkup(){return v6LoadError?'<div class="tip warn"><b>Conexión V6 pendiente:</b> '+esc(v6LoadError)+'. Falta configurar las tablas nuevas en Supabase o comprobar la sesión.</div>':''}
function v6AdminEmpty(){return '<div class="tip info">En modo local estos módulos todavía no guardan información. Inicia sesión con Supabase para administrarlos.</div>'}
function v6OptDate(s){return s?esc(v6Date(s)):''}
function v6Owner(){return session?.user?.id||''}
function v6AnonHeaders(){let k=config.supabaseAnonKey||'';return {'apikey':k,...(k.startsWith('sb_')?{}:{Authorization:'Bearer '+k}),'Content-Type':'application/json'}}
async function v6PublicRequest(path,opts={}){const base=String(config.supabaseUrl||'').replace(/\/$/,'');if(!base||!config.supabaseAnonKey)throw Error('Conexión pública no disponible');const r=await fetch(base+path,{...opts,headers:{...v6AnonHeaders(),...(opts.headers||{})}});if(!r.ok)throw Error('Servicio temporalmente no disponible ('+r.status+')');if(r.status===204)return [];const t=await r.text();return t?JSON.parse(t):[]}
async function v6LoadAdmin(which='rentals'){
 if(backend!=='cloud'||!session){v6Loaded[which]=false;render();return}
 if(v6Loading)return;
 v6Loading=true;v6LoadError='';
 try{
  if(!await refreshSession())throw Error('Vuelve a iniciar sesión');
  const owner=encodeURIComponent(v6Owner());
  if(which==='rentals'){
   [v6Rentals,v6Reservations,v6Payments]=await Promise.all([
    sb('/rest/v1/og_rentals?owner_id=eq.'+owner+'&select=*&order=created_at.desc'),
    sb('/rest/v1/og_reservations?owner_id=eq.'+owner+'&select=*&order=created_at.desc'),
    sb('/rest/v1/og_rent_payments?owner_id=eq.'+owner+'&select=*&order=created_at.desc')
   ]);
  }else if(which==='vehicles')v6Vehicles=await sb('/rest/v1/og_vehicles?owner_id=eq.'+owner+'&select=*&order=created_at.desc');
  else if(which==='stats'){
   const date=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
   v6Visits=await sb('/rest/v1/og_visits?owner_id=eq.'+owner+'&visit_day=gte.'+date+'&select=page_type,property_id,visitor_key,visit_day&order=visit_day.desc&limit=5000');
  }
  v6Loaded[which]=true;
 }catch(e){v6Loaded[which]=false;v6LoadError=e.message||String(e)}
 finally{v6Loading=false;if(['rentals','vehicles','stats'].includes(tab))render()}
}
function v6CalendarView(){
 const r=v6Rentals.find(x=>x.id===v6CalendarRental)||v6Rentals[0];if(!r)return '';
 const today=new Date(),first=new Date(today.getFullYear(),today.getMonth()+v6CalendarOffset,1);
 const year=first.getFullYear(),month=first.getMonth(),days=new Date(year,month+1,0).getDate(),pad=(first.getDay()+6)%7;
 const name=first.toLocaleDateString('es-CO',{month:'long',year:'numeric'});
 let cells=['L','M','M','J','V','S','D'].map(d=>'<div class="v6-cal-head">'+d+'</div>').join('');
 cells+=Array.from({length:pad},()=>'<div class="v6-cal-blank"></div>').join('');
 for(let d=1;d<=days;d++){
  const date=year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  const booking=v6Reservations.find(b=>b.rental_id===r.id&&b.status==='confirmada'&&b.check_in<=date&&b.check_out>date);
  const pending=!booking&&v6Reservations.some(b=>b.rental_id===r.id&&b.status==='pendiente'&&b.check_in<=date&&b.check_out>date);
  cells+='<div class="v6-cal-day '+(booking?'v6-cal-occupied':pending?'v6-cal-pending':'')+'" title="'+(booking?'Reservado':pending?'Solicitud pendiente':'Disponible')+'">'+d+'</div>';
 }
 return '<section class="section"><div class="section-heading"><div><h2>Calendario de reservas</h2><p>Dorado: confirmada · Gris: solicitud pendiente</p></div></div><div class="form-field"><label>Propiedad</label><select class="field" id="v6CalendarRentalSelector">'+v6Rentals.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===r.id?'selected':'')+'>'+esc(x.title)+'</option>').join('')+'</select></div><div class="v6-cal-nav"><button class="btn small" data-v6-cal-nav="-1">Anterior</button><strong>'+esc(name)+'</strong><button class="btn small" data-v6-cal-nav="1">Siguiente</button></div><div class="v6-cal">'+cells+'</div></section>';
}
function v6RentalAdminView(){
 const totalDue=v6Payments.reduce((n,x)=>n+Number(x.amount_due||0),0),totalPaid=v6Payments.reduce((n,x)=>n+Number(x.amount_paid||0),0);
 const edit=v6Rentals.find(r=>r.id===v6RentalEditing);
 return headline('Arrendamientos y reservas','Administra contratos, cobros y solicitudes de estadías', '<button class="btn" data-action="v6reload">Actualizar</button>')+v6Notice()+v6ErrorMarkup()+
 '<div class="kpis"><div class="kpi"><div class="over">Propiedades</div><div class="number">'+v6Rentals.length+'</div></div><div class="kpi"><div class="over">Solicitudes pendientes</div><div class="number">'+v6Reservations.filter(r=>r.status==='pendiente').length+'</div></div><div class="kpi"><div class="over">Recaudado (registros)</div><div class="number" style="font-size:18px">'+v6Money(totalPaid)+'</div></div><div class="kpi"><div class="over">Cartera registrada</div><div class="number" style="font-size:18px">'+v6Money(Math.max(0,totalDue-totalPaid))+'</div></div></div>'+
 '<section class="section"><div class="section-heading"><div><h2>Propiedades para renta</h2><p>Por noches, fines de semana, meses o contrato tradicional.</p></div></div>'+
 (backend==='local'?v6AdminEmpty():'')+
 '<form id="v6RentalForm"><div class="two-col"><div class="form-field"><label>Vincular inmueble existente (opcional)</label><select class="field" id="v6LinkProperty"><option value="">Nueva propiedad para renta</option>'+items.map(p=>'<option value="'+esc(p.id)+'" '+(edit?.property_id===p.id?'selected':'')+'>'+esc(p.title)+'</option>').join('')+'</select></div><div class="form-field"><label>Nombre del arriendo *</label><input class="field" id="v6RTitle" required maxlength="180" value="'+esc(edit?.title||'')+'" placeholder="Casa finca de fin de semana"></div><div class="form-field"><label>Municipio</label><input class="field" id="v6RCity" value="'+esc(edit?.city||'')+'" placeholder="La Ceja"></div><div class="form-field"><label>Modalidad</label><select class="field" id="v6RMode">'+[['mixto','Por días y meses'],['dias','Días / fines de semana'],['meses','Meses'],['tradicional','Contrato tradicional']].map(([k,n])=>'<option value="'+k+'" '+((edit?.rental_mode||'mixto')===k?'selected':'')+'>'+n+'</option>').join('')+'</select></div><div class="form-field"><label>Tarifa por noche (COP)</label><input class="field" type="number" min="0" id="v6RNight" value="'+esc(edit?.nightly_rate??'')+'"></div><div class="form-field"><label>Tarifa fin de semana (COP)</label><input class="field" type="number" min="0" id="v6RWeekend" value="'+esc(edit?.weekend_rate??'')+'"></div><div class="form-field"><label>Canon mensual (COP)</label><input class="field" type="number" min="0" id="v6RMonth" value="'+esc(edit?.monthly_rate??'')+'"></div><div class="form-field"><label>Día de cobro mensual</label><input class="field" type="number" min="1" max="31" id="v6RDueDay" value="'+esc(edit?.due_day??'')+'"></div><div class="form-field"><label>Nombre del arrendatario (privado)</label><input class="field" id="v6RTenant" value="'+esc(edit?.tenant_name||'')+'"></div><div class="form-field"><label>Teléfono arrendatario (privado)</label><input class="field" type="tel" id="v6RTel" value="'+esc(edit?.tenant_phone||'')+'"></div><div class="form-field"><label>Inicio de contrato</label><input class="field" type="date" id="v6RStart" value="'+v6OptDate(edit?.contract_starts)+'"></div><div class="form-field"><label>Fin de contrato</label><input class="field" type="date" id="v6REnd" value="'+v6OptDate(edit?.contract_ends)+'"></div></div><div class="form-field"><label>Fotos del arriendo</label><input class="field" type="file" accept="image/*" multiple id="v6RentalFiles"><small>Desde el celular. También puedes vincular un inmueble existente para usar sus fotografías.</small><span id="v6RentalFilesCount" class="muted"></span></div><div class="form-field"><label>Descripción comercial pública (sin datos personales)</label><textarea class="field" id="v6RDesc" rows="3">'+esc(edit?.description||'')+'</textarea></div><div class="quick"><label><input type="checkbox" id="v6RPublic" '+(edit?.published?'checked':'')+'> Publicar en el catálogo de arriendos</label> <label><input type="checkbox" id="v6RActive" '+(!edit||edit.active?'checked':'')+'> Activa</label></div><div class="form-toolbar"><button class="btn gold" type="submit" '+(backend!=='cloud'?'disabled':'')+'>'+(edit?'Actualizar arriendo':'Guardar arriendo')+'</button>'+(edit?'<button class="btn" type="button" data-action="v6cancelRental">Cancelar edición</button>':'')+'</div></form></section>'+
 '<section class="section"><div class="section-heading"><div><h2>Mis arriendos</h2><p>Publicados y administrados por Orogris.</p></div></div>'+ (v6Rentals.length?'<div class="v6-list">'+v6Rentals.map(r=>'<article class="v6-item"><div><b>'+esc(r.title)+'</b><div class="muted">'+esc(r.rental_mode)+' · '+esc(r.city||'')+' · '+(r.published?'Publicado':'Privado')+'</div><div>'+v6Money(r.nightly_rate)+' / noche · '+v6Money(r.monthly_rate)+' / mes</div></div><button class="btn small" data-v6-edit-rental="'+esc(r.id)+'">Editar</button></article>').join('')+'</div>':'<p class="muted">Todavía no has registrado arriendos.</p>')+'</section>'+
 v6CalendarView()+'<section class="section"><div class="section-heading"><div><h2>Solicitudes de reserva</h2><p>Pendientes no bloquean fechas; solo tú confirmas.</p></div></div>'+ (v6Reservations.length?'<div class="v6-list">'+v6Reservations.map(r=>'<article class="v6-item"><div><b>'+esc(v6Rentals.find(x=>x.id===r.rental_id)?.title||'Propiedad')+'</b><div class="muted">'+esc(r.guest_name)+' · '+esc(r.guest_phone)+' · '+v6OptDate(r.check_in)+' a '+v6OptDate(r.check_out)+'</div><span class="pill '+(r.status==='confirmada'?'':r.status==='cancelada'?'sold':'draft')+'">'+esc(r.status)+'</span> '+(r.status==='pendiente'?'<a class="btn small green" href="tel:'+esc(String(r.guest_phone).replace(/[^+0-9]/g,''))+'">Llamar</a>':'')+'</div><div class="quick">'+(r.status==='pendiente'?'<button class="btn small green" data-v6-reservation="'+esc(r.id)+'" data-v6-status="confirmada">Confirmar</button><button class="btn small" data-v6-reservation="'+esc(r.id)+'" data-v6-status="cancelada">Cancelar</button>':'')+'</div></article>').join('')+'</div>':'<p class="muted">No hay solicitudes todavía.</p>')+'</section>'+
 '<section class="section"><div class="section-heading"><div><h2>Registro de pagos y cartera</h2><p>Control manual del canon; no realiza cobros bancarios.</p></div></div><form id="v6PaymentForm"><div class="two-col"><div class="form-field"><label>Inmueble</label><select class="field" id="v6PayRental" required>'+v6Rentals.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.title)+'</option>').join('')+'</select></div><div class="form-field"><label>Período (AAAA-MM)</label><input class="field" type="month" id="v6PayPeriod" required value="'+new Date().toISOString().slice(0,7)+'"></div><div class="form-field"><label>Vencimiento</label><input class="field" type="date" id="v6PayDue" required value="'+new Date().toISOString().slice(0,10)+'"></div><div class="form-field"><label>Valor a cobrar (COP)</label><input class="field" type="number" min="0" id="v6PayDueAmount" required></div><div class="form-field"><label>Abonado (COP)</label><input class="field" type="number" min="0" id="v6PayPaid" value="0"></div><div class="form-field"><label>Fecha del abono</label><input class="field" type="date" id="v6PayPaidOn"></div></div><button class="btn gold" type="submit" '+(!v6Rentals.length||backend!=='cloud'?'disabled':'')+'>Registrar pago</button></form>'+
 (v6Payments.length?'<div class="v6-list" style="margin-top:12px">'+v6Payments.map(p=>'<div class="v6-item"><div><b>'+esc(v6Rentals.find(r=>r.id===p.rental_id)?.title||'Arriendo')+'</b><div class="muted">'+esc(p.period)+' · vence '+v6OptDate(p.due_on)+'</div></div><div><b>'+v6Money(p.amount_paid)+'</b> / '+v6Money(p.amount_due)+'</div></div>').join('')+'</div>':'<p class="muted">Sin pagos registrados.</p>')+'</section>';
}
function v6VehicleAdminView(){
 const e=v6Vehicles.find(v=>v.id===v6VehicleEditing);
 return headline('Vehículos','Publica vehículos en venta de forma independiente', '<button class="btn" data-action="v6reload">Actualizar</button>')+v6Notice()+v6ErrorMarkup()+'<section class="section"><h2>'+(e?'Editar vehículo':'Nuevo vehículo')+'</h2><form id="v6VehicleForm"><div class="two-col"><div class="form-field"><label>Título *</label><input class="field" id="v6VTitle" required value="'+esc(e?.title||'')+'" placeholder="Mazda 3 Grand Touring"></div><div class="form-field"><label>Marca</label><input class="field" id="v6VBrand" value="'+esc(e?.brand||'')+'"></div><div class="form-field"><label>Modelo / referencia</label><input class="field" id="v6VModel" value="'+esc(e?.model||'')+'"></div><div class="form-field"><label>Año</label><input class="field" type="number" min="1950" max="2100" id="v6VYear" value="'+esc(e?.year??'')+'"></div><div class="form-field"><label>Kilometraje</label><input class="field" type="number" min="0" id="v6VMileage" value="'+esc(e?.mileage??'')+'"></div><div class="form-field"><label>Precio (COP)</label><input class="field" type="number" min="0" id="v6VPrice" value="'+esc(e?.price??'')+'"></div><div class="form-field"><label>Municipio</label><input class="field" id="v6VCity" value="'+esc(e?.city||'')+'"></div></div><div class="form-field"><label>Descripción</label><textarea class="field" id="v6VDesc" rows="3">'+esc(e?.description||'')+'</textarea></div><div class="form-field"><label>Fotografías del vehículo</label><input class="field" type="file" accept="image/*" multiple id="v6VehicleFiles"><small>Selecciona varias fotos desde el celular.</small><span id="v6VehicleFilesCount" class="muted"></span></div><div class="form-field"><label>URLs de fotos públicas, una por línea (opcional)</label><textarea class="field" id="v6VPhotos" rows="2" placeholder="https://...">'+esc((e?.photos||[]).join('\n'))+'</textarea></div><label><input type="checkbox" id="v6VPublished" '+(e?.published?'checked':'')+'> Publicar vehículo</label><div class="form-toolbar"><button class="btn gold" type="submit" '+(backend!=='cloud'?'disabled':'')+'>Guardar vehículo</button>'+(e?'<button class="btn" data-action="v6cancelVehicle" type="button">Cancelar</button>':'')+'</div></form></section><section class="section"><h2>Inventario de vehículos</h2>'+(v6Vehicles.length?'<div class="v6-list">'+v6Vehicles.map(v=>'<article class="v6-item"><div><b>'+esc(v.title)+'</b><div class="muted">'+esc(v.year||'')+' · '+esc(v.mileage||0)+' km · '+(v.published?'Publicado':'Borrador')+'</div><strong>'+v6Money(v.price)+'</strong></div><button class="btn small" data-v6-edit-vehicle="'+esc(v.id)+'">Editar</button></article>').join('')+'</div>':'<p class="muted">Aún no tienes vehículos registrados.</p>')+'</section>';
}
function v6StatsView(){
 const unique=new Set(v6Visits.filter(v=>v.page_type==='catalogo').map(v=>v.visitor_key+'|'+v.visit_day)).size;
 const byProp={};v6Visits.filter(v=>v.page_type==='propiedad').forEach(v=>{byProp[v.property_id]=(byProp[v.property_id]||0)+1});
 const top=Object.entries(byProp).sort((a,b)=>b[1]-a[1]).slice(0,10);
 return headline('Estadísticas','Visitas registradas en los últimos 30 días', '<button class="btn" data-action="v6reload">Actualizar</button>')+v6ErrorMarkup()+'<div class="tip info">Contamos visitas y sesiones anónimas, no personas identificadas. El histórico comienza al activar esta función; los datos anteriores no pueden recuperarse.</div><div class="kpis"><div class="kpi"><div class="over">Visitas registradas</div><div class="number">'+v6Visits.length+'</div></div><div class="kpi"><div class="over">Sesiones de catálogo</div><div class="number">'+unique+'</div></div><div class="kpi"><div class="over">Vistas de fichas</div><div class="number">'+v6Visits.filter(v=>v.page_type==='propiedad').length+'</div></div><div class="kpi"><div class="over">Consultas de arriendos</div><div class="number">'+v6Visits.filter(v=>v.page_type==='arriendos').length+'</div></div></div><section class="section"><h2>Propiedades más consultadas</h2>'+(top.length?top.map(([id,n],i)=>'<div class="v6-item"><span>'+(i+1)+'. '+esc(items.find(p=>p.id===id)?.title||'Ficha '+id.slice(0,8))+'</span><b>'+n+' visitas</b></div>').join(''):'<p class="muted">Sin visitas registradas todavía.</p>')+'</section>';
}
function v6PublicWrap(title,subtitle,content){
 return '<div class="catalogue"><header class="catalogue-header">'+brand()+'<a href="?admin=1">Acceso administrativo '+I('lock')+'</a></header><div class="v6-publicnav"><a href="./">Inmuebles</a><a href="?section=arriendos">Arriendos</a><a href="?section=vehiculos">Vehículos</a><a href="?section=hipotecas">Hipotecas</a></div><section class="catalogue-hero"><div class="eyebrow">OROGRIS SOLUCIONES INMOBILIARIAS</div><h1>'+esc(title)+'</h1><p>'+esc(subtitle)+'</p></section>'+content+'<footer class="catalogue-foot">© OROGRIS · Consulta disponibilidad y condiciones por WhatsApp</footer></div>';
}
function v6PublicRentalCard(r){
 const img=v6SafePhoto(r);
 return '<article class="property"><div class="cover">'+(img?'<img src="'+esc(img)+'" loading="lazy" alt="Foto de '+esc(r.title)+'">':'<div class="placeholder">Sin foto</div>')+'</div><div class="property-content"><h3>'+esc(r.title)+'</h3><div class="muted">'+esc(r.city||'')+'</div><p>'+esc(r.description||'')+'</p><div class="price">'+(r.nightly_rate?v6Money(r.nightly_rate)+' / noche':r.monthly_rate?v6Money(r.monthly_rate)+' / mes':'Precio a consultar')+'</div><p class="muted">Modalidad: '+esc(r.rental_mode)+'</p><button class="btn gold" data-v6-request="'+esc(r.id)+'">Consultar fechas</button></div></article>';
}
async function v6PublicRentals(){
 document.title='OROGRIS | Arriendos';
 $('#shell').innerHTML=v6PublicWrap('Arriendos y estadías','Casas, apartamentos y propiedades para días, fines de semana o meses. Las fechas se confirman personalmente.','<section class="catalogue-grid" id="v6RentalCards"><div class="empty">Cargando arriendos...</div></section><div id="v6BookingArea"></div>');
 try{v6RentalData=await v6PublicRequest('/rest/v1/rpc/og_public_rentals',{method:'POST',body:'{}'});$('#v6RentalCards').innerHTML=v6RentalData.length?v6RentalData.map(v6PublicRentalCard).join(''):'<p class="muted">Aún no tenemos propiedades publicadas para renta.</p>';if(v6RentalData[0])v6TrackVisit('arriendos',null,v6RentalData[0].owner_id)}
 catch(e){$('#v6RentalCards').innerHTML='<div class="tip info">La sección de arriendos está en preparación. Pronto publicaremos propiedades disponibles.</div>'}
}
function v6BookingForm(r){
 return '<section class="section v6-booking"><div class="section-heading"><div><h2>Solicitar fechas: '+esc(r.title)+'</h2><p>Esta solicitud no confirma ni bloquea las fechas.</p></div><button class="btn small" type="button" data-action="v6closeBooking">Cerrar</button></div><div class="tip info" id="v6BusyDates">Consultando fechas ocupadas...</div><form id="v6BookingForm"><input type="hidden" id="v6BookingRental" value="'+esc(r.id)+'"><div class="two-col"><div class="form-field"><label>Entrada *</label><input class="field" type="date" id="v6CheckIn" required min="'+new Date().toISOString().slice(0,10)+'"></div><div class="form-field"><label>Salida *</label><input class="field" type="date" id="v6CheckOut" required></div><div class="form-field"><label>Nombre *</label><input class="field" id="v6GuestName" required minlength="2" maxlength="120"></div><div class="form-field"><label>Celular *</label><input class="field" id="v6GuestPhone" type="tel" required minlength="7" maxlength="25"></div></div><label class="v6-check"><input id="v6Consent" type="checkbox" required> Autorizo que Orogris use mis datos para contactarme sobre esta solicitud. Entiendo que no hay reserva confirmada.</label><button class="btn green" type="submit">Enviar solicitud y abrir WhatsApp</button><p class="muted" style="margin-top:10px">No pagues anticipos sin confirmar personalmente las condiciones.</p></form></section>';
}
function v6PublicVehicleCard(v){
 const img=v6SafePhoto(v);
 return '<article class="property"><div class="cover">'+(img?'<img src="'+esc(img)+'" alt="'+esc(v.title)+'" loading="lazy">':'<div class="placeholder">Sin foto</div>')+'</div><div class="property-content"><h3>'+esc(v.title)+'</h3><div class="muted">'+esc(v.year||'')+' · '+esc(v.mileage??'')+' km · '+esc(v.city||'')+'</div><div class="price">'+v6Money(v.price)+'</div><p>'+esc(v.description||'')+'</p><a class="btn green" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+String(config.contactWhatsapp||'').replace(/\D/g,'')+'?text='+encodeURIComponent('Hola, vi en Orogris el vehículo '+v.title+'. Quisiera más información.')+'">Consultar por WhatsApp</a></div></article>';
}
async function v6PublicVehicles(){
 document.title='OROGRIS | Vehículos';
 $('#shell').innerHTML=v6PublicWrap('Vehículos en venta','Encuentra vehículos disponibles y conversa con Orogris por WhatsApp.','<section class="catalogue-grid" id="v6VehicleCards"><div class="empty">Cargando vehículos...</div></section>');
 try{v6VehicleData=await v6PublicRequest('/rest/v1/rpc/og_public_vehicles',{method:'POST',body:'{}'});$('#v6VehicleCards').innerHTML=v6VehicleData.length?v6VehicleData.map(v6PublicVehicleCard).join(''):'<p class="muted">Pronto publicaremos vehículos disponibles.</p>'; const owner=publicProperties?.[0]?.owner_id; if(owner)v6TrackVisit('vehiculos',null,owner)}
 catch{$('#v6VehicleCards').innerHTML='<div class="tip info">La sección de vehículos está en preparación.</div>'}
}
async function v6PublicMortgages(){
 document.title='OROGRIS | Hipotecas';
 $('#shell').innerHTML=v6PublicWrap('Hipotecas sobre inmuebles','Conoce cómo funciona una financiación respaldada por una propiedad.','<section class="section"><h2>¿Cómo funciona una hipoteca?</h2><p>Una hipoteca es una garantía real sobre un inmueble que respalda el cumplimiento de una obligación. La tasa de interés, el plazo y las condiciones dependen de quién otorgue la financiación y del contrato.</p><h3>Proceso orientativo</h3><p>1. Consulta inicial y capacidad de pago. 2. Revisión de la propiedad y estudio de títulos. 3. Cotización y verificación de condiciones. 4. Formalización mediante escritura y registro cuando corresponda. 5. Desembolso según el acuerdo.</p><div class="tip info">El formulario de documentos PDF y fotos se habilitará cuando dispongamos de almacenamiento privado y autorizaciones de tratamiento de datos. Por seguridad no solicitamos documentos sensibles desde esta página todavía.</div><a class="btn green" href="https://wa.me/'+String(config.contactWhatsapp||'').replace(/\D/g,'')+'?text='+encodeURIComponent('Hola Orogris, quiero conocer el proceso de hipoteca sobre mi inmueble.')+'" target="_blank" rel="noopener noreferrer">Preguntar por WhatsApp</a></section>');
}
async function v6TrackVisit(page_type,property_id=null,owner_id=null){
 try{
  if(!owner_id||!crypto?.randomUUID)return;
  const k='ogv6.track.'+new Date().toISOString().slice(0,10)+'.'+page_type+'.'+(property_id||'inicio');
  if(sessionStorage.getItem(k))return;
  let visitor=sessionStorage.getItem('ogv6.session');
  if(!visitor){visitor=crypto.randomUUID();sessionStorage.setItem('ogv6.session',visitor)}
  await v6PublicRequest('/rest/v1/og_visits',{method:'POST',headers:{Prefer:'return=minimal,resolution=ignore-duplicates'},body:JSON.stringify({owner_id,page_type,property_id,visitor_key:visitor})});
  sessionStorage.setItem(k,'1');
 }catch{/* Estadísticas opcionales: nunca interrumpir catálogo */}
}
function v6MoneyNumber(id){const s=$('#'+id)?.value;return s===''||s===undefined?null:Number(s)}
async function v6Upsert(table,payload,id){
 await refreshSession();
 const query=id?'?id=eq.'+encodeURIComponent(id):'';
 await sb('/rest/v1/'+table+query,{method:id?'PATCH':'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(payload)});
}
async function v6SubmitRental(e){
 e.preventDefault();
 if(backend!=='cloud')return toast('Conecta Supabase primero');
 const related=items.find(x=>x.id===$('#v6LinkProperty').value);
 const old=v6Rentals.find(x=>x.id===v6RentalEditing);
 const payload={owner_id:v6Owner(),property_id:related?.id||null,title:$('#v6RTitle').value.trim(),city:$('#v6RCity').value.trim(),description:$('#v6RDesc').value.trim(),rental_mode:$('#v6RMode').value,nightly_rate:v6MoneyNumber('v6RNight'),weekend_rate:v6MoneyNumber('v6RWeekend'),monthly_rate:v6MoneyNumber('v6RMonth'),due_day:v6MoneyNumber('v6RDueDay'),tenant_name:$('#v6RTenant').value.trim()||null,tenant_phone:$('#v6RTel').value.trim()||null,contract_starts:$('#v6RStart').value||null,contract_ends:$('#v6REnd').value||null,photos:related?.photos||old?.photos||[],published:$('#v6RPublic').checked,active:$('#v6RActive').checked,updated_at:new Date().toISOString()};
 try{const id=v6RentalEditing||crypto.randomUUID();if(!v6RentalEditing)payload.id=id;if(v6RentalFiles.length){await refreshSession();const uploaded=[];for(const file of v6RentalFiles)uploaded.push(await uploadPhoto(await compress(file),id));payload.photos=[...payload.photos,...uploaded].slice(0,40)}await v6Upsert('og_rentals',payload,v6RentalEditing);v6RentalEditing='';v6RentalFiles=[];toast('Arriendo guardado');await v6LoadAdmin('rentals')}catch(err){toast('No se guardó: '+err.message)}
}
async function v6SubmitPayment(e){
 e.preventDefault();const payload={owner_id:v6Owner(),rental_id:$('#v6PayRental').value,period:$('#v6PayPeriod').value,due_on:$('#v6PayDue').value,amount_due:Number($('#v6PayDueAmount').value),amount_paid:Number($('#v6PayPaid').value||0),paid_on:$('#v6PayPaidOn').value||null};
 try{await v6Upsert('og_rent_payments',payload);toast('Pago registrado');await v6LoadAdmin('rentals')}catch(err){toast('Error: '+err.message)}
}
async function v6SubmitVehicle(e){
 e.preventDefault();const old=v6Vehicles.find(v=>v.id===v6VehicleEditing);
 const payload={owner_id:v6Owner(),title:$('#v6VTitle').value.trim(),brand:$('#v6VBrand').value.trim(),model:$('#v6VModel').value.trim(),year:v6MoneyNumber('v6VYear'),mileage:v6MoneyNumber('v6VMileage'),price:v6MoneyNumber('v6VPrice'),city:$('#v6VCity').value.trim(),description:$('#v6VDesc').value.trim(),photos:$('#v6VPhotos').value.split(/\r?\n/).map(v=>v.trim()).filter(v=>/^https:\/\//i.test(v)).slice(0,30),published:$('#v6VPublished').checked,updated_at:new Date().toISOString()};
 try{const id=v6VehicleEditing||crypto.randomUUID();if(!v6VehicleEditing)payload.id=id;if(v6VehicleFiles.length){await refreshSession();const uploaded=[];for(const file of v6VehicleFiles)uploaded.push(await uploadPhoto(await compress(file),id));payload.photos=[...payload.photos,...uploaded].slice(0,30)}await v6Upsert('og_vehicles',payload,v6VehicleEditing);v6VehicleEditing='';v6VehicleFiles=[];toast('Vehículo guardado');await v6LoadAdmin('vehicles')}catch(err){toast('Error: '+err.message)}
}
async function v6SubmitBooking(e){
 e.preventDefault();
 const r=v6RentalData.find(x=>x.id===$('#v6BookingRental').value);
 const from=$('#v6CheckIn').value,to=$('#v6CheckOut').value,name=$('#v6GuestName').value.trim(),phone=$('#v6GuestPhone').value.trim();
 if(!r||!from||!to||from>=to||!$('#v6Consent').checked)return toast('Revisa las fechas y la autorización');if(v6Unavailable.some(b=>from<b.check_out&&to>b.check_in))return toast('Estas fechas ya están ocupadas. Selecciona otras.');
 if(!/^[+0-9 ()-]{7,25}$/.test(phone))return toast('Revisa el número de celular');
 const btn=e.target.querySelector('[type=submit]');btn.disabled=true;
 try{
  await v6PublicRequest('/rest/v1/og_reservations',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({owner_id:r.owner_id,rental_id:r.id,check_in:from,check_out:to,guest_name:name,guest_phone:phone,status:'pendiente',total_cop:0,deposit_cop:0,notes:''})});
  const text='Hola Orogris. Solicité fechas para '+r.title+'. Entrada: '+from+'. Salida: '+to+'. Soy '+name+', celular '+phone+'. Entiendo que está pendiente de confirmación.';
  const digits=String(config.contactWhatsapp||'').replace(/\D/g,'');
  $('#v6BookingArea').innerHTML='<div class="tip green"><b>Solicitud registrada.</b> Abre WhatsApp para terminar de contactar a Orogris. La reserva todavía no está confirmada.</div><a class="btn green" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+digits+'?text='+encodeURIComponent(text)+'">Abrir WhatsApp</a>';
  window.location.href='https://wa.me/'+digits+'?text='+encodeURIComponent(text);
 }catch(err){toast('No se registró la solicitud. Inténtalo de nuevo.');btn.disabled=false}
}
async function v6ChangeReservation(id,status){
 const rec=v6Reservations.find(r=>r.id===id);if(!rec)return;
 if(status==='confirmada'&&!confirm('¿Confirmar reserva del '+v6Date(rec.check_in)+' al '+v6Date(rec.check_out)+'? Bloquearás esas noches.'))return;
 try{await v6Upsert('og_reservations',{status,updated_at:new Date().toISOString()},id);toast('Reserva '+status);await v6LoadAdmin('rentals')}catch(err){toast('No se pudo actualizar: '+err.message+'. Comprueba que no se crucen fechas.')}
}
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-v6-edit-rental],[data-v6-edit-vehicle],[data-v6-reservation],[data-v6-request],[data-action]');
 if(!target)return;
 if(target.dataset.v6EditRental){v6RentalEditing=target.dataset.v6EditRental;render();window.scrollTo(0,0)}
 if(target.dataset.v6EditVehicle){v6VehicleEditing=target.dataset.v6EditVehicle;render();window.scrollTo(0,0)}
 if(target.dataset.v6Reservation){v6ChangeReservation(target.dataset.v6Reservation,target.dataset.v6Status)}
 if(target.dataset.v6Request){let r=v6RentalData.find(x=>x.id===target.dataset.v6Request);if(r){$('#v6BookingArea').innerHTML=v6BookingForm(r);v6Unavailable=[];v6PublicRequest('/rest/v1/rpc/og_unavailable_periods',{method:'POST',body:JSON.stringify({p_rental:r.id})}).then(busy=>{v6Unavailable=busy;const el=$('#v6BusyDates');if(el)el.innerHTML=busy.length?'<b>Fechas ya confirmadas:</b> '+busy.map(x=>esc(x.check_in)+' a '+esc(x.check_out)).join(' · '):'No hay fechas confirmadas registradas para esta propiedad.'}).catch(()=>{const el=$('#v6BusyDates');if(el)el.textContent='Confirma la disponibilidad por WhatsApp.'});$('#v6BookingArea').scrollIntoView({behavior:'smooth'})}}
 if(target.dataset.action==='v6closeBooking'){$('#v6BookingArea').innerHTML=''}
 if(target.dataset.action==='v6cancelRental'){v6RentalEditing='';render()}
 if(target.dataset.action==='v6cancelVehicle'){v6VehicleEditing='';render()}
 if(target.dataset.v6CalNav){v6CalendarOffset+=Number(target.dataset.v6CalNav);render()}
 if(target.dataset.action==='v6reload')v6LoadAdmin(tab);
});
document.addEventListener('change',e=>{if(e.target.id==='v6RentalFiles'){v6RentalFiles=[...e.target.files].slice(0,20);const el=$('#v6RentalFilesCount');if(el)el.textContent=v6RentalFiles.length+' fotos seleccionadas'}if(e.target.id==='v6VehicleFiles'){v6VehicleFiles=[...e.target.files].slice(0,20);const el=$('#v6VehicleFilesCount');if(el)el.textContent=v6VehicleFiles.length+' fotos seleccionadas'}if(e.target.id==='v6CalendarRentalSelector'){v6CalendarRental=e.target.value;render()}});
document.addEventListener('submit',e=>{
 if(e.target.id==='v6RentalForm')v6SubmitRental(e);
 if(e.target.id==='v6PaymentForm')v6SubmitPayment(e);
 if(e.target.id==='v6VehicleForm')v6SubmitVehicle(e);
 if(e.target.id==='v6BookingForm')v6SubmitBooking(e);
});
