const express = require('express');
const https = require('https');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const selfsigned = require('selfsigned');

// ===== Configuration =====
const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.SECRET_PASSWORD || 'nova123';
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CERT_DIR = path.join(__dirname, '.cert');

// ===== SSL Certificate Generation (self-signed) =====
if (!fs.existsSync(CERT_DIR)) {
  fs.mkdirSync(CERT_DIR, { recursive: true });
}

const certPath = path.join(CERT_DIR, 'cert.pem');
const keyPath = path.join(CERT_DIR, 'key.pem');

let httpsOptions = null;
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
} else {
  console.log('🔐 Генерирую самоподписанные SSL-сертификаты...');
  const attrs = [{ name: 'commonName', value: 'Nova Transfer' }];
  const pems = selfsigned.generate(attrs, {
    keySize: 2048,
    days: 365,
    algorithm: 'sha256',
  });

  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(keyPath, pems.private);
  httpsOptions = {
    cert: pems.cert,
    key: pems.private,
  };
  console.log('✅ SSL-сертификаты созданы');
}

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ===== Express setup =====
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// ===== Multer for file uploads =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// ===== Upload endpoint =====
app.post('/upload', (req, res) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'Файл слишком большой (макс. 500 МБ)' });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Ошибка загрузки' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Файлы не выбраны' });
    }

    const files = req.files.map(file => ({
      name: file.originalname,
      size: file.size,
      url: '/uploads/' + file.filename,
      savedName: file.filename,
    }));

    res.json({
      success: true,
      files,
      text: req.body.text || '',
    });
  });
});

// ===== File cleanup (remove files older than 1 hour) =====
function cleanupOldFiles() {
  const maxAge = 60 * 60 * 1000;
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return;
    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(UPLOAD_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (now - stats.mtimeMs > maxAge) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}

setInterval(cleanupOldFiles, 10 * 60 * 1000);

// ===== Socket.IO setup (shared between HTTP and HTTPS) =====
const io = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token === PASSWORD) {
    return next();
  }
  return next(new Error('Invalid password'));
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.emit('authenticated');
  socket.emit('system', '✅ Вы подключились к Nova Transfer');

  socket.on('message', (data) => {
    console.log(`Message from ${socket.id}: ${data.text ? data.text.substring(0, 50) : '(empty)'}`);
    socket.broadcast.emit('message', { text: data.text });
  });

  socket.on('file-sent', (data) => {
    console.log(`File from ${socket.id}: ${data.fileName}`);
    socket.broadcast.emit('file', {
      text: data.text || '',
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
    });
  });

  socket.on('upload-progress-local', (data) => {
    socket.emit('upload-progress', data);
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} (${reason})`);
    socket.broadcast.emit('system', '👋 Пользователь отключился');
  });
});

// ===== Create and start servers =====

// 1) HTTPS server (main)
const httpsServer = https.createServer(httpsOptions, app);
io.attach(httpsServer);

// 2) HTTP server (redirect to HTTPS + fallback)
const httpApp = express();
httpApp.get('*', (req, res) => {
  const host = req.headers.host?.replace(/:\d+$/, '') || 'localhost';
  res.redirect(`https://${host}:${PORT}${req.url}`);
});
const httpServer = http.createServer(httpApp);

// Start HTTPS
httpsServer.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════');
  console.log('  🚀 Nova Transfer запущен!');
  console.log(`  🔒 HTTPS: https://0.0.0.0:${PORT}`);
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('  🔑 Пароль доступа: ' + PASSWORD);
  console.log('');
  console.log('  📱 Подключитесь с телефона:');
  console.log(`  https://[IP-ПК]:${PORT}`);
  console.log('');
  console.log('  ⚠️ Браузер покажет предупреждение о');
  console.log('  безопасности — нажмите "Продолжить"');
  console.log('  или "Принять риск". Это безопасно:');
  console.log('  данные шифруются, просто сертификат');
  console.log('  самодельный (self-signed).');
  console.log('');
  console.log('  💡 Чтобы узнать IP ПК:');
  console.log('  ip addr show | grep "inet "');
  console.log('  (обычно 192.168.x.x)');
  console.log('═══════════════════════════════════════════');
});

// Start HTTP redirect (port 80, fallback to 8080)
httpServer.listen(80, '0.0.0.0').on('error', (err) => {
  if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
    httpServer.listen(8080, '0.0.0.0', () => {
      console.log('  � HTTP -> HTTPS редирект на порту 8080');
    });
  }
});
