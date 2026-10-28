import { CONFIG, MENU, SVC, deposit, bankText } from "./datos.mjs";
const money = n => "RD$" + n.toLocaleString("en-US");
const priceLabel = s => s.price==null ? "Sujeto a valoración" : (s.from?"Desde ":"") + money(s.price) + (s.max? "–"+money(s.max).replace("RD$",""):"");

const state = { sel:[], day:null, time:null, cat:"all" };
const $ = id => document.getElementById(id);

function renderTabs(){
  const t=[["all","Todo"],...MENU.map(c=>[c.id,c.t.replace("Diseño y cuidado de ","").replace(" de cejas","").replace("Lifting y extensiones de pestañas","Pestañas")])];
  $("tabs").innerHTML = t.map(([id,l])=>`<button class="tab" data-cat="${id}" aria-pressed="${state.cat===id}">${l.charAt(0).toUpperCase()+l.slice(1)}</button>`).join("");
}
function renderMenu(){
  $("menu").innerHTML = MENU.filter(c=>state.cat==="all"||state.cat===c.id).map(c=>`
   <section class="cat" id="cat-${c.id}">
    <h2>${c.t}</h2><p class="intro">${c.intro}</p>
    ${c.groups.map(([g,list])=>`<h3>${g}</h3>`+list.map(r=>{const s=SVC[r[0]];const on=state.sel.includes(s.id);
      const dis = s.price==null || (s.id==="g5" && !state.sel.some(x=>["g1","g2","g3","g4"].includes(x)));
      return `<div class="svc"><div><div class="n">${s.name}</div>${s.detail?`<div class="d">${s.detail}</div>`:""}</div>
       <div class="p">${priceLabel(s)}${s.min?`<small>~${fmtDur(s.min)}</small>`:""}</div>
       <button class="add" data-id="${s.id}" aria-pressed="${on}" aria-label="${on?"Quitar":"Agregar"} ${s.name}" ${dis&&!on?"disabled":""}>${on?"✓":"+"}</button></div>`}).join("")).join("")}
    ${c.note?`<div class="note"><strong>Condiciones</strong><ul>${c.note.map(n=>`<li>${n}</li>`).join("")}</ul></div>`:""}
   </section>`).join("");
}
const fmtDur = m => m>=60 ? `${Math.floor(m/60)} h${m%60?" "+m%60+" min":""}` : `${m} min`;

function totals(){
  const items=state.sel.map(id=>SVC[id]);
  const total=items.reduce((a,s)=>a+s.price,0);
  const mins=items.reduce((a,s)=>a+s.min,0);
  const variable=items.some(s=>s.from||s.max);
  return {items,total,mins,variable};
}

const DAYN=["dom","lun","mar","mié","jue","vie","sáb"], MON=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function dayList(){
  const out=[], d=new Date(); d.setHours(0,0,0,0);
  for(let i=0;i<CONFIG.daysAhead;i++){const x=new Date(d);x.setDate(d.getDate()+i);out.push(x)}
  return out;
}
const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
let BUSY=[]; // horarios ocupados {date,time,mins}, de la agenda
const toMin = t => {const [h,m]=t.split(":").map(Number);return h*60+m};
const hh = n => String(n).padStart(2,"0");
// Horario semanal y horas bloqueadas; el servidor manda el que Darleny tenga guardado
let HORARIO={semana:Object.fromEntries([0,1,2,3,4,5,6].map(d=>[d,CONFIG.open[d]?[hh(CONFIG.open[d][0])+":00",hh(CONFIG.open[d][1])+":00"]:null])),bloqueos:[]};
const blockRange = b => [b.from?toMin(b.from):0, b.to?toMin(b.to):1440];
function slotsFor(date, mins){
  const h=HORARIO.semana[date.getDay()]; if(!h) return [];
  const out=[], now=new Date(), need=Math.max(mins,30), dk=key(date);
  const blocks=HORARIO.bloqueos.filter(b=>b.date===dk).map(blockRange);
  for(let m=toMin(h[0]);m+need<=toMin(h[1]);m+=30){
    const t=new Date(date); t.setHours(0,m,0,0);
    const taken=BUSY.some(b=>b.date===dk && m<toMin(b.time)+(b.mins||60) && toMin(b.time)<m+need) || blocks.some(([f,e])=>m<e&&f<m+need);
    out.push({m, label:`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`, past: t < new Date(now.getTime()+2*3600e3), taken});
  }
  return out;
}
const to12 = l => {let [h,m]=l.split(":").map(Number);const ap=h>=12?"p. m.":"a. m.";h=h%12||12;return `${h}:${String(m).padStart(2,"0")} ${ap}`};

