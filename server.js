const express = require('express');
const https = require('https');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const selfsigned = require('selfsigned');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.SECRET_PASSWORD || 'nova123';
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CERT_DIR = path.join(__dirname, '.cert');
const MAX_CHANNELS = 50; // limit channels in memory

if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });
const certPath = path.join(CERT_DIR, 'cert.pem');
const keyPath = path.join(CERT_DIR, 'key.pem');
let httpsOptions = null;
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  httpsOptions = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
} else {
  console.log('🔐 Generating self-signed SSL certificates...');
  const attrs = [{ name: 'commonName', value: 'Nova Transfer' }];
  const pems = selfsigned.generate(attrs, { keySize: 2048, days: 365, algorithm: 'sha256' });
  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(keyPath, pems.private);
  httpsOptions = { cert: pems.cert, key: pems.private };
  console.log('✅ SSL certificates created');
}

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

app.post('/upload', (req, res) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ error: 'File too large (max 500 MB)' });
      return res.status(500).json({ error: 'Upload error' });
    }
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No files' });
    const files = req.files.map(f => ({ name: f.originalname, size: f.size, url: '/uploads/' + f.filename }));
    res.json({ success: true, files, text: req.body.text || '' });
  });
});

function cleanupOldFiles() {
  const maxAge = 60 * 60 * 1000;
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return;
    const now = Date.now();
    files.forEach(file => {
      const fp = path.join(UPLOAD_DIR, file);
      fs.stat(fp, (err, stats) => { if (!err && now - stats.mtimeMs > maxAge) fs.unlink(fp, () => {}); });
    });
  });
}
setInterval(cleanupOldFiles, 10 * 60 * 1000);

// Socket.IO
const io = new Server({ cors: { origin: '*', methods: ['GET', 'POST'] } });

// Auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token === PASSWORD) return next();
  return next(new Error('Invalid password'));
});

// In-memory stores
const users = {};       // socketId -> { nick, userId, socketId }
const channels = {};     // channelId -> { id, name, type, createdBy, members:[userId], subscribers:[userId], messages:[] }

function s4() { return Math.random().toString(36).slice(2, 6); }
function cid() { return 'ch_' + Date.now().toString(36) + s4(); }

function userByNick(nick) {
  for (const sid in users) {
    if (users[sid].nick.toLowerCase() === nick.toLowerCase()) return users[sid];
  }
  return null;
}

function broadcastUsers() {
  io.emit('users-update', { users: Object.fromEntries(Object.entries(users).map(([sid, u]) => [sid, { nick: u.nick, userId: u.userId }])) });
}

