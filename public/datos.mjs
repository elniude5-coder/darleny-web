// Datos del estudio: los usa la página y también el servidor (netlify/functions/api.mjs).
// ===== Configuración (ajustar con los datos reales) =====
export const CONFIG = {
  whatsapp: "18293433772",      // 829-343-3772, en formato internacional sin "+"
  open: { 0:[9,13], 1:[10,13], 2:[10,17], 3:[10,17], 4:[10,17], 5:[10,18], 6:[9,18] }, // 0=domingo … 6=sábado
  daysAhead: 21,
  bancos: [
    { banco: "Banco Popular", tipo: "Corriente", cuenta: "827571472" },
    { banco: "Banreservas", tipo: "Ahorro", cuenta: "9604558148" },
    { banco: "BHD", tipo: "Ahorro", cuenta: "33485800017" },
  ],
  titular: { nombre: "Darleny Alondra González Meléndez", cedula: "40219724396" }
};

// [id, nombre, detalle, precio, precioMax, "desde", minutos]
// Texto de las cuentas para mensajes de WhatsApp
export const bankText = () => CONFIG.bancos.map(b => `${b.banco} (${b.tipo}): ${b.cuenta}`).join("\n") +
  `\nTitular: ${CONFIG.titular.nombre} · Cédula ${CONFIG.titular.cedula}\nSi pagas desde otro banco, elige "Pago al Instante".`;