function renderPanel(){
  const {items,total,mins,variable}=totals();
  $("picked").innerHTML = items.length ? items.map(s=>`<li><span>${s.name}</span><span class="num">${priceLabel(s)}<button class="rm" data-id="${s.id}" aria-label="Quitar ${s.name}">×</button></span></li>`).join("")
    : `<li class="empty">Agrega servicios desde el menú con el botón +.</li>`;
  const days=dayList();
  $("days").innerHTML = days.map(d=>{const closed=!HORARIO.semana[d.getDay()]||!slotsFor(d,mins).some(s=>!s.past&&!s.taken);
    return `<button class="day" data-day="${key(d)}" aria-pressed="${state.day===key(d)}" ${closed?"disabled":""}>${DAYN[d.getDay()]}<b>${d.getDate()}</b>${MON[d.getMonth()]}</button>`}).join("");
  const day=days.find(d=>key(d)===state.day);
  if(!items.length){$("slots").innerHTML=`<p class="empty" style="grid-column:1/-1">Primero elige un servicio.</p>`}
  else if(!day){$("slots").innerHTML=`<p class="empty" style="grid-column:1/-1">Elige un día.</p>`}
  else{const sl=slotsFor(day,mins); if(state.time && !sl.some(s=>s.label===state.time&&!s.past&&!s.taken)) state.time=null;
    $("slots").innerHTML=sl.map(s=>`<button class="slot" data-time="${s.label}" aria-pressed="${state.time===s.label}" ${s.past||s.taken?"disabled":""} ${s.taken?'title="Ocupado"':""}>${to12(s.label).replace(" ","&nbsp;")}</button>`).join("")}
  $("waxWarn").hidden = !items.some(s=>s.cat==="cera"||["c3","c7","c9","c10"].includes(s.id));
  $("durNote").textContent = items.length ? `Duración estimada: ${fmtDur(mins)}. Los tiempos son estimados y pueden variar según las necesidades de cada clienta.` : "";
  const dep=deposit(total);
  $("tTotal").textContent = (variable?"Desde ":"")+money(total);
  $("tDepLabel").textContent = dep.label;
  $("tDep").textContent = money(dep.amt);
  $("tRest").textContent = (variable&&total-dep.amt>0?"Desde ":"")+money(total-dep.amt);
  $("tRule").textContent = items.length ? dep.rule + (variable?" El total final puede variar según el trabajo; el depósito se calcula sobre el precio base.":"") : "El depósito se calcula según la política de reservas.";
  $("go").disabled = !(items.length && state.day && state.time);
  $("bar").hidden = !items.length;
  $("barTxt").textContent = `${items.length} servicio${items.length>1?"s":""} · ${money(total)}`;
}

function buildMsg(id){
  const {items,total,mins,variable}=totals(), dep=deposit(total);
  const d=new Date(state.day+"T12:00:00");
  const fecha=`${["domingo","lunes","martes","miércoles","jueves","viernes","sábado"][d.getDay()]} ${d.getDate()} de ${["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][d.getMonth()]}`;
  return `Hola Darleny Aesthetic Studio, acabo de reservar una cita en la web:\n\n`+
   items.map(s=>`• ${s.name} (${priceLabel(s)})`).join("\n")+
   `\n\nFecha: ${fecha}\nHora: ${to12(state.time)}\nDuración estimada: ${fmtDur(mins)}\n\nTotal: ${variable?"desde ":""}${money(total)}\n${dep.label}: ${money(dep.amt)}\nRestante el día de la cita: ${money(total-dep.amt)}\n\nNombre: ${$("fName").value.trim()}\nWhatsApp: ${$("fPhone").value.trim()}\nCódigo de reserva: ${id}\n\nTe envío el comprobante del depósito. He leído la política de reservas y sé que hay 10 minutos de tolerancia.`;
}

