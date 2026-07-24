(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  // DOM
  var authScreen = $('auth-screen'), chatScreen = $('chat-screen');
  var password = $('password'), authPassBtn = $('auth-pass-btn');
  var authStepPass = $('auth-step-password'), authStepAcc = $('auth-step-account');
  var authNoAcc = $('auth-no-account'), authHasAcc = $('auth-has-account');
  var nicknameInput = $('nickname-input'), authCreateBtn = $('auth-create-btn');
  var authLoadBtn = $('auth-load-btn'), accFileInput = $('acc-file-input');
  var authCreateNewBtn = $('auth-create-new-btn'), authError = $('auth-error');
  var serverAddress = $('server-address'), statusDot = $('status-dot');
  var headerTitle = $('header-title'), headerSubtitle = $('header-subtitle');
  var sidebarNickname = $('sidebar-nickname'), sidebarStatus = $('sidebar-status');
  var channelsList = $('channels-list'), channelSearch = $('channel-search');
  var createChatBtn = $('create-chat-btn');
  var chatPlaceholder = $('chat-placeholder'), chatArea = $('chat-area');
  var chatTargetIcon = $('chat-target-icon'), chatTargetName = $('chat-target-name');
  var chatTargetMeta = $('chat-target-meta'), messagesContainer = $('messages-container');
  var messageInput = $('message-input'), sendBtn = $('send-btn');
  var fileInput = $('file-input'), filePreview = $('file-preview');
  var filePreviewName = $('file-preview-name'), filePreviewSize = $('file-preview-size');
  var clearFileBtn = $('clear-file-btn'), typingIndicator = $('typing-indicator');
  var typingText = $('typing-text'), emojiBtn = $('emoji-btn');
  var emojiPicker = $('emoji-picker'), emojiGrid = $('emoji-grid');
  var emojiClose = $('emoji-close'), toastContainer = $('toast-container');
  var sidebar = $('sidebar'), sidebarOverlay = $('sidebar-overlay');
  var menuToggle = $('menu-toggle'), sidebarClose = $('sidebar-close');
  var disconnectBtn = $('disconnect-btn'), themeToggle = $('theme-toggle');
  var filesBadge = $('files-badge'), filesList = $('files-list');
  var statUsers = $('stat-users'), statMessages = $('stat-messages');
  var statFilesAdmin = $('stat-files-admin'), statUptime = $('stat-uptime');
  var usersListEl = $('users-list'), themesGrid = $('themes-grid');
  var createDialog = $('create-dialog-overlay'), dialogClose = $('dialog-close');
  var dialogCancel = $('dialog-cancel'), dialogConfirm = $('dialog-confirm');
  var dialogTitle = $('dialog-title');
  var dialogTabs = document.querySelectorAll('.dialog-tab');
  var dialogChannel = $('dialog-channel'), dialogGroup = $('dialog-group'), dialogDm = $('dialog-dm');
  var dialogChannelName = $('dialog-channel-name'), dialogGroupName = $('dialog-group-name');
  var dialogGroupUsers = $('dialog-group-users'), dialogDmName = $('dialog-dm-name');
  var accWarningDialog = $('acc-warning-dialog'), accWarningOk = $('acc-warning-ok');
  var accWarningClose = $('acc-warning-close');
  var backBtn = $('back-btn');
  var discoverList = $('discover-list'), discoverSection = $('discover-section');

  // State
  var socket = null, myNick = null, myId = null, selectedFiles = [];
  var connectedUsers = {}, messageCount = 0, fileCount = 0;
  var startTime = Date.now(), typingTimer = null, uptimeInterval = null;
  var channels = {}, channelOrder = [], activeChannel = null, serverPass = '';
  var isMobile = window.innerWidth < 768;

  var emojis = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😙','😚','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵','😡','😠','🤬','👍','👎','👊','✊','🤛','🤜','👏','🙌','🤝','💪','✌️','🤞','🖕','🤘','🤙','👋','🤚','✋','🖐','🖖','👀','🙈','🙉','🙊','💀','☠️','💩','🤡','👻','💩','💋','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','⭐','🌟','✨','🔥','💯','🎉','🎊','🎈','🎁','🎀','🪄','💎','🔮','🧿'];

  function fmtSize(b) { if (b===0) return '0 B'; var k=1024, s=['B','KB','MB','GB'], i=Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+s[i]; }
  function toast(m,t) { var d=document.createElement('div'); d.className='toast '+(t||'info'); d.textContent=m; toastContainer.appendChild(d); setTimeout(function(){d.remove()},4000); }
  function scrollBottom() { requestAnimationFrame(function(){if(messagesContainer) messagesContainer.scrollTop=messagesContainer.scrollHeight}); }
  function getTime() { return new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); }
  function fmtUptime(ms) { var s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60); s%=60; m%=60; if(h>0) return h+'ч '+m+'м'; if(m>0) return m+'м '+s+'с'; return s+'с'; }
  function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }

  function downloadAcc(data) {
    var blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'acc.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
  }

  function loadAccFromFile(cb) {
    accFileInput.click();
    accFileInput.onchange = function() {
      var f = accFileInput.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function(e) { try { var d = JSON.parse(e.target.result); if (d.nick && d.id) cb(d); else toast('❌ Bad acc.json','error'); } catch(e){toast('❌ File error','error');} };
      r.readAsText(f);
    };
  }

  // Theme
  function getSavedTheme() { try { return localStorage.getItem('nova-theme')||'nova'; } catch(e){return 'nova';} }
  function setTheme(name) {
    document.documentElement.setAttribute('data-theme',name);
    try { localStorage.setItem('nova-theme',name); } catch(e){}
    var cards = themesGrid.querySelectorAll('.theme-card');
    for (var i=0;i<cards.length;i++) cards[i].classList.toggle('active',cards[i].getAttribute('data-theme')===name);
  }
  setTheme(getSavedTheme());
  var themeCycle = ['nova','ocean','forest','sunset','amber','cyber','light','midnight'], themeIdx = 0;
  themeToggle.addEventListener('click',function(){ themeIdx=(themeIdx+1)%themeCycle.length; setTheme(themeCycle[themeIdx]); });

  (function(){
    var names = ['nova','ocean','forest','sunset','amber','cyber','light','midnight'];
    var colors = ['#6c63ff,#a855f7','#0ea5e9,#06b6d4','#22c55e,#16a34a','#f43f5e,#e11d48','#f59e0b,#d97706','#22d3ee,#ec4899','#e2e8f0,#cbd5e1','#1e1b4b,#0f172a'];
    var labels = ['Nova','Ocean','Forest','Sunset','Amber','Cyberpunk','Light','Midnight'];
    for (var i=0;i<names.length;i++) {
      var btn = document.createElement('button');
      btn.className = 'theme-card'+(getSavedTheme()===names[i]?' active':'');
      btn.setAttribute('data-theme',names[i]);
      btn.innerHTML = '<div class="theme-preview" style="background:linear-gradient(135deg,'+colors[i]+')"></div><span class="theme-name">'+labels[i]+'</span><span class="theme-check">✓</span>';
      btn.addEventListener('click',function(){ setTheme(this.getAttribute('data-theme')); });
      themesGrid.appendChild(btn);
    }
  })();

  // Sidebar
  function openSidebar() { sidebar.classList.remove('hidden'); sidebarOverlay.classList.remove('hidden'); }
  function closeSidebar() { sidebar.classList.add('hidden'); sidebarOverlay.classList.add('hidden'); }
  menuToggle.addEventListener('click',openSidebar);
  sidebarClose.addEventListener('click',closeSidebar);
  sidebarOverlay.addEventListener('click',closeSidebar);

  var sidebarItems = document.querySelectorAll('.sidebar-item');
  for (var si=0;si<sidebarItems.length;si++) {
    sidebarItems[si].addEventListener('click',function(){
      var v = this.getAttribute('data-view');
      var views = document.querySelectorAll('.view');
      for (var j=0;j<views.length;j++) { views[j].classList.remove('active'); views[j].classList.add('hidden'); }
      var el = $('view-'+v);
      if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
      closeSidebar();
    });
  }

  // ===== CHANNELS =====
  function renderChannels() {
    var html = '';
    var q = channelSearch.value.toLowerCase().trim();
    for (var i=0;i<channelOrder.length;i++) {
      var ch = channels[channelOrder[i]];
      if (!ch) continue;
      if (q && ch.name.toLowerCase().indexOf(q)===-1) continue;
      var icon = ch.type==='channel'?'📢':ch.type==='group'?'👥':'💬';
      var cls = 'channel-item'+(activeChannel===ch.id?' active':'');
      var badge = ch.unread ? '<span class="channel-badge">'+ch.unread+'</span>' : '';
      html += '<div class="'+cls+'" data-id="'+ch.id+'"><span class="channel-icon">'+icon+'</span><span class="channel-name">'+ch.name+'</span>'+badge+'</div>';
    }
    if (!html) html = '<div class="channels-empty">Нет чатов</div>';
    channelsList.innerHTML = html;
    var items = channelsList.querySelectorAll('.channel-item');
    for (var k=0;k<items.length;k++) {
      items[k].addEventListener('click',function(){ switchChannel(this.getAttribute('data-id')); });
    }
  }

  function switchChannel(id) {
    if (!channels[id]) return;
    activeChannel = id;
    channels[id].unread = 0;
    renderChannels();
    // Join socket room
    if (socket) socket.emit('join-channel', id);
    // Show chat area
    chatPlaceholder.classList.add('hidden');
    chatArea.classList.remove('hidden');
    if (isMobile) {
      document.querySelector('.channels-sidebar').classList.add('mobile-hidden');
      chatArea.classList.add('mobile-full');
    }
    var ch = channels[id];
    var icon = ch.type==='channel'?'📢':ch.type==='group'?'👥':'💬';
    chatTargetIcon.textContent = icon;
    chatTargetName.textContent = ch.name;
    chatTargetMeta.textContent = ch.type==='channel'?'📢 Канал':ch.type==='group'?'👥 Группа':'💬 Личный чат';
    messagesContainer.innerHTML = '';
    if (ch.messages) { for (var i=0;i<ch.messages.length;i++) renderMsg(ch.messages[i]); }
    scrollBottom();
  }

  function renderMsg(msg) {
    var div = document.createElement('div');
    var type = (msg.fromId===myId)?'self':'other';
    div.className = 'message '+type;
    var html = '';
    if (msg.fromNick && msg.fromNick!==myNick) html += '<div class="msg-author">'+msg.fromNick+'</div>';
    if (msg.text) html += '<div class="msg-text">'+msg.text+'</div>';
    if (msg.fileUrl) {
      var em = '📎'; var ext = msg.fileName?msg.fileName.split('.').pop().toLowerCase():'';
      if (['jpg','jpeg','png','gif','webp','svg'].indexOf(ext)!==-1) em='🖼️';
      else if (['mp4','mov','avi','mkv'].indexOf(ext)!==-1) em='🎬';
      else if (['mp3','wav','flac'].indexOf(ext)!==-1) em='🎵';
      html += '<a class="file-message" href="'+msg.fileUrl+'" download target="_blank">'+
        '<span class="file-icon">'+em+'</span><div class="file-info"><span class="file-name">'+msg.fileName+'</span><span class="file-size">'+fmtSize(msg.fileSize)+'</span></div>'+
        '<span class="download-badge">⬇ Скачать</span></a>';
    }
    html += '<div class="msg-time">'+msg.time+'</div>';
    div.innerHTML = html;
    messagesContainer.appendChild(div);
    scrollBottom();
  }

  function addMsgToChannel(chId, msg) {
    if (!channels[chId]) return;
    if (!channels[chId].messages) channels[chId].messages = [];
    channels[chId].messages.push(msg);
    if (chId === activeChannel) renderMsg(msg);
    else { if (!channels[chId].unread) channels[chId].unread = 0; channels[chId].unread++; renderChannels(); }
    messageCount++; statMessages.textContent = messageCount;
    if (msg.fileUrl) { fileCount++; filesBadge.textContent = fileCount; statFilesAdmin.textContent = fileCount; addFileToList(msg); }
  }

  function addFileToList(data) {
    var empty = filesList.querySelector('.files-empty');
    if (empty) empty.remove();
    var div = document.createElement('div'); div.className = 'file-item';
    var em = '📎'; var ext = data.fileName?data.fileName.split('.').pop().toLowerCase():'';
    if (['jpg','jpeg','png','gif','webp','svg'].indexOf(ext)!==-1) em='🖼️';
    else if (['mp4','mov','avi','mkv'].indexOf(ext)!==-1) em='🎬';
    div.innerHTML = '<span class="file-item-icon">'+em+'</span><div class="file-item-info"><span class="file-item-name">'+data.fileName+'</span><span class="file-item-meta">'+fmtSize(data.fileSize)+' • '+data.time+'</span></div><a href="'+data.fileUrl+'" download class="file-item-dl">⬇</a>';
    filesList.appendChild(div);
  }

  // ===== Back button (mobile) =====
  if (!backBtn) {
    var bb = document.createElement('button');
    bb.id = 'back-btn'; bb.className = 'btn-icon back-btn'; bb.textContent = '←';
    bb.style.cssText = 'display:none;font-size:18px;padding:4px 8px;';
    var topBar = document.querySelector('.chat-top-bar');
    if (topBar) topBar.insertBefore(bb, topBar.firstChild);
    backBtn = bb;
  }
  if (backBtn) {
    backBtn.addEventListener('click', function(){
      activeChannel = null;
      chatArea.classList.add('hidden');
      chatPlaceholder.classList.remove('hidden');
      if (isMobile) {
        document.querySelector('.channels-sidebar').classList.remove('mobile-hidden');
        chatArea.classList.remove('mobile-full');
      }
    });
  }

  // ===== Socket =====
  function connectSocket(pass, nick, id) {
    if (socket) socket.disconnect();
    serverPass = pass; myNick = nick; myId = id;
    socket = io({ auth: { token: pass, nick: nick, id: id }, transports: ['websocket','polling'] });

    socket.on('connect',function(){ statusDot.className='status-indicator online'; headerSubtitle.textContent='Подключено'; });
    socket.on('disconnect',function(){ statusDot.className='status-indicator offline'; headerSubtitle.textContent='Отключено'; });
    socket.on('connect_error',function(err){
      statusDot.className='status-indicator offline';
      if (err.message==='Invalid password') { toast('❌ Wrong password','error'); authError.textContent='Wrong server password'; authError.classList.remove('hidden'); authPassBtn.disabled=false; }
      else { toast('⚠️ '+err.message,'error'); }
    });

    socket.on('init', function(data) {
      authScreen.classList.remove('active'); chatScreen.classList.add('active');
      password.value=''; authError.classList.add('hidden');
      toast('🔓 Connected','success');
      startTime=Date.now();
      if (uptimeInterval) clearInterval(uptimeInterval);
      uptimeInterval=setInterval(function(){ statUptime.textContent=fmtUptime(Date.now()-startTime); },1000);
      headerTitle.textContent = 'Nova • '+myNick;
      sidebarNickname.textContent = myNick; sidebarStatus.textContent = 'Подключено';
      channels = {}; channelOrder = [];
      if (data && data.channels) {
        for (var i=0;i<data.channels.length;i++) {
          var ch = data.channels[i]; channels[ch.id] = ch; channelOrder.push(ch.id);
        }
      }
      renderChannels();
      // Auto-join rooms
      for (var j=0;j<channelOrder.length;j++) socket.emit('join-channel', channelOrder[j]);
    });

    socket.on('message', function(data) {
      if (data.channel) addMsgToChannel(data.channel, { text: data.text, fromId: data.fromId, fromNick: data.fromNick, time: getTime() });
      hideTyping();
    });

    socket.on('file', function(data) {
      if (data.channel) addMsgToChannel(data.channel, { text: data.text||'', fromId: data.fromId, fromNick: data.fromNick, time: getTime(), fileUrl: data.fileUrl, fileName: data.fileName, fileSize: data.fileSize });
      toast('📎 '+data.fileName,'info'); hideTyping();
    });

    socket.on('error-msg', function(msg) { toast('⚠️ '+msg,'error'); });

    socket.on('users-update', function(data) {
      connectedUsers = data.users||{}; updateUsersList();
      statUsers.textContent = Object.keys(connectedUsers).length;
    });

    socket.on('typing', function(data) {
      if (data.id!==socket.id && data.channel===activeChannel) { showTyping('Печатает...'); clearTimeout(typingTimer); typingTimer=setTimeout(hideTyping,2000); }
    });

    socket.on('channel-added', function(ch) {
      if (!channels[ch.id]) { channels[ch.id] = ch; channelOrder.push(ch.id); renderChannels(); socket.emit('join-channel', ch.id); }
    });

    socket.on('channels-list', function(list) {
      if (!discoverList) return;
      discoverList.innerHTML = '';
      if (list.length===0) { discoverList.innerHTML = '<div class="channels-empty">Нет каналов</div>'; return; }
      for (var i=0;i<list.length;i++) {
        var d = document.createElement('div'); d.className = 'channel-item';
        d.innerHTML = '<span class="channel-icon">📢</span><span class="channel-name">'+list[i].name+'</span><span style="font-size:10px;color:var(--text-secondary)">'+list[i].subscriberCount+'</span>';
        d.addEventListener('click', function(){
          var id = this.getAttribute('data-id');
          if (socket) socket.emit('subscribe-channel', id);
          toast('📢 Subscribed!','success');
          if (discoverSection) discoverSection.classList.add('hidden');
        });
        d.setAttribute('data-id', list[i].id);
        discoverList.appendChild(d);
      }
    });
  }

  function showTyping(t) { typingText.textContent=t; typingIndicator.classList.remove('hidden'); }
  function hideTyping() { typingIndicator.classList.add('hidden'); }

  function updateUsersList() {
    var ids = Object.keys(connectedUsers);
    if (ids.length===0) { usersListEl.innerHTML='<div class="admin-list-empty">No users</div>'; return; }
    var html='';
    for (var i=0;i<ids.length;i++) {
      var u=connectedUsers[ids[i]];
      html+='<div class="admin-user-item"><span class="admin-user-dot"></span><span class="admin-user-id">'+(u.nick||ids[i].slice(0,8))+'</span></div>';
    }
    usersListEl.innerHTML=html;
  }

  // ===== Auth =====
  authPassBtn.addEventListener('click', function() {
    var pwd = password.value.trim();
    if (!pwd) { toast('❌ Enter password','error'); return; }
    authPassBtn.disabled = true; authPassBtn.textContent = '⏳ Connecting...';
    authError.classList.add('hidden'); serverPass = pwd;
    var saved = null;
    try { var ls = localStorage.getItem('nova-acc'); if (ls) saved = JSON.parse(ls); } catch(e){}
    if (saved && saved.nick && saved.id) { connectSocket(pwd, saved.nick, saved.id); }
    else {
      authStepPass.classList.add('hidden'); authStepAcc.classList.remove('hidden');
      authNoAcc.classList.remove('hidden'); authHasAcc.classList.remove('hidden');
      authPassBtn.disabled = false; authPassBtn.textContent = 'Далее';
    }
  });
  password.addEventListener('keydown',function(e){ if (e.key==='Enter') authPassBtn.click(); });

  authCreateBtn.addEventListener('click',function(){
    var nick = nicknameInput.value.trim();
    if (!nick) { toast('❌ Enter nickname','error'); return; }
    if (nick.length<2) { toast('❌ Min 2 chars','error'); return; }
    accWarningDialog.classList.remove('hidden');
  });
  accWarningOk.addEventListener('click',function(){
    accWarningDialog.classList.add('hidden');
    var nick = nicknameInput.value.trim();
    var id = uid();
    var accData = { nick: nick, id: id, created: new Date().toISOString() };
    try { localStorage.setItem('nova-acc', JSON.stringify(accData)); } catch(e){}
    downloadAcc(accData); toast('✅ acc.json downloaded!','success');
    connectSocket(serverPass, nick, id);
  });
  accWarningClose.addEventListener('click',function(){ accWarningDialog.classList.add('hidden'); });

  authLoadBtn.addEventListener('click',function(){
    loadAccFromFile(function(data){
      try { localStorage.setItem('nova-acc', JSON.stringify(data)); } catch(e){}
      connectSocket(serverPass, data.nick, data.id);
    });
  });
  authCreateNewBtn.addEventListener('click',function(){ authNoAcc.classList.remove('hidden'); authHasAcc.classList.remove('hidden'); });

  disconnectBtn.addEventListener('click',function(){
    if (socket) socket.disconnect();
    chatScreen.classList.remove('active'); authScreen.classList.add('active');
    authStepPass.classList.remove('hidden'); authStepAcc.classList.add('hidden');
    authPassBtn.disabled = false; authPassBtn.textContent = 'Далее';
    closeSidebar(); toast('🚪 Disconnected','info');
  });

  // ===== Send =====
  function sendMessage() {
    if (!socket || !activeChannel) return;
    var text = messageInput.value.trim();
    if (!text && selectedFiles.length===0) return;
    if (text && selectedFiles.length===0) {
      var msg = { text: text, channel: activeChannel, fromId: myId, fromNick: myNick, time: getTime() };
      socket.emit('message', msg);
      addMsgToChannel(activeChannel, msg);
      messageInput.value = ''; return;
    }
    var fd = new FormData();
    for (var i=0;i<selectedFiles.length;i++) fd.append('files',selectedFiles[i]);
    if (text) fd.append('text',text);
    fd.append('channel',activeChannel); fd.append('fromId',myId); fd.append('fromNick',myNick);
    var xhr = new XMLHttpRequest();
    xhr.open('POST','/upload');
    xhr.onload = function(){
      if (xhr.status===200) {
        var r = JSON.parse(xhr.responseText);
        for (var j=0;j<r.files.length;j++) {
          var f=r.files[j];
          var msg = { text: text||'', channel: activeChannel, fromId: myId, fromNick: myNick, time: getTime(), fileUrl: f.url, fileName: f.name, fileSize: f.size };
          addMsgToChannel(activeChannel, msg);
          socket.emit('file-sent', msg);
        }
        toast('✅ Sent','success');
      } else { toast('❌ Error','error'); }
      clearFiles();
    };
    xhr.onerror = function(){ toast('❌ Network error','error'); clearFiles(); };
    xhr.send(fd); messageInput.value = '';
  }

  sendBtn.addEventListener('click',sendMessage);
  messageInput.addEventListener('keydown',function(e){ if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); } });
  messageInput.addEventListener('input',function(){ if (socket && messageInput.value.trim() && activeChannel) socket.emit('typing',{channel:activeChannel}); });

  function clearFiles() { selectedFiles=[]; fileInput.value=''; filePreview.classList.add('hidden'); }
  fileInput.addEventListener('change',function(e){
    var files=Array.from(e.target.files);
    if (files.length===0) return;
    selectedFiles=files;
    if (files.length>1) { var t=files.reduce(function(s,f){return s+f.size},0); filePreviewName.textContent=files.length+' files ('+fmtSize(t)+')'; filePreviewSize.textContent=''; }
    else { filePreviewName.textContent=files[0].name; filePreviewSize.textContent=fmtSize(files[0].size); }
    filePreview.classList.remove('hidden');
  });
  clearFileBtn.addEventListener('click',clearFiles);

  // Emoji
  (function(){
    emojiGrid.innerHTML='';
    for (var i=0;i<emojis.length;i++) {
      var el=document.createElement('button'); el.className='emoji-item'; el.textContent=emojis[i];
      el.addEventListener('click',function(){ messageInput.value+=this.textContent; messageInput.focus(); emojiPicker.classList.add('hidden'); });
      emojiGrid.appendChild(el);
    }
  })();
  emojiBtn.addEventListener('click',function(){ emojiPicker.classList.toggle('hidden'); });
  emojiClose.addEventListener('click',function(){ emojiPicker.classList.add('hidden'); });

  // ===== Create Dialog =====
  var dialogType = 'channel';
  createChatBtn.addEventListener('click',function(){
    createDialog.classList.remove('hidden'); dialogType='channel';
    dialogTitle.textContent='📢 Create channel';
    for (var i=0;i<dialogTabs.length;i++) dialogTabs[i].classList.toggle('active',dialogTabs[i].getAttribute('data-type')==='channel');
    dialogChannel.classList.add('active'); dialogGroup.classList.remove('active'); dialogDm.classList.remove('active');
    dialogChannelName.value=''; dialogGroupName.value=''; dialogGroupUsers.value=''; dialogDmName.value='';
  });
  for (var dt=0;dt<dialogTabs.length;dt++) {
    dialogTabs[dt].addEventListener('click',function(){
      var type = this.getAttribute('data-type'); dialogType = type;
      for (var i=0;i<dialogTabs.length;i++) dialogTabs[i].classList.remove('active');
      this.classList.add('active');
      dialogChannel.classList.remove('active'); dialogGroup.classList.remove('active'); dialogDm.classList.remove('active');
      if (type==='channel') { dialogChannel.classList.add('active'); dialogTitle.textContent='📢 Create channel'; }
      else if (type==='group') { dialogGroup.classList.add('active'); dialogTitle.textContent='👥 Create group'; }
      else { dialogDm.classList.add('active'); dialogTitle.textContent='💬 Direct message'; }
    });
  }
  function closeDialog() { createDialog.classList.add('hidden'); }
  dialogClose.addEventListener('click',closeDialog); dialogCancel.addEventListener('click',closeDialog);
  dialogConfirm.addEventListener('click',function(){
    if (!socket) { toast('❌ No connection','error'); return; }
    if (dialogType==='channel') {
      var name = dialogChannelName.value.trim();
      if (!name) { toast('❌ Enter name','error'); return; }
      socket.emit('create-channel', { name: name, type: 'channel', createdBy: myNick });
      closeDialog(); toast('📢 Creating channel...','info');
    } else if (dialogType==='group') {
      var gname = dialogGroupName.value.trim(); var members = dialogGroupUsers.value.trim();
      if (!gname) { toast('❌ Enter name','error'); return; }
      socket.emit('create-channel', { name: gname, type: 'group', members: members, createdBy: myNick });
      closeDialog(); toast('👥 Creating group...','info');
    } else {
      var dname = dialogDmName.value.trim();
      if (!dname) { toast('❌ Enter nickname','error'); return; }
      socket.emit('create-channel', { name: dname, type: 'dm', createdBy: myNick });
      closeDialog(); toast('💬 Creating DM...','info');
    }
  });

  // Discover channels
  var discoverBtn = document.querySelector('.discover-btn');
  if (discoverBtn) {
    discoverBtn.addEventListener('click', function(){
      if (socket) socket.emit('get-channels');
      if (discoverSection) discoverSection.classList.toggle('hidden');
    });
  }

  channelSearch.addEventListener('input',renderChannels);

  // Init
  serverAddress.textContent = window.location.host;
  statusDot.className = 'status-indicator offline';
  filesBadge.textContent = '0'; statUptime.textContent = '0с';
})();
