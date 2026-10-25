// API de Darleny Aesthetic Studio: reservas, agenda privada y galería de trabajos.
// Datos guardados en Netlify Blobs. La agenda y la galería piden la contraseña ADMIN_PASSWORD.
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual, randomUUID } from "node:crypto";
import { CONFIG, SVC, deposit } from "../../public/datos.mjs";

export const config = { path: "/api/*" };

const ACTIVE = ["pendiente", "confirmada"];
const STATUSES = ["pendiente", "confirmada", "completada", "cancelada", "no_asistio"];
const GCATS = ["cejas", "pestanas", "micro", "depilacion"];
const IMG_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMG = 6 * 1024 * 1024;
const TZ_OFFSET_H = -4; // República Dominicana, sin horario de verano

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status, error) => json({ error }, status);

const datos = () => getStore({ name: "darleny", consistency: "strong" });
const fotos = () => getStore({ name: "darleny-fotos", consistency: "strong" });

const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const overlaps = (a, b) => a.date === b.date && toMin(a.time) < toMin(b.time) + b.mins && toMin(b.time) < toMin(a.time) + a.mins;
// "Ahora" en hora dominicana, como fecha y minutos del día
function nowDR() {
  const d = new Date(Date.now() + TZ_OFFSET_H * 3600e3);
  return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes(), ms: d.getTime() };
}
const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

// Lista compartida (citas o galería) en un solo JSON, con escritura condicional para no pisar cambios
async function readList(key) {
  const r = await datos().getWithMetadata(key, { type: "json" });
  return r ? { items: r.data.items || [], etag: r.etag } : { items: [], etag: null };
}
async function updateList(key, fn) {
  for (let i = 0; i < 5; i++) {
    const { items, etag } = await readList(key);
    const out = await fn(items);
    if (out.error) return out;
    const res = await datos().setJSON(key, { items: out.items }, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (res.modified) return out;
  }
  return { error: [503, "Hay muchos cambios al mismo tiempo. Vuelve a intentarlo."] };
}

function isAdmin(req) {
  const pass = Netlify.env.get("ADMIN_PASSWORD");
  if (!pass) return false;
  const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const h = (s) => createHash("sha256").update(s).digest();
  return given.length > 0 && timingSafeEqual(h(given), h(pass));
}

// Valida servicios, fecha y hora contra el menú y el horario del estudio
function checkBooking(b, { admin }) {
  const services = Array.isArray(b.services) ? [...new Set(b.services.map(String))] : [];
  const items = services.map((id) => SVC[id]).filter(Boolean);
  if (!admin && (!items.length || items.length !== services.length)) return { error: "Elige al menos un servicio del menú." };
  if (items.some((s) => s.price == null)) return { error: "Ese servicio necesita valoración previa. Escríbenos por WhatsApp." };
  if (services.includes("g5") && !services.some((x) => ["g1", "g2", "g3", "g4"].includes(x))) return { error: "El diseño personalizado va junto a una aplicación de grupitos." };
  const name = clean(b.name, 60), phone = clean(b.phone, 20);
  if (!name) return { error: "Escribe tu nombre." };
  if (!admin && phone.replace(/\D/g, "").length < 10) return { error: "Escribe un número de WhatsApp de 10 dígitos." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || "") || !/^\d{2}:\d{2}$/.test(b.time || "")) return { error: "Elige día y hora." };
  const total = admin && b.total != null ? Math.max(0, Math.round(+b.total || 0)) : items.reduce((a, s) => a + s.price, 0);
  const mins = admin && b.mins ? Math.min(600, Math.max(15, Math.round(+b.mins))) : Math.max(30, items.reduce((a, s) => a + s.min, 0));
  if (!admin) {
    const day = new Date(b.date + "T12:00:00Z").getUTCDay(), h = CONFIG.open[day], m = toMin(b.time), now = nowDR();
    if (!h) return { error: "Ese día el estudio está cerrado." };
    if (m % 30 || m < h[0] * 60 || m + mins > h[1] * 60) return { error: "Esa hora está fuera del horario para estos servicios." };
    const startMs = Date.parse(b.date + "T00:00:00Z") + m * 60e3;
    if (startMs < now.ms + 2 * 3600e3) return { error: "Las citas se reservan con al menos 2 horas de anticipación." };
    if (startMs > now.ms + CONFIG.daysAhead * 864e5) return { error: `Solo se puede reservar hasta ${CONFIG.daysAhead} días antes.` };
  }
  const servicesText = admin && b.servicesText ? clean(b.servicesText, 300) : items.map((s) => s.name).join(", ");
  return { cita: { name, phone, date: b.date, time: b.time, services, servicesText, total, mins, deposit: deposit(total).amt } };
}

async function readBody(req) {
  try { return await req.json(); } catch { return {}; }
}