document.addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.cat){state.cat=b.dataset.cat;renderTabs();renderMenu();return}
  if(b.classList.contains("add")||b.classList.contains("rm")){
    const id=b.dataset.id, i=state.sel.indexOf(id);
    if(i>=0) state.sel.splice(i,1); else state.sel.push(id);
    if(!state.sel.some(x=>["g1","g2","g3","g4"].includes(x))) state.sel=state.sel.filter(x=>x!=="g5");
    $("confirm").innerHTML=""; renderMenu(); renderPanel(); return;
  }
  if(b.dataset.day){state.day=b.dataset.day;renderPanel();return}
  if(b.dataset.time){state.time=b.dataset.time;renderPanel();return}
  if(b.id==="barBtn"){$("panel").scrollIntoView({behavior:"smooth"});return}
  if(b.id==="go"){ reservar(b); return; }
  if(b.id==="copy"){
    const txt=$("msg").textContent;
    navigator.clipboard?.writeText(txt).then(()=>b.textContent="Copiado").catch(()=>{const r=document.createRange();r.selectNodeContents($("msg"));const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent="Selecciona y copia"});
  }
});

renderTabs(); renderMenu(); renderPanel();
const DIAS=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
function renderHours(){
  $("hoursList").innerHTML=[1,2,3,4,5,6,0].map(d=>{const h=HORARIO.semana[d];
    return `<div class="${d===new Date().getDay()?"today":""}"><dt>${DIAS[d]}</dt><dd>${h?`${to12(h[0])} – ${to12(h[1])}`:"Cerrado"}</dd></div>`}).join("");
}
renderHours();

// ===== Reserva en línea =====
const api=async(path,opts={})=>{
  const r=await fetch("/api/"+path,{...opts,headers:{...(opts.headers||{}),...(ADMIN.pass?{authorization:"Bearer "+ADMIN.pass}:{})}});
  let data={}; try{data=await r.json()}catch{}
  if(!r.ok) throw Object.assign(new Error(data.error||"Error"),{status:r.status});
  return data;
};
const ADMIN={pass:null};
async function loadBusy(){
  try{const [b,h]=await Promise.all([api("ocupado"),api("horario")]);BUSY=b;if(h&&h.semana)HORARIO=h;renderHours();renderPanel()}catch{}
}

