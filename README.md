# Nova Transfer 🚀

**Local network messenger & file transfer over WiFi.**

No cables, no cloud, no USB. Just your browser and a password.

![Version](https://img.shields.io/badge/version-2.0-6c63ff?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![WiFi](https://img.shields.io/badge/transfer-WiFi-ff6b6b?style=flat-square)

---

## ✨ Features

- **🔒 HTTPS** with auto-generated self-signed certificates
- **🔑 Password protected** access
- **👤 Account system** — create profile, download `acc.json`, restore later
- **📢 Channels** — public channels anyone can subscribe to
- **👥 Groups** — invite members by nickname
- **💬 Direct messages** — chat one-on-one with any online user
- **📁 File transfer** — up to 500 MB per file
- **🎨 8 themes** — Nova, Ocean, Forest, Sunset, Amber, Cyberpunk, Light, Midnight
- **😊 Emoji picker**
- **👀 Typing indicator**
- **⚙️ Admin panel** — online users, message/file stats, uptime
- **📱 Mobile responsive** with back-navigation in chat view
- **🧹 Auto-cleanup** — uploaded files deleted after 1 hour
- **🔄 HTTP→HTTPS redirect**

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v16+

### Install & Run

```bash
git clone https://github.com/liquefield-maxouiy/Nova-Transfer.git
cd Nova-Transfer
npm install
node server.js
```

### Connect from phone

1. Find your PC's local IP:
   ```bash
   ip addr show | grep "inet "
   ```
   (look for `192.168.x.x`)

2. Open phone browser at:
   ```
   https://192.168.x.x:3000
   ```

3. Accept the self-signed certificate warning (tap **Advanced → Proceed**)

4. Enter server password: **`nova123`**

5. Create an account (nickname) → `acc.json` downloads automatically

6. Start chatting! ✨

---

## 🔧 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `SECRET_PASSWORD` | `nova123` | Server access password |

```bash
SECRET_PASSWORD=mysecret node server.js
PORT=8080 node server.js
```

---

## 🏗️ Architecture

```
Nova-Transfer/
├── server.js           # Main server (HTTPS, Socket.IO, file upload)
├── package.json
├── .cert/              # Auto-generated SSL certificates
├── uploads/            # Temporary file storage (auto-cleaned)
└── public/
    ├── index.html
    ├── styles.css
    └── script.js
```

### How it works

1. **Server** runs on your PC, generates a self-signed SSL certificate
2. **Socket.IO** handles real-time messaging, authentication, typing, channels
3. **File uploads** go through HTTP POST to `/upload`, broadcast via WebSocket
4. **Channels/Groups/DMs** are stored in server memory (lost on restart)
5. **Accounts** use a locally stored `acc.json` file (no server-side user storage)

---

## ⚠️ Limitations & Known Issues

| Issue | Status |
|-------|--------|
| **No message history persistence** — restarting the server clears all messages and channels | ⏳ Planned |
| **No private key for cert** — new cert generated each fresh install, browser will warn | 🟡 By design |
| **Groups require online members** — you can only add users who are currently connected | ⏳ Planned |
| **No file encryption at rest** — files are stored on disk with random names | 🟡 By design (local network) |
| **No message editing/deletion** — messages cannot be edited or deleted after sending | ⏳ Planned |
| **Channel discoverability** — subscribe/discover UI is minimal | ⏳ Planned |
| **No push notifications** — the app must be open to receive messages | 🟡 By design (local network) |
| **No voice/video calls** | ⏳ Future |
| **Max file size** — hard limit of 500 MB per file | 🟡 Configurable in code |
| **Single server password** — all users share the same server password | 🟡 By design for LAN use |
| **No message search** | ⏳ Planned |
| **Reconnection on mobile** — if connection drops, page needs refresh | ⏳ Planned |
| **Self-signed certificate** — browsers show security warning (safe to ignore on local network) | 🟡 Acceptable for LAN |

---

## 📱 Mobile Usage

- On phones, the **channels list** is shown first
- Tap a channel → chat opens full-screen
- Tap **← back** arrow → returns to channel list
- The hamburger menu (☰) opens the sidebar with admin panel, files, themes, about

---

## 🛡️ Security

- All traffic encrypted with TLS (HTTPS)
- Password-based server authentication
- No data leaves your local network
- Files auto-deleted after 1 hour
- Account data stored only on the client device (`acc.json` + localStorage)

---

## 📄 License

MIT © liquifield

---

*Made with ❤️ for people who hate USB cables.*