export default async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const [a, b, c] = parts, M = req.method;

  try {
    // ---- Público ----
    if (a === "ocupado" && M === "GET") {
      const { items } = await readList("citas"), today = nowDR().date;
      return json(items.filter((x) => ACTIVE.includes(x.status) && x.date >= today).map(({ date, time, mins }) => ({ date, time, mins })));
    }
    if (a === "reservar" && M === "POST") {
      const r = checkBooking(await readBody(req), { admin: false });
      if (r.error) return fail(400, r.error);
      const cita = { id: randomUUID().slice(0, 8), ...r.cita, status: "pendiente", origen: "web", created: new Date().toISOString() };
      const out = await updateList("citas", (items) => {
        const clash = items.find((x) => ACTIVE.includes(x.status) && overlaps(cita, x));
        if (clash) return { error: [409, "Esa hora se acaba de ocupar. Elige otra, por favor."] };
        const digits = cita.phone.replace(/\D/g, "");
        if (items.filter((x) => x.status === "pendiente" && x.phone.replace(/\D/g, "") === digits).length >= 3)
          return { error: [429, "Ya tienes 3 citas esperando depósito. Escríbenos por WhatsApp."] };
        return { items: [...items, cita] };
      });
      if (out.error) return fail(...out.error);
      return json({ ok: true, cita });
    }
    if (a === "galeria" && M === "GET") return json((await readList("galeria")).items);
    if (a === "foto" && b && M === "GET") {
      const r = await fotos().getWithMetadata(b, { type: "arrayBuffer" });
      if (!r) return new Response("No encontrada", { status: 404 });
      return new Response(r.data, { headers: { "content-type": r.metadata?.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
    }

    // ---- Solo Darleny ----
    if (a === "admin") {
      if (!Netlify.env.get("ADMIN_PASSWORD")) return fail(503, "Falta configurar ADMIN_PASSWORD en Netlify.");
      if (!isAdmin(req)) return fail(401, "Contraseña incorrecta.");
      if (b === "ping") return json({ ok: true });

      if (b === "citas") {
        if (M === "GET" && !c) return json((await readList("citas")).items);
        if (M === "POST" && !c) {
          const body = await readBody(req), r = checkBooking(body, { admin: true });
          if (r.error) return fail(400, r.error);
          const status = STATUSES.includes(body.status) ? body.status : "pendiente";
          const cita = { id: randomUUID().slice(0, 8), ...r.cita, status, origen: "manual", created: new Date().toISOString() };
          const out = await updateList("citas", (items) => ({ items: [...items, cita] }));
          return out.error ? fail(...out.error) : json({ ok: true, cita });
        }
        if (M === "PATCH" && c) {
          const { status } = await readBody(req);
          if (!STATUSES.includes(status)) return fail(400, "Estado no válido.");
          const out = await updateList("citas", (items) => {
            if (!items.some((x) => x.id === c)) return { error: [404, "No encontré esa cita."] };
            return { items: items.map((x) => (x.id === c ? { ...x, status, updated: new Date().toISOString() } : x)) };
          });
          return out.error ? fail(...out.error) : json({ ok: true });
        }
        if (M === "DELETE" && c) {
          const out = await updateList("citas", (items) => ({ items: items.filter((x) => x.id !== c) }));
          return out.error ? fail(...out.error) : json({ ok: true });
        }
      }

      if (b === "fotos") {
        if (M === "POST" && !c) {
          const type = (req.headers.get("content-type") || "").split(";")[0];
          if (!IMG_TYPES.includes(type)) return fail(415, "Solo se aceptan fotos JPG, PNG o WebP.");
          const buf = await req.arrayBuffer();
          if (!buf.byteLength || buf.byteLength > MAX_IMG) return fail(413, "La foto es demasiado grande (máximo 6 MB).");
          const cat = url.searchParams.get("cat");
          if (!GCATS.includes(cat)) return fail(400, "Elige la categoría de la foto.");
          const item = { id: randomUUID().replace(/-/g, ""), cat, caption: clean(url.searchParams.get("caption"), 80), added: nowDR().date };
          await fotos().set(item.id, buf, { metadata: { type } });
          const out = await updateList("galeria", (items) => ({ items: [item, ...items] }));
          return out.error ? fail(...out.error) : json({ ok: true, item });
        }
        if (M === "DELETE" && c) {
          const out = await updateList("galeria", (items) => ({ items: items.filter((x) => x.id !== c) }));
          if (out.error) return fail(...out.error);
          await fotos().delete(c);
          return json({ ok: true });
        }
      }
    }
    return fail(404, "Ruta no encontrada.");
  } catch (e) {
    console.error(e);
    return fail(500, "Algo salió mal en el servidor. Vuelve a intentarlo.");
  }
};