export const MENU = [
 {id:"cejas", t:"Diseño y cuidado de cejas", intro:"Diseño, definición y color para realzar tu mirada.", groups:[
  ["Diseño y depilación",[
   ["c1","Depilación con navaja","",200,0,0,15],
   ["c2","Diseño y depilación con pinza","",250,0,1,25],
   ["c3","Diseño y depilación con cera","",300,0,0,20],
   ["c4","Diseño y depilación con hilo","",500,0,0,30]]],
  ["Definición y color",[
   ["c5","Brow Makeup","Cejas maquilladas + navaja",350,0,0,25],
   ["c6","Brow Tint Essential","Diseño + tintado + navaja",500,0,0,30],
   ["c7","Brow Tint Wax","Diseño + tintado + cera",700,0,0,35],
   ["c8","Brow Tint Thread","Diseño + tintado + hilo",950,0,0,45]]],
  ["Laminado de cejas",[
   ["c9","Brow Lift","Laminado + diseño y depilación con cera",1500,0,0,45],
   ["c10","Brow Lift & Tint","Laminado + tintado + depilación",1700,0,0,60]]]
 ]},
 {id:"micro", t:"Micropigmentación de cejas", intro:"Powder Brows, efecto polvo: técnica que define y aporta color a las cejas mediante un sombreado degradado, personalizado según tus facciones y el resultado deseado.", groups:[
  ["Powder Brows",[
   ["m1","Sesión inicial","No incluye el retoque",6500,0,0,150],
   ["m2","Retoque de perfeccionamiento","4 a 6 semanas después de la sesión inicial",2000,0,0,90],
   ["m3","Retoque de color posterior","",3000,0,1,120],
   ["m4","Corrección de trabajos anteriores","Requiere valoración previa por WhatsApp",null,0,0,180]]]
 ], note:["La sesión inicial no incluye el retoque.","El retoque de perfeccionamiento se realiza después de la cicatrización inicial.","Los trabajos realizados por otra profesional requieren valoración previa.","Las correcciones de pigmento y las asimetrías marcadas pueden tener un costo diferente.","Los resultados y la duración varían según el tipo de piel, la cicatrización y los cuidados posteriores."]},
 {id:"grupitos", t:"Grupitos de pestañas", intro:"Un toque de volumen para realzar tu mirada por un período más corto, ideal si buscas una mirada más definida sin optar por extensiones pelo a pelo.", groups:[
  ["Aplicaciones",[
   ["g1","Grupitos ultralivianos","",700,0,0,30],
   ["g2","Grupitos curvos 20P","",800,0,0,30],
   ["g3","Grupitos volumen ruso 30P","",900,0,0,30],
   ["g4","Pestañas corridas","",350,0,0,20],
   ["g5","Diseño personalizado más elaborado","Adicional a cualquier aplicación de grupitos (40 min en total)",100,0,0,10]]]
 ], note:["Duración estimada: de 5 a 7 días o más, según los productos, la aplicación y los cuidados.","Servicio temporal. No equivale a las extensiones pelo a pelo y no incluye retoque."]},
 {id:"lash", t:"Lifting y extensiones de pestañas", intro:"Extensiones diseñadas para aportar longitud, definición y volumen según el efecto deseado.", groups:[
  ["Lash Lift",[
   ["l1","Lash Lift & Tint","Lifting de pestañas + tinte",1500,0,0,60]]],
  ["Extensiones clásicas y de volumen",[
   ["l2","Classic Set","Extensiones clásicas",2200,0,0,210],
   ["l3","Mascara Effect","Efecto rímel",2400,0,0,210],
   ["l4","Hawaiian Volume 2D","Volumen hawaiano",2500,0,0,165],
   ["l5","Egyptian Volume 3D","Volumen egipcio",2800,0,0,165],
   ["l6","Greek Volume 4D","Volumen griego",3000,0,0,180],
   ["l7","Mega Volume 5D+","Megavolumen",3500,4000,0,180],
   ["l8","Express Lash Set","Aplicación parcial, menos duración, no incluye retoque",1800,2000,0,90]]],
  ["Retoques de extensiones",[
   ["r1","Retoque clásicas","",1200,0,1,120],
   ["r2","Retoque efecto rímel","",1200,0,1,120],
   ["r3","Retoque volumen hawaiano 2D","",1300,0,1,90],
   ["r4","Retoque volumen egipcio 3D","",1400,0,1,90],
   ["r5","Retoque volumen griego 4D","",1500,0,1,120],
   ["r6","Retoque megavolumen 5D+","Según el trabajo requerido",1800,2000,0,120]]],
  ["Remoción",[
   ["r7","Retiro de pestañas","",300,500,0,30]]]
 ], note:["Los retoques se realizan dentro de las primeras 3 semanas, siempre que las extensiones conservadas permitan trabajar sobre ellas.","Después de 3 semanas, corresponde una aplicación nueva.","Si queda menos de la mitad de las extensiones, se cobra como set nuevo.","El precio puede variar según la cantidad de pestañas conservadas y el trabajo necesario."]},
 {id:"cera", t:"Depilación con cera", intro:"Facial y corporal.", groups:[
  ["Facial",[
   ["w1","Diseño y depilación de cejas","",300,0,0,20],["w2","Frente","",200,0,0,15],["w3","Cejas + frente","",400,0,0,30],
   ["w4","Patillas","",200,0,0,15],["w5","Bozo (labio superior)","",150,0,0,10],["w6","Borde inferior del labio","",100,0,0,10],
   ["w7","Bozo + borde inferior del labio","",200,0,0,15],["w8","Barbilla o mentón","",200,0,0,15],["w9","Cuello frontal","",600,0,0,25],["w10","Nuca","",600,0,0,25]]],
  ["Corporal",[
   ["w11","Axilas","",400,0,0,20],["w12","Dedos de las manos","",200,0,0,15],["w13","Línea abdominal y zona debajo del ombligo","",800,0,0,30],
   ["w14","Espalda completa","",1500,0,0,50],["w15","Brazos completos","",800,0,0,40],["w16","Medias piernas","",800,0,0,40],["w17","Piernas completas","",1300,0,0,50]]]
 ], note:["Los precios pueden variar según la cantidad de vello, la extensión del área y el tiempo adicional requerido.","⚠ <strong>Importante:</strong> No se realizará depilación con cera si estás utilizando ácidos, retinol u otros productos que sensibilicen la piel, ya que pueden causar quemaduras o desprendimiento de la piel. ¡Infórmalo antes de tu cita!"]}
];

export const SVC = {}; MENU.forEach(c=>c.groups.forEach(([g,list])=>list.forEach(r=>{
  SVC[r[0]]={id:r[0],name:r[1],detail:r[2],price:r[3],max:r[4],from:!!r[5],min:r[6],cat:c.id};
})));


// Política: >1,000 → 1,000; 501–1,000 → 500; ≤500 → pago completo. Se calcula sobre el total (precio base).
export function deposit(total){
  if(total>1000) return {amt:1000, label:"Depósito para confirmar", rule:"Servicios de más de RD$1,000: depósito de RD$1,000."};
  if(total>500) return {amt:500, label:"Depósito para confirmar", rule:"Servicios de RD$501 a RD$1,000: depósito de RD$500."};
  return {amt:total, label:"Pago completo por adelantado", rule:"Servicios de RD$500 o menos: pago completo por adelantado."};
}

