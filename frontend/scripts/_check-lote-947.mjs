// Chequeo previo, solo lectura. Usa el mismo NOMBRE_A_CORREO que insertar-semana2-rm.mjs
// y verifica que cada correo objetivo exista en la BD como CALIFICADOR.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOTOR = "C:/Users/albur/Desktop/PROYECTOS/WORK/compin-calificacion-motor";

const conn = readFileSync(path.join(RAIZ, ".env.local"), "utf8")
  .split("\n").find((l) => l.startsWith("DATABASE_URL"))
  .split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "");

// Mismo mapa que insertar-semana2-rm.mjs (nombres tal como aparecen en las hojas).
const NOMBRE_A_CORREO = {
  "Carla Flores Riveo": "carla.flores@grupoees.cl",
  "Carla Flores Riveros": "carla.flores@grupoees.cl",
  "Carla Herrera": "carla.herrera@grupoees.cl",
  "Carolina Fernandez": "carolina.fernandez@grupoees.cl",
  "Catalina Caro": "catalina.caro@grupoees.cl",
  "Cecilia Uribe Correa": "cecilia.uribe@grupoees.cl",
  "Flavia Durán Gutierrez": "flavia.duran@grupoees.cl",
  "Francisca Barrueto Cabañas": "francisca.barrueto@grupoees.cl",
  "Francisca Guzmán Pizarro": "francisca.guzman@grupoees.cl",
  "Guisella Cifuentes Martínez": "guisella.cifuentes@grupoees.cl",
  "Ignacio Castro Mellado": "jose.castro@grupoees.cl",
  "José Ignacio Castro Mellado": "jose.castro@grupoees.cl",
  "Juan Arriagada Chaparro": "juan.arriagada@grupoees.cl",
  "Karen Zurita Osses": "karen.zurita@grupoees.cl",
  "Leonardo Marilao": "leonardo.marilao@grupoees.cl",
  "Macarena Rodríguez Ortega": "macarena.rodriguez@grupoees.cl",
  "Melissa Cortés Torrejon": "melissa.cortes@grupoees.cl",
  "Mical Arriaza Piña": "mical.arriaza@grupoees.cl",
  "Nicole Lara": "nicole.lara@grupoees.cl",
  "Orlly González Colivoro": "orlly.gonzalez@grupoees.cl",
  "Pablo Campos": "pablo.campos@grupoees.cl",
  "Rodrigo Castilla Rubio": "rodrigo.castilla@grupoees.cl",
  "Tabata Ojeda Fontealba": "tabata.ojeda@grupoees.cl",
  "Yasna Rothen Sagredo": "yasna.rothen@grupoees.cl",
};

const CALIF_TSV = readFileSync(path.join(MOTOR, "tabla-verificacion-960.tsv"), "utf8").trim().split("\n").map((l) => l.split("\t"));
const nombresTabla = [...new Set(CALIF_TSV.map((r) => r[1].trim()))];
const ids947 = readFileSync(path.join(MOTOR, "ids-procesar-947.txt"), "utf8").trim().split("\n").filter(Boolean);

const pool = new pg.Pool({ connectionString: conn, ssl: { rejectUnauthorized: false }, max: 2 });
try {
  const { rows: total } = await pool.query("SELECT count(*)::int c FROM casos");
  console.log("Total casos en la BD:", total[0].c);
  const { rows: ya } = await pool.query("SELECT id_tramite FROM casos WHERE id_tramite = ANY($1)", [ids947]);
  console.log(`De nuestros 947: YA en la BD = ${ya.length}, a insertar = ${947 - ya.length}`);

  // correos objetivo para nuestros 22 nombres
  const objetivo = nombresTabla.map((n) => ({ nombre: n, correo: NOMBRE_A_CORREO[n] }));
  const correos = [...new Set(objetivo.map((o) => o.correo).filter(Boolean))];
  const { rows: u } = await pool.query(
    "SELECT u.correo, u.nombre||' '||u.apellido nom, es.estado FROM usuarios u JOIN estado_usuario es ON es.id=u.estado_usuario_id WHERE u.correo = ANY($1)",
    [correos],
  );
  const existentes = new Map(u.map((x) => [x.correo, x]));

  console.log("\nResolución de los 22 calificadores de la tabla:");
  const problemas = [];
  for (const o of objetivo) {
    if (!o.correo) { console.log(`  ❌ "${o.nombre}"  ->  NO está en NOMBRE_A_CORREO`); problemas.push(o.nombre); continue; }
    const bd = existentes.get(o.correo);
    if (!bd) { console.log(`  ❌ "${o.nombre}"  ->  ${o.correo}  (correo NO existe en la BD)`); problemas.push(o.nombre); continue; }
    console.log(`  ${bd.estado === "ACTIVO" ? "✅" : "⚠️ "} "${o.nombre}"  ->  ${o.correo}  (${bd.nom}, ${bd.estado})`);
  }

  // conteo esperado por calificador
  const porCal = {};
  for (const [id, nombre] of CALIF_TSV.map((r) => [r[0].trim(), r[1].trim()])) {
    if (ids947.includes(id)) porCal[nombre] = (porCal[nombre] || 0) + 1;
  }
  console.log("\nCasos por calificador (de los 947):");
  for (const [k, v] of Object.entries(porCal).sort()) console.log(`  ${k.padEnd(32)} ${v}`);

  console.log(problemas.length ? `\n⚠️  Revisar: ${problemas.join(", ")}` : "\n✅ Todos los calificadores resuelven a un usuario existente.");
} finally {
  await pool.end();
}