io.on('connection', (socket) => {
  const nick = socket.handshake.auth?.nick || 'anon';
  const userId = socket.handshake.auth?.id || socket.id;
  users[socket.id] = { nick, userId, socketId: socket.id };
  broadcastUsers();
  console.log(`+ ${nick} (${socket.id})`);

  // Send initial data
  const myChannels = Object.values(channels).filter(ch => {
    if (ch.type === 'dm') return ch.members.includes(userId);
    if (ch.type === 'group') return ch.members.includes(userId);
    if (ch.type === 'channel') return ch.subscribers.includes(userId) || ch.createdBy === nick;
    return false;
  });
  socket.emit('init', { channels: myChannels.map(ch => ({
    id: ch.id, name: ch.name, type: ch.type, createdBy: ch.createdBy,
    members: ch.members, messages: ch.messages || [],
  })) });

  socket.on('message', (data) => {
    const ch = channels[data.channel];
    if (!ch) return;
    // Channel permission: only creator can write
    if (ch.type === 'channel' && ch.createdBy !== nick) { socket.emit('error-msg', 'Only the channel creator can write'); return; }
    // Group/DM: any member can write
    if ((ch.type === 'group' || ch.type === 'dm') && !ch.members.includes(userId)) return;
    
    const msg = {
      text: data.text,
      channel: data.channel,
      fromId: userId,
      fromNick: nick,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    };
    if (!ch.messages) ch.messages = [];
    ch.messages.push(msg);
    // Don't send back to sender - sender already added locally
    socket.to(data.channel).emit('message', msg);
  });

  socket.on('file-sent', (data) => {
    const ch = channels[data.channel];
    if (!ch) return;
    if (ch.type === 'channel' && ch.createdBy !== nick) return;
    if ((ch.type === 'group' || ch.type === 'dm') && !ch.members.includes(userId)) return;
    const msg = {
      text: data.text || '',
      channel: data.channel,
      fromId: userId,
      fromNick: nick,
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      fileUrl: data.fileUrl, fileName: data.fileName, fileSize: data.fileSize,
    };
    if (!ch.messages) ch.messages = [];
    ch.messages.push(msg);
    socket.to(data.channel).emit('file', msg);
  });

  socket.on('create-channel', (data) => {
    const id = cid();
    const ch = {
      id, name: data.name, type: data.type || 'channel',
      createdBy: nick, createdByUserId: userId,
      members: [userId],
      subscribers: [userId],
      messages: [],
      createdAt: Date.now(),
    };
    if (data.type === 'group' && data.members) {
      const parts = data.members.split(/\s+/).filter(Boolean);
      parts.forEach(n => {
        const u = userByNick(n);
        if (u) ch.members.push(u.userId);
      });
    }
    if (data.type === 'dm') {
      const u = userByNick(data.name);
      if (u && u.userId !== userId) {
        ch.members = [userId, u.userId];
        ch.name = u.nick;
      } else {
        ch.members = [userId, userId]; // fallback
        ch.name = data.name;
      }
    }
    channels[id] = ch;
    
    // Send to relevant users
    ch.members.forEach(uid => {
      for (const sid in users) {
        if (users[sid].userId === uid) {
          io.to(sid).emit('channel-added', ch);
        }
      }
    });
    // For channels, broadcast to all (discoverable)
    if (data.type === 'channel') {
      io.emit('channel-added', ch);
    }
    console.log(`📢 ${ch.name} (${ch.type}) by ${nick}`);
  });

  // Join socket rooms for channel messaging
  socket.on('join-channel', (chId) => {
    const ch = channels[chId];
    if (!ch) return;
    // For channels, add subscriber
    if (ch.type === 'channel' && !ch.subscribers.includes(userId)) {
      ch.subscribers.push(userId);
    }
    socket.join(chId);
  });

  // Subscribe to channel (discover)
  socket.on('subscribe-channel', (chId) => {
    const ch = channels[chId];
    if (!ch || ch.type !== 'channel') return;
    if (!ch.subscribers.includes(userId)) ch.subscribers.push(userId);
    socket.join(chId);
    // Send full channel data
    socket.emit('channel-added', ch);
  });

  // Get discoverable channels
  socket.on('get-channels', () => {
    const list = Object.values(channels).filter(ch => ch.type === 'channel').map(ch => ({
      id: ch.id, name: ch.name, createdBy: ch.createdBy, subscriberCount: ch.subscribers.length,
    }));
    socket.emit('channels-list', list);
  });

  socket.on('typing', (data) => {
    socket.to(data.channel).emit('typing', { id: socket.id, channel: data.channel });
  });

  socket.on('disconnect', () => {
    console.log(`- ${nick} (${socket.id})`);
    delete users[socket.id];
    broadcastUsers();
  });
});

const httpsServer = https.createServer(httpsOptions, app);
io.attach(httpsServer);

httpsServer.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════');
  console.log('  🚀 Nova Transfer v2.0');
  console.log(`  🔒 https://0.0.0.0:${PORT}`);
  console.log(`  🔑 Password: ${PASSWORD}`);
  console.log('═══════════════════════════════════════════');
});

// HTTP redirect
const httpApp = express();
httpApp.get('*', (req, res) => {
  const host = req.headers.host?.replace(/:\d+$/, '') || 'localhost';
  res.redirect(`https://${host}:${PORT}${req.url}`);
});
const httpServer = http.createServer(httpApp);
httpServer.listen(80, '0.0.0.0').on('error', () => {
  httpServer.listen(8080, '0.0.0.0');
});
