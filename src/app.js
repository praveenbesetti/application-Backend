const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse');
const xlsx = require('xlsx');
const errorHandler = require('./middleware/errorHandler');
const Route = require('../src/routes/index');
const { processAllRows } = require('../src/controllers/upsert');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// ── Ensure uploads temp dir ────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Security ───────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: true, // This allows any origin to connect
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret']
}));

// ── Parsing (MUST be before routes) ───────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Logging ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Static ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiting ──────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Too many auth requests. Try after 15 minutes.' },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 200,
  message: { success: false, message: 'Too many requests.' },
});
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/banners', require('./routes/banner.routes'));
app.use('/api/cart', require('./routes/cart.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
// ── Health check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, version: '2.0.0', ts: new Date() });
});

// ── Admin pages ────────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'index.html')));
app.get('/survey', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'survey.html')));

// ── CSV/XLSX Upload ────────────────────────────────────────
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    parse(buffer, { columns: true, skip_empty_lines: true, trim: true },
      (err, records) => err ? reject(err) : resolve(records)
    );
  });
}
function parseXLSX(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

app.post('/api/upload', upload.single('csv'), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const ext = path.extname(req.file.originalname).toLowerCase();
  if (ext !== '.csv' && ext !== '.xlsx')
    return res.status(400).json({ success: false, message: 'Only .csv or .xlsx files are allowed.' });

  try {
    const rows = ext === '.xlsx' ? parseXLSX(req.file.buffer) : await parseCSV(req.file.buffer);
    if (!rows.length)
      return res.status(400).json({ success: false, message: 'File is empty.' });

    const result = await processAllRows(rows);
    return res.json({
      success: true,
      message: `Processed ${rows.length} rows. ✅ ${result.success} succeeded, ❌ ${result.failed} failed.`,
      details: result.errors.length ? result.errors : undefined,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ── API Routes ─────────────────────────────────────────────


// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});
app.use('/api', Route);
// ── Error handler ──────────────────────────────────────────
app.use(errorHandler);

module.exports = app;