async function reservar(btn){
  const name=$("fName").value.trim(), phone=$("fPhone").value.replace(/\D/g,"");
  const err=t=>{$("err").hidden=!t;$("err").textContent=t||""};
  if(!name||phone.length<10){err("Escribe tu nombre y un número de WhatsApp de 10 dígitos para poder confirmarte.");return}
  err(""); btn.disabled=true; btn.textContent="Reservando…";
  try{
    const {cita}=await api("reservar",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({name,phone:$("fPhone").value.trim(),date:state.day,time:state.time,services:state.sel})});
    const {total}=totals(), dep=deposit(total), msg=buildMsg(cita.id);
    const wa=`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
    $("confirm").innerHTML=`<div class="confirm"><h4>¡Tu cita está apartada!</h4>
      <p style="margin:0;font-size:14px">Queda confirmada cuando Darleny reciba ${dep.amt===total?"el pago completo":"el depósito"} de <strong>${money(dep.amt)}</strong>. Haz la transferencia y envía el comprobante por WhatsApp con este mensaje.</p>
      <div class="payMini">${payCards()}</div>
      <pre id="msg">${esc(msg)}</pre>
      <div class="row" style="margin-top:8px"><a class="btn2" href="${wa}" target="_blank" rel="noopener">Enviar comprobante por WhatsApp</a><button class="btn2" id="copy">Copiar mensaje</button></div></div>`;
    state.sel=[];state.day=null;state.time=null;$("fName").value="";$("fPhone").value="";
    await loadBusy(); renderMenu(); renderPanel(); if(ADMIN.pass) loadAgenda();
    $("confirm").scrollIntoView({behavior:"smooth",block:"nearest"});
  }catch(e){
    err(e.status?e.message:"No se pudo conectar. Revisa tu internet y vuelve a intentarlo.");
    if(e.status===409){state.time=null;loadBusy()}
  }finally{btn.textContent="Solicitar cita";renderPanel()}
}
loadBusy(); setInterval(()=>{if(!document.hidden)loadBusy()},60000);

// ===== Galería de trabajos =====
const GCATS=[["cejas","Cejas"],["pestanas","Pestañas"],["micro","Micropigmentación"],["depilacion","Depilación"]];
const GAL={items:[],cat:"all",admin:false,sure:null};
const esc=t=>String(t??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const gSrc=x=>"/api/foto/"+encodeURIComponent(x.id);
$("gCat").innerHTML=GCATS.map(([k,l])=>`<option value="${k}">${l}</option>`).join("");
function renderGal(){
  const counts=Object.fromEntries(GCATS.map(([k])=>[k,GAL.items.filter(x=>x.cat===k).length]));
  $("gTabs").hidden=!GAL.items.length;
  $("gTabs").innerHTML=[["all","Todos"],...GCATS].filter(([k])=>k==="all"||counts[k]).map(([k,l])=>`<button class="tab" data-gcat="${k}" aria-pressed="${GAL.cat===k}">${l}</button>`).join("");
  const list=GAL.items.filter(x=>GAL.cat==="all"||x.cat===GAL.cat);
  if(!list.length){
    $("gal").innerHTML=`<div class="gEmpty"><strong>Pronto verás aquí nuestros trabajos</strong>${GAL.admin?"Sube las primeras fotos con el recuadro de arriba.":"Mientras tanto, reserva tu cita y sé de las primeras."}</div>`;return;
  }
  const lab=k=>(GCATS.find(c=>c[0]===k)||[,""])[1];
  $("gal").innerHTML=`<div class="carousel"><button class="cNav prev" data-cnav="-1" aria-label="Fotos anteriores">‹</button><button class="cNav next" data-cnav="1" aria-label="Más fotos">›</button><div class="grid" id="gRow">${list.map(x=>`<figure class="ph">
    <button class="open" data-view="${x.id}" aria-label="Ver foto ${esc(x.caption||lab(x.cat))}"><img src="${gSrc(x)}" alt="${esc(x.caption||lab(x.cat))}" loading="lazy"></button>
    <figcaption><span>${esc(x.caption||"")}</span><span>${lab(x.cat)}</span></figcaption>
    ${GAL.admin?`<button class="del ${GAL.sure===x.id?"sure":""}" data-del="${x.id}">${GAL.sure===x.id?"¿Borrar? Toca otra vez":"Borrar"}</button>`:""}
  </figure>`).join("")}</div></div>`;
}
// Carrusel: avanza solo hacia la izquierda cada pocos segundos; se detiene mientras la clienta lo toca
const slide=dir=>{const row=$("gRow");if(!row)return;const step=(row.querySelector(".ph")?.offsetWidth||260)+12;
  if(dir>0&&row.scrollLeft+row.clientWidth>=row.scrollWidth-4) row.scrollTo({left:0}); else row.scrollBy({left:dir*step})};
let hold=0;
["pointerdown","wheel","touchstart","mouseenter","focusin"].forEach(ev=>$("gal").addEventListener(ev,()=>{hold=Date.now()},{passive:true}));
if(!matchMedia("(prefers-reduced-motion: reduce)").matches)
  setInterval(()=>{if(!document.hidden&&Date.now()-hold>8000&&!document.querySelector(".lb"))slide(1)},3500);
function gStatus(t){$("gStatus").hidden=!t;$("gStatus").textContent=t||""}
async function loadGal(){try{GAL.items=await api("galeria")}catch{} renderGal()}
loadGal();

async function shrink(file){
  try{
    const bmp=await createImageBitmap(file), k=Math.min(1,1600/Math.max(bmp.width,bmp.height));
    const c=document.createElement("canvas");c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
    c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
    return await new Promise(res=>c.toBlob(b=>res(b||file),"image/jpeg",.85));
  }catch{return file}
}
$("gFiles").addEventListener("change",()=>{$("gUp").disabled=!$("gFiles").files.length});
$("gUp").addEventListener("click",async()=>{
  const files=[...$("gFiles").files]; if(!files.length) return;
  $("gUp").disabled=true; let ok=0;
  for(const [i,f] of files.entries()){
    gStatus(`Subiendo ${i+1} de ${files.length}…`);
    try{const blob=await shrink(f);
      await api(`admin/fotos?cat=${encodeURIComponent($("gCat").value)}&caption=${encodeURIComponent($("gCap").value.trim())}`,{method:"POST",headers:{"content-type":blob.type||"image/jpeg"},body:blob});ok++}
    catch(e){gStatus(`No se pudo subir "${f.name}". ${e.message}`)}
  }
  if(ok){gStatus(`${ok} foto${ok>1?"s":""} publicada${ok>1?"s":""}.`);$("gFiles").value="";$("gCap").value=""}
  await loadGal();
});
document.addEventListener("click",async e=>{
  const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.gcat){GAL.cat=b.dataset.gcat;renderGal();return}
  if(b.dataset.cnav){hold=Date.now();slide(+b.dataset.cnav);return}
  if(b.dataset.view){const x=GAL.items.find(i=>i.id===b.dataset.view);const lb=document.createElement("div");lb.className="lb";lb.setAttribute("role","dialog");
    lb.innerHTML=`<img src="${gSrc(x)}" alt="${esc(x.caption||"")}"><p>${esc(x.caption||"")}</p><button>Cerrar</button>`;
    lb.addEventListener("click",()=>lb.remove());document.addEventListener("keydown",function k(ev){if(ev.key==="Escape"){lb.remove();document.removeEventListener("keydown",k)}});
    document.body.appendChild(lb);lb.querySelector("button").focus();return}
  if(b.dataset.del){
    const id=b.dataset.del; if(GAL.sure!==id){GAL.sure=id;renderGal();return}
    GAL.sure=null; try{await api("admin/fotos/"+id,{method:"DELETE"});gStatus("Foto borrada.")}catch(e){gStatus(e.message)}
    loadGal();
  }
});

// ===== Agenda (solo para quien administra la página) =====
const ST={pendiente:"Esperando depósito",confirmada:"Depósito recibido",completada:"Completada",cancelada:"Cancelada",no_asistio:"No asistió"};
const ACTIVE=["pendiente","confirmada"];
const AG={admin:false,items:[],tab:"proximas",sure:null,force:false,formSvc:null};
const today=()=>key(new Date());
const longDate=k=>{const d=new Date(k+"T12:00:00");return `${["domingo","lunes","martes","miércoles","jueves","viernes","sábado"][d.getDay()]} ${d.getDate()} de ${["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"][d.getMonth()]}`};
const shortDate=k=>{const d=new Date(k+"T12:00:00");return `${DAYN[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`};
const waLink=(p,msg)=>{let d=String(p||"").replace(/\D/g,"");if(d.length===10)d="1"+d;return d.length>=11?`https://wa.me/${d}`+(msg?`?text=${encodeURIComponent(msg)}`:""):""};

function renderAgenda(){
  const t=today(), wk=key(new Date(Date.now()+7*864e5));
  const act=AG.items.filter(x=>ACTIVE.includes(x.status));
  const hoy=act.filter(x=>x.date===t), pend=AG.items.filter(x=>x.status==="pendiente"&&x.date>=t), sem=act.filter(x=>x.date>=t&&x.date<=wk);
  $("agStats").innerHTML=[["Hoy",hoy.length,hoy.length?"Primera a las "+to12(hoy.map(x=>x.time).sort()[0]):(()=>{const n=act.filter(x=>x.date>t).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))[0];return n?`Próxima: ${shortDate(n.date)}, ${to12(n.time)}`:"Sin citas"})()],
    ["Próximos 7 días",sem.length,money(sem.reduce((a,x)=>a+(+x.total||0),0))+" en servicios"],
    ["Esperando depósito",pend.length,money(pend.reduce((a,x)=>a+(+x.deposit||0),0))+" por recibir"]]
    .map(([a,b,c])=>`<div class="stat"><div class="t">${a}</div><div class="v num">${b}</div><div class="s">${c}</div></div>`).join("");
  const tabs=[["proximas","Próximas"],["pendientes","Esperando depósito"],["historial","Historial"],["canceladas","Canceladas"]];
  $("agTabs").innerHTML=tabs.map(([k,l])=>`<button class="tab" data-agtab="${k}" aria-pressed="${AG.tab===k}">${l}</button>`).join("");
  let list=AG.items.filter(x=>({proximas:x.date>=t&&ACTIVE.includes(x.status),pendientes:x.date>=t&&x.status==="pendiente",
    historial:(x.date<t&&x.status!=="cancelada")||x.status==="completada"||x.status==="no_asistio",canceladas:x.status==="cancelada"})[AG.tab]);
  list.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)); if(AG.tab==="historial"||AG.tab==="canceladas") list.reverse();
  if(!list.length){$("agList").innerHTML=`<div class="agEmpty">${AG.tab==="proximas"?"No hay citas próximas. Las reservas de la web aparecen aquí solas; las que te lleguen por WhatsApp agrégalas abajo con \"Agregar cita\".":"No hay citas aquí."}</div>`;return}
  let html="",last="";
  for(const x of list){
    if(x.date!==last){html+=`<div class="agDay">${longDate(x.date)}${x.date===t?" · hoy":""}</div>`;last=x.date}
    const sure=AG.sure===x.id, first=(x.name||"").split(" ")[0];
    const cuando=`el ${longDate(x.date)} a las ${to12(x.time)}`;
    const wa=x.status==="pendiente"?waLink(x.phone,`Hola ${first}, recibí tu solicitud de cita en Darleny Aesthetic Studio para ${cuando} (${x.servicesText}). Para confirmarla, envía ${(+x.deposit||0)>=(+x.total||0)?"el pago":"el depósito"} de ${money(+x.deposit||0)} a una de estas cuentas y mándame el comprobante por aquí:\n\n${bankText()}`)
      :x.status==="confirmada"?waLink(x.phone,`Hola ${first}, recibí tu ${(+x.deposit||0)>=(+x.total||0)?"pago":"depósito"} de ${money(+x.deposit||0)}. Tu cita en Darleny Aesthetic Studio queda confirmada para ${cuando}. Restante a pagar ese día: ${money((+x.total||0)-(+x.deposit||0))}. Recuerda que para cambiar la fecha debes avisar con 24 horas de anticipación.`)
      :waLink(x.phone);
    const waLabel=x.status==="pendiente"?"Pedir depósito":x.status==="confirmada"?"Enviar confirmación":"WhatsApp";
    const btn=(st,l,cls="")=>`<button class="${cls}" data-st="${st}" data-cita="${x.id}">${l}</button>`;
    const acts=x.status==="pendiente"?btn("confirmada","Depósito recibido","pri")+btn("cancelada","Cancelar")
      :x.status==="confirmada"?btn("completada","Completada","pri")+btn("no_asistio","No asistió")+btn("cancelada","Cancelar")
      :btn("pendiente","Reabrir")+`<button class="${sure?"sure":""}" data-borrar="${x.id}">${sure?"¿Borrar? Toca otra vez":"Borrar"}</button>`;
    html+=`<div class="cita"><div class="h"><span class="dd">${shortDate(x.date)}</span>${to12(x.time)}<small>${fmtDur(+x.mins||60)}</small></div>
      <div><div class="who">${esc(x.name)}<span class="chip ${x.status}">${ST[x.status]||esc(x.status)}</span></div>
      <div class="ph2">${esc(x.phone||"")}</div><div class="sv">${esc(x.servicesText||"")}</div>
      <div class="money">Total ${money(+x.total||0)} · ${(+x.deposit||0)>=(+x.total||0)?"Pago completo":"Depósito"} ${money(+x.deposit||0)}</div></div>
      <div class="acts">${wa?`<a href="${wa}" target="_blank" rel="noopener">${waLabel}</a>`:""}${acts}</div></div>`;
  }
  $("agList").innerHTML=html;
}
function aMsg(t){$("aMsg").hidden=!t;$("aMsg").textContent=t||""}
function updDep(){const t=+$("aTotal").value||0;$("aDep").textContent=t?`${deposit(t).label}: ${money(deposit(t).amt)} · Restante: ${money(t-deposit(t).amt)}`:""}
$("aTotal").addEventListener("input",updDep);
$("aSvc").addEventListener("input",()=>{AG.formSvc=null});
["aDate","aTime","aMins"].forEach(i=>$(i).addEventListener("input",()=>{AG.force=false}));

