const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, 'ubicaciones.txt');

// ── Middlewares ───────────────────────────────────────────
app.use(express.json());
// IMPORTANTE: express.static va al final para que las rutas /api/* tengan prioridad

// ── Crear el archivo con cabecera si no existe ────────────
if (!fs.existsSync(FILE)) {
  const header =
    '╔══════════════════════════════════════════════════════════════════════════════╗\n' +
    '║          REGISTRO DE UBICACIONES — GUATEMALA MÁGICA                        ║\n' +
    '║  Archivo generado automáticamente. Cada línea = una visita registrada.     ║\n' +
    '╚══════════════════════════════════════════════════════════════════════════════╝\n' +
    `Creado: ${new Date().toISOString()}\n` +
    '─'.repeat(80) + '\n\n';
  fs.writeFileSync(FILE, header, 'utf8');
  console.log('📄 Archivo ubicaciones.txt creado.');
}

// ── POST /api/ubicacion — Recibe y guarda coordenadas ─────
app.post('/api/ubicacion', (req, res) => {
  const data = req.body;

  if (!data.latitude || !data.longitude) {
    return res.status(400).json({ error: 'Faltan coordenadas.' });
  }

  // Línea formateada para el .txt
  const linea =
    `[${new Date().toISOString()}]\n` +
    `  📍 Coordenadas : ${data.latitude}, ${data.longitude}\n` +
    `  🎯 Precisión   : ±${data.accuracy_m ?? '?'} m\n` +
    `  🏔 Altitud      : ${data.altitude_m !== null ? data.altitude_m + ' m' : 'N/A'}\n` +
    `  🏘 Calle        : ${data.street      || '—'}\n` +
    `  🏙 Ciudad       : ${data.city        || '—'}\n` +
    `  🗺 Departamento : ${data.state       || '—'}\n` +
    `  🌎 País         : ${data.country     || '—'} (${data.country_code || '—'})\n` +
    `  📮 Código postal: ${data.postal_code || '—'}\n` +
    `  📝 Dirección    : ${data.full_address ? data.full_address.substring(0, 100) : '—'}\n` +
    `  🖥 Agente       : ${data.userAgent   || '—'}\n` +
    '─'.repeat(80) + '\n\n';

  fs.appendFile(FILE, linea, 'utf8', (err) => {
    if (err) {
      console.error('❌ Error al escribir en', FILE, ':', err);
      return res.status(500).json({ error: 'No se pudo guardar la ubicación.', detalle: err.message });
    }
    console.log(`✅ Visita guardada — ${data.city || (data.latitude + ',' + data.longitude)} → ${FILE}`);
    res.json({ ok: true, mensaje: 'Ubicación guardada en ubicaciones.txt' });
  });
});

// ── GET /api/ubicaciones — Devuelve todas las visitas (JSON) ─
app.get('/api/ubicaciones', (req, res) => {
  try {
    const contenido = fs.readFileSync(FILE, 'utf8');
    res.type('text/plain; charset=utf-8').send(contenido);
  } catch(e) {
    res.status(500).json({ error: 'No se pudo leer el archivo.' });
  }
});

// ── GET /api/stats — Estadísticas rápidas ─────────────────
app.get('/api/stats', (req, res) => {
  try {
    const contenido = fs.readFileSync(FILE, 'utf8');
    const visitas   = (contenido.match(/^\[20\d\d/gm) || []).length;
    const paises    = [...new Set(
      (contenido.match(/🌎 País\s+: (.+)/g) || [])
        .map(l => l.replace(/🌎 País\s+: /, '').trim())
        .filter(p => p !== '—')
    )];
    res.json({ total_visitas: visitas, paises_unicos: paises });
  } catch(e) {
    res.status(500).json({ error: 'No se pudieron calcular estadísticas.' });
  }
});

// ── Archivos estáticos AL FINAL (después de todas las rutas API) ─────────────
// Si se pone antes, intercepta los POST y devuelve 405
app.use(express.static(__dirname));

// ── Iniciar servidor ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 Guatemala Mágica corriendo en http://localhost:${PORT}`);
  console.log(`📄 Coordenadas se guardan en: ${FILE}`);
  console.log(`📊 Estadísticas: http://localhost:${PORT}/api/stats\n`);
});