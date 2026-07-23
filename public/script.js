(function () {
  'use strict';

  var authScreen = document.getElementById('auth-screen');
  var chatScreen = document.getElementById('chat-screen');
  var passwordInput = document.getElementById('password');
  var authBtn = document.getElementById('auth-btn');
  var authError = document.getElementById('auth-error');
  var serverAddress = document.getElementById('server-address');
  var messagesContainer = document.getElementById('messages-container');
  var messageInput = document.getElementById('message-input');
  var sendBtn = document.getElementById('send-btn');
  var fileInput = document.getElementById('file-input');
  var filePreview = document.getElementById('file-preview');
  var filePreviewName = document.getElementById('file-preview-name');
  var filePreviewSize = document.getElementById('file-preview-size');
  var clearFileBtn = document.getElementById('clear-file-btn');
  var statusDot = document.getElementById('status-dot');
  var toastContainer = document.getElementById('toast-container');

  var socket = null;
  var selectedFiles = [];

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function showToast(msg, type) {
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
  }

  function scrollBottom() {
    requestAnimationFrame(function () {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }

  function addMessage(type, content) {
    var welcome = messagesContainer.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    var div = document.createElement('div');
    div.className = 'message ' + type;

    if (type === 'system') {
      div.textContent = content;
    } else if (content.text) {
      var te = document.createElement('div');
      te.className = 'msg-text';
      te.textContent = content.text;
      div.appendChild(te);
      var tm = document.createElement('div');
      tm.className = 'msg-time';
      tm.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      div.appendChild(tm);
    }

    if (content.fileUrl) {
      var fl = document.createElement('a');
      fl.className = 'file-message';
      fl.href = content.fileUrl;
      fl.download = content.fileName;
      fl.target = '_blank';
      fl.innerHTML = '<span class="file-icon">📎</span>' +
        '<div class="file-info"><span class="file-name">' + content.fileName + '</span>' +
        '<span class="file-size">' + formatSize(content.fileSize) + '</span></div>' +
        '<span class="download-badge">⬇ Скачать</span>';
      div.appendChild(fl);
      var tm2 = document.createElement('div');
      tm2.className = 'msg-time';
      tm2.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      div.appendChild(tm2);
    }

    messagesContainer.appendChild(div);
    scrollBottom();
  }

  function connectSocket(token) {
    if (socket) {
      socket.disconnect();
    }

    socket = io({
      auth: { token: token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', function () {
      statusDot.className = 'status-indicator online';
    });

    socket.on('disconnect', function () {
      statusDot.className = 'status-indicator offline';
    });

    socket.on('connect_error', function (err) {
      statusDot.className = 'status-indicator offline';
      authBtn.disabled = false;
      if (err.message === 'Invalid password') {
        showToast('❌ Неверный пароль', 'error');
        authError.textContent = 'Неверный пароль';
        authError.classList.remove('hidden');
      } else {
        showToast('⚠️ ' + err.message, 'error');
      }
    });

    socket.on('authenticated', function () {
      authScreen.classList.remove('active');
      chatScreen.classList.add('active');
      passwordInput.value = '';
      authError.classList.add('hidden');
      authBtn.disabled = false;
      showToast('🔓 Доступ разрешён', 'success');
    });

    socket.on('message', function (data) { addMessage('other', data); });

    socket.on('file', function (data) {
      addMessage('other', data);
      showToast('📎 Файл: ' + data.fileName, 'info');
    });

    socket.on('system', function (msg) { addMessage('system', msg); });
  }

  // Auth
  authBtn.addEventListener('click', function () {
    var pwd = passwordInput.value.trim();
    if (!pwd) return;
    authBtn.disabled = true;
    authError.classList.add('hidden');
    connectSocket(pwd);
  });

  passwordInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      authBtn.click();
    }
  });

  // Send message
  function sendMessage() {
    if (!socket) return;
    var text = messageInput.value.trim();
    if (!text && selectedFiles.length === 0) return;

    if (text && selectedFiles.length === 0) {
      socket.emit('message', { text: text });
      addMessage('self', { text: text });
      messageInput.value = '';
      return;
    }

    var fd = new FormData();
    for (var i = 0; i < selectedFiles.length; i++) {
      fd.append('files', selectedFiles[i]);
    }
    if (text) fd.append('text', text);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload');
    xhr.onload = function () {
      if (xhr.status === 200) {
        var result = JSON.parse(xhr.responseText);
        for (var j = 0; j < result.files.length; j++) {
          var f = result.files[j];
          addMessage('self', { text: text || '', fileUrl: f.url, fileName: f.name, fileSize: f.size });
          socket.emit('file-sent', { text: text || '', fileUrl: f.url, fileName: f.name, fileSize: f.size });
        }
        showToast('✅ Отправлено', 'success');
      } else {
        showToast('❌ Ошибка', 'error');
      }
      clearFiles();
    };
    xhr.onerror = function () {
      showToast('❌ Ошибка сети', 'error');
      clearFiles();
    };
    xhr.send(fd);
    messageInput.value = '';
  }

  function clearFiles() {
    selectedFiles = [];
    fileInput.value = '';
    filePreview.classList.add('hidden');
  }

  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  fileInput.addEventListener('change', function (e) {
    var files = Array.from(e.target.files);
    if (files.length === 0) return;
    selectedFiles = files;
    if (files.length > 1) {
      var total = files.reduce(function (s, f) { return s + f.size; }, 0);
      filePreviewName.textContent = files.length + ' файлов (' + formatSize(total) + ')';
    } else {
      filePreviewName.textContent = files[0].name;
    }
    filePreviewSize.textContent = formatSize(files[0].size);
    filePreview.classList.remove('hidden');
  });

  clearFileBtn.addEventListener('click', clearFiles);

  serverAddress.textContent = window.location.host;
  statusDot.className = 'status-indicator offline';
})();