$("aParse").addEventListener("click",()=>{
  const t=$("aPaste").value, c=t.match(/DAR-(\d{8})-(\d{4})-([\w.]+)/);
  const n=t.match(/Nombre:\s*(.+)/), p=t.match(/WhatsApp:\s*([\d\s()+-]+)/);
  if(n)$("aName").value=n[1].trim(); if(p)$("aPhone").value=p[1].trim();
  if(c){const d=c[1],h=c[2],ids=c[3].split(".").filter(id=>SVC[id]);
    $("aDate").value=`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6)}`;$("aTime").value=`${h.slice(0,2)}:${h.slice(2)}`;
    AG.formSvc=ids;$("aSvc").value=ids.map(id=>SVC[id].name).join(", ");
    $("aTotal").value=ids.reduce((a,id)=>a+SVC[id].price,0);$("aMins").value=ids.reduce((a,id)=>a+SVC[id].min,0)||60;
    updDep();aMsg("Datos leídos del mensaje. Revisa y toca Guardar cita.");
  } else aMsg(n||p?"Leí el nombre y el teléfono, pero el mensaje no trae el código de reserva. Completa fecha, hora y servicios a mano.":"No encontré datos de reserva en ese texto. Llena los campos a mano.");
});

async function loadAgenda(){
  try{AG.items=await api("admin/citas");renderAgenda()}
  catch(e){if(e.status===401) logout("La contraseña ya no es válida. Entra de nuevo."); else $("agList").innerHTML=`<div class="agEmpty">${esc(e.message)}</div>`}
}
$("aSave").addEventListener("click",async()=>{
  const x={name:$("aName").value.trim(),phone:$("aPhone").value.trim(),date:$("aDate").value,time:$("aTime").value,
    servicesText:$("aSvc").value.trim(),services:AG.formSvc||[],total:+$("aTotal").value||0,mins:+$("aMins").value||60,status:$("aStatus").value};
  if(!x.name||!x.date||!x.time){aMsg("Falta el nombre, la fecha o la hora.");return}
  const clash=AG.items.find(o=>ACTIVE.includes(o.status)&&o.date===x.date&&toMin(x.time)<toMin(o.time)+(+o.mins||60)&&toMin(o.time)<toMin(x.time)+x.mins);
  if(clash&&!AG.force){AG.force=true;aMsg(`Ese horario choca con la cita de ${clash.name} a las ${to12(clash.time)}. Toca Guardar cita otra vez para guardarla igual.`);return}
  AG.force=false; $("aSave").disabled=true;
  try{await api("admin/citas",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(x)});
    ["aPaste","aName","aPhone","aDate","aTime","aSvc","aTotal"].forEach(i=>$(i).value="");AG.formSvc=null;updDep();
    aMsg(`Cita de ${x.name} guardada para el ${longDate(x.date)} a las ${to12(x.time)}.`); loadAgenda(); loadBusy()}
  catch(e){aMsg(e.message)}
  $("aSave").disabled=false;
});
document.addEventListener("click",async e=>{
  const b=e.target.closest("button"); if(!b||!AG.admin) return;
  if(b.dataset.agtab){AG.tab=b.dataset.agtab;AG.sure=null;renderAgenda();return}
  if(b.dataset.st){b.disabled=true;
    try{await api("admin/citas/"+b.dataset.cita,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:b.dataset.st})})}
    catch(e){aMsg(e.message)} loadAgenda(); loadBusy(); return}
  if(b.dataset.borrar){const id=b.dataset.borrar; if(AG.sure!==id){AG.sure=id;renderAgenda();return}
    AG.sure=null; try{await api("admin/citas/"+id,{method:"DELETE"})}catch(e){aMsg(e.message)} loadAgenda(); loadBusy()}
});

