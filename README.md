# Nova Transfer 🚀

**Secure WiFi file & message transfer between PC and phone.**

No cables, no cloud, no USB. Just your local network, a browser, and a password.

![Nova Transfer](https://img.shields.io/badge/version-1.0.0-6c63ff?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![WiFi](https://img.shields.io/badge/transfer-WiFi-ff6b6b?style=flat-square)

---

## ✨ Features

- **🔒 Encrypted** — HTTPS with auto-generated self-signed certificates
- **🔑 Password protected** — simple auth, no accounts
- **💬 Real-time chat** — send messages instantly via WebSocket
- **📁 File transfer** — up to 500 MB per file, multiple files at once
- **📱 Works on any device** — just a browser (PC, phone, tablet)
- **🎨 Beautiful UI** — dark theme, animations, responsive
- **🧹 Auto-cleanup** — uploaded files are deleted after 1 hour
- **🔄 HTTP→HTTPS redirect** — automatic, no configuration needed

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- npm (comes with Node.js)

### Install & Run

```bash
# Clone or download the project
cd nova-transfer

# Install dependencies
npm install

# Start the server
node server.js
```

### Connect from your phone

1. Find your PC's local IP address:
   ```bash
   ip addr show | grep "inet "
   # Look for something like 192.168.x.x
   ```

2. Open your phone's browser and go to:
   ```
   https://192.168.x.x:3000
   ```

3. Your browser will show a security warning — that's normal! Tap **"Advanced"** → **"Proceed"** (the certificate is self-signed but your connection is still encrypted).

4. Enter the password: **`nova123`**

5. 🎉 You're connected! Send files and messages between devices.

---

## 🔧 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `SECRET_PASSWORD` | `nova123` | Access password |

### Custom password

```bash
SECRET_PASSWORD=mysecretpass node server.js
```

### Custom port

```bash
PORT=8080 node server.js
```

### Both

```bash
PORT=8080 SECRET_PASSWORD=mysecretpass node server.js
```

---

## 🏗️ Architecture

```
nova-transfer/
├── server.js          # Main server (HTTPS, Socket.IO, file upload)
├── package.json       # Dependencies
├── .cert/             # Auto-generated SSL certificates
├── uploads/           # Temporary file storage (auto-cleaned)
└── public/            # Static frontend
    ├── index.html     # Main page
    ├── styles.css     # Styles
    └── script.js      # Client-side logic
```

### How it works

1. **Server** runs on your PC, creates a self-signed SSL certificate
2. **Socket.IO** handles real-time messaging and authentication
3. **File uploads** go through HTTP POST to `/upload`, then get broadcast via WebSocket
4. **Files** are stored in `uploads/` and automatically deleted after 1 hour
5. **Clients** connect via browser — no app installation needed

---

## 🛡️ Security

- **HTTPS** — all traffic is encrypted with TLS
- **Password auth** — clients must provide the correct password to connect
- **Self-signed cert** — generated on first run, stored in `.cert/`
- **Auto-cleanup** — files are removed after 1 hour
- **No persistence** — no database, no logs of transferred content

> ⚠️ The self-signed certificate warning is expected. Your connection is still fully encrypted — the warning only means the certificate isn't signed by a public CA (which is fine for local network use).

---

## 📱 Usage Tips

- **Both devices must be on the same WiFi network**
- For best performance, use **5 GHz WiFi**
- Large files transfer faster when both devices are on the same network
- The server shows connected clients and transfer logs in the terminal

---

## 🧪 Tech Stack

- **Backend:** Node.js, Express, Socket.IO, Multer
- **Frontend:** Vanilla JS, CSS3 (no frameworks)
- **Security:** Node.js built-in `crypto`, `https` module, `selfsigned`

---

## 📄 License

MIT © liquifield

---

*Made with ❤️ for people who hate USB cables.*