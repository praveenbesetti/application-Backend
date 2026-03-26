const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const { parse }    = require('csv-parse');
const xlsx         = require('xlsx');
const errorHandler = require('./middleware/errorHandler');
const { processAllRows } = require('./controllers/upsert');

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

// ── Ensure uploads temp dir ────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── CORS (MUST be before helmet and everything else) ───────
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Security ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// ── Debug Logger (remove in production) ───────────────────
app.use((req, res, next) => {
  console.log(`→ ${req.method} ${req.path}`);
  next();
});

// ── Parsing ────────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Static Files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate Limiting ──────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests.' },
});
app.use('/api', apiLimiter);

// ── Health Check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, version: '2.0.0', ts: new Date() });
});

// ── API Routes ─────────────────────────────────────────────
// Survey routes — all explicit, no catch-all /api mount
app.use('/api/survey', require('./routes/authRouter'));
app.use('/api/districts',   require('./routes/district'));
app.use('/api/mandals',     require('./routes/mandalRoute'));
app.use('/api/villages',    require('./routes/villagesRoute'));
app.use('/api/surveys',     require('./routes/surveyFormRoute'));
app.use('/api/survey-data', require('./routes/surveyDataRoute'));
app.use('/api/states',      require('./routes/stateRoute'));
app.use('/api/web-auth',    require('./routes/loginrouter'));

// QuickBasket app routes
// app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/categories',  require('./routes/category.routes'));
app.use('/api/products',    require('./routes/product.routes'));
app.use('/api/banners',     require('./routes/banner.routes'));
app.use('/api/cart',        require('./routes/cart.routes'));
app.use('/api/admin',       require('./routes/admin.routes'));

// ── Admin Pages ────────────────────────────────────────────
app.get('/admin',  (req, res) => res.sendFile(path.join(__dirname, '..', 'admin', 'index.html')));
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
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

app.post('/api/upload', upload.single('csv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  try {
    const rows = ext === '.xlsx' ? parseXLSX(req.file.buffer) : await parseCSV(req.file.buffer);
    const result = await processAllRows(rows);
    return res.json({ success: true, processed: rows.length, result });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ── 404 (MUST BE LAST) ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Error Handler ──────────────────────────────────────────
app.use(errorHandler);

module.exports = app;