// ===== Acceso de Darleny =====
const store={get(){try{return localStorage.getItem("darleny-pass")}catch{return null}},set(v){try{v?localStorage.setItem("darleny-pass",v):localStorage.removeItem("darleny-pass")}catch{}}};
function setAdmin(on){
  AG.admin=GAL.admin=on;
  $("agenda").hidden=!on;$("heroAgenda").hidden=!on;$("galAdmin").hidden=!on;$("login").hidden=true;
  renderGal(); if(on){renderAgenda();loadAgenda();loadHorarioAdmin()}
}
function logout(msg){ADMIN.pass=null;store.set(null);setAdmin(false);if(msg){$("login").hidden=false;$("lMsg").hidden=false;$("lMsg").textContent=msg}}
async function login(pass,quiet){
  ADMIN.pass=pass;
  try{await api("admin/ping");store.set(pass);setAdmin(true);return true}
  catch(e){ADMIN.pass=null;if(!quiet){$("lMsg").hidden=false;$("lMsg").textContent=e.status===401?"Contraseña incorrecta.":e.message}return false}
}
$("lForm").addEventListener("submit",e=>{e.preventDefault();const p=$("lPass").value;if(p)login(p).then(ok=>{if(ok){$("lPass").value="";$("agenda").scrollIntoView({behavior:"smooth"})}})});
$("logout").addEventListener("click",()=>logout());
$("openLogin").addEventListener("click",()=>{$("login").hidden=false;$("lPass").focus()});
if(location.hash==="#acceso"){$("login").hidden=false}
{const saved=store.get(); if(saved) login(saved,true)}
setInterval(()=>{if(AG.admin&&!document.hidden)loadAgenda()},60000);

// ===== Mi horario (Darleny cambia sus horas y bloquea clases) =====
function hMsg(t){$("hMsg").hidden=!t;$("hMsg").textContent=t||""}
let HADMIN={semana:null,bloqueos:[]};
function renderHorarioAdmin(){
  const sem=HADMIN.semana||HORARIO.semana;
  $("hrWeek").innerHTML=[1,2,3,4,5,6,0].map(d=>{const h=sem[d];return `<div class="hrRow">
    <label class="hrDay"><input type="checkbox" id="hrOn${d}" ${h?"checked":""}> ${DIAS[d]}</label>
    <input type="time" id="hrA${d}" step="1800" value="${h?h[0]:"09:00"}" aria-label="${DIAS[d]} abre" ${h?"":"disabled"}>
    <span>a</span>
    <input type="time" id="hrB${d}" step="1800" value="${h?h[1]:"17:00"}" aria-label="${DIAS[d]} cierra" ${h?"":"disabled"}></div>`}).join("");
  const list=[...HADMIN.bloqueos].sort((a,b)=>(a.date+(a.from||"")).localeCompare(b.date+(b.from||"")));
  $("bqList").innerHTML=list.length?list.map(b=>`<li><span><strong>${shortDate(b.date)}</strong> · ${b.from?`${to12(b.from)} – ${to12(b.to)}`:"Todo el día"}${b.nota?` · ${esc(b.nota)}`:""}</span><button class="linkBtn" data-bq="${b.id}">Quitar</button></li>`).join("")
    :`<li class="empty">No tienes horas bloqueadas.</li>`;
}
async function loadHorarioAdmin(){try{HADMIN=await api("admin/horario");renderHorarioAdmin()}catch(e){hMsg(e.message)}}
$("hrWeek").addEventListener("change",e=>{const m=e.target.id.match(/^hrOn(\d)$/);if(m){$("hrA"+m[1]).disabled=$("hrB"+m[1]).disabled=!e.target.checked}});
$("hrSave").addEventListener("click",async()=>{
  const semana={};for(const d of [0,1,2,3,4,5,6]) semana[d]=$("hrOn"+d).checked?[$("hrA"+d).value,$("hrB"+d).value]:null;
  $("hrSave").disabled=true;
  try{await api("admin/horario",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({semana})});hMsg("Horario guardado. Las clientas ya ven las horas nuevas.");await loadHorarioAdmin();loadBusy()}
  catch(e){hMsg(e.message)}
  $("hrSave").disabled=false;
});
$("bqAdd").addEventListener("click",async()=>{
  const body={date:$("bqDate").value,from:$("bqFrom").value,to:$("bqTo").value,nota:$("bqNota").value.trim(),semanas:+$("bqRep").value};
  if(!body.date){hMsg("Elige la fecha que quieres bloquear.");return}
  $("bqAdd").disabled=true;
  try{const r=await api("admin/bloqueos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    hMsg(r.bloqueos.length>1?`Bloqueado ${r.bloqueos.length} semanas seguidas.`:"Bloqueado.");["bqFrom","bqTo","bqNota"].forEach(i=>$(i).value="");await loadHorarioAdmin();loadBusy()}
  catch(e){hMsg(e.message)}
  $("bqAdd").disabled=false;
});
$("bqList").addEventListener("click",async e=>{const b=e.target.closest("[data-bq]");if(!b)return;
  try{await api("admin/bloqueos/"+b.dataset.bq,{method:"DELETE"});await loadHorarioAdmin();loadBusy()}catch(err){hMsg(err.message)}});

// ===== Pagos y depósitos =====
const fmtCuenta=c=>c.replace(/(\d{3})(?=\d)/g,"$1 ");
function payCards(){
  return CONFIG.bancos.map(b=>`<div class="bank"><div><div class="bankName">${esc(b.banco)}</div><div class="bankType">Cuenta ${esc(b.tipo.toLowerCase())}</div>
    <div class="bankNum num">${fmtCuenta(b.cuenta)}</div></div><button class="copyBtn" data-copy="${b.cuenta}">Copiar</button></div>`).join("")+
    `<div class="bank holder"><div><div class="bankType">Titular</div><div class="bankName">${esc(CONFIG.titular.nombre)}</div>
    <div class="bankType num">Cédula ${CONFIG.titular.cedula}</div></div><button class="copyBtn" data-copy="${CONFIG.titular.cedula}">Copiar cédula</button></div>`;
}
$("payCards").innerHTML=payCards();
$("payWa").href=`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent("Hola Darleny, te envío el comprobante de mi depósito.")}`;
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-copy]"); if(!b) return;
  const v=b.dataset.copy, done=()=>{const t=b.textContent;b.textContent="Copiado ✓";setTimeout(()=>b.textContent=t,1800)};
  if(navigator.clipboard?.writeText) navigator.clipboard.writeText(v).then(done).catch(()=>prompt("Copia este número:",v));
  else prompt("Copia este número:",v);
});
