// APP STATE MANAGEMENT
let items = [];
let users = [];
let currentUser = null;
let activeCategory = 'all';
let searchQuery = '';

// INIT FUNCTION
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  renderAuthHeader();
  renderCards();
});

async function loadState() {
  const savedItems = localStorage.getItem('savevault_items');
  const savedUsers = localStorage.getItem('savevault_users');

  if (savedItems && savedUsers) {
    items = JSON.parse(savedItems);
    users = JSON.parse(savedUsers);
  } else {
    try {
      const response = await fetch('data.json');
      const data = await response.json();
      items = data.items || [];
      users = data.users || [];
      localStorage.setItem('savevault_items', JSON.stringify(items));
      localStorage.setItem('savevault_users', JSON.stringify(users));
    } catch (e) {
      console.warn("Couldn't fetch data.json, using fallback inline state.", e);
    }
  }

  const savedSession = localStorage.getItem('savevault_session');
  currentUser = savedSession ? JSON.parse(savedSession) : null;
}

function saveState() {
  localStorage.setItem('savevault_items', JSON.stringify(items));
  localStorage.setItem('savevault_users', JSON.stringify(users));
  if (currentUser) {
    localStorage.setItem('savevault_session', JSON.stringify(currentUser));
  } else {
    localStorage.removeItem('savevault_session');
  }
}

// AUTH & HEADER RENDER
function renderAuthHeader() {
  const container = document.getElementById('auth-container');
  const adminQuickAdd = document.getElementById('admin-quick-add');

  if (currentUser) {
    const isAdmin = currentUser.role === 'admin';
    if (isAdmin) {
      adminQuickAdd.classList.remove('hidden');
    } else {
      adminQuickAdd.classList.add('hidden');
    }

    container.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="text-xs font-mono px-2.5 py-1 rounded-full ${isAdmin ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-gray-800 text-gray-300'}">
          <i class="fa-solid ${isAdmin ? 'fa-user-shield' : 'fa-user'} mr-1"></i>${currentUser.username}
        </span>
        ${isAdmin ? `
          <button onclick="openAdminPanel()" class="text-xs px-3 py-1.5 rounded-lg bg-dark-card border border-dark-border hover:border-brand-500 text-gray-300 transition-all flex items-center space-x-1">
            <i class="fa-solid fa-sliders text-brand-500"></i>
            <span class="hidden sm:inline">Админка</span>
          </button>
        ` : ''}
        <button onclick="handleLogout()" class="text-xs p-2 text-gray-400 hover:text-rose-400 transition-colors" title="Выйти">
          <i class="fa-solid fa-right-from-bracket text-base"></i>
        </button>
      </div>
    `;
  } else {
    adminQuickAdd.classList.add('hidden');
    container.innerHTML = `
      <button onclick="openModal('modal-auth')" class="text-xs font-semibold px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-lg shadow-brand-600/20">
        Вход / Регистрация
      </button>
    `;
  }
}

function handleLogin(e) {
  e.preventDefault();
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value.trim();

  if (u === 'admin' && p === 'admin') {
    currentUser = { username: 'admin', role: 'admin' };
  } else {
    const found = users.find(x => x.username === u);
    if (found) {
      currentUser = { username: found.username, role: found.role };
    } else {
      showToast('Пользователь не найден!', true);
      return;
    }
  }

  saveState();
  renderAuthHeader();
  renderCards();
  closeModal('modal-auth');
  showToast(`Добро пожаловать, ${currentUser.username}!`);
}

function handleRegister(e) {
  e.preventDefault();
  const u = document.getElementById('reg-username').value.trim();
  const p = document.getElementById('reg-password').value.trim();

  if (users.some(x => x.username === u)) {
    showToast('Пользователь с таким именем уже существует!', true);
    return;
  }

  const newUser = { username: u, role: 'user' };
  users.push(newUser);
  currentUser = newUser;
  saveState();
  renderAuthHeader();
  renderCards();
  closeModal('modal-auth');
  showToast('Регистрация успешна!');
}

function handleLogout() {
  currentUser = null;
  saveState();
  renderAuthHeader();
  renderCards();
  showToast('Вы вышли из системы');
}

function switchAuthTab(tab) {
  const loginBtn = document.getElementById('tab-login-btn');
  const regBtn = document.getElementById('tab-register-btn');
  const loginForm = document.getElementById('form-login');
  const regForm = document.getElementById('form-register');

  if (tab === 'login') {
    loginBtn.className = "flex-1 pb-3 text-sm font-bold border-b-2 border-brand-500 text-brand-500";
    regBtn.className = "flex-1 pb-3 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-200";
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
  } else {
    regBtn.className = "flex-1 pb-3 text-sm font-bold border-b-2 border-brand-500 text-brand-500";
    loginBtn.className = "flex-1 pb-3 text-sm font-bold border-b-2 border-transparent text-gray-400 hover:text-gray-200";
    regForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

// RENDER CARDS & SEARCH
function renderCards() {
  const grid = document.getElementById('cards-grid');
  const empty = document.getElementById('empty-state');
  grid.innerHTML = '';

  let filtered = items.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.type === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      item.title.toLowerCase().includes(q) || 
      item.tag.toLowerCase().includes(q) ||
      (item.desc && item.desc.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  document.getElementById('count-all').innerText = items.length;
  document.getElementById('count-code').innerText = items.filter(x => x.type === 'code').length;
  document.getElementById('count-links').innerText = items.filter(x => x.type === 'links').length;

  if (filtered.length === 0) {
    empty.classList.remove('hidden');
    return;
  } else {
    empty.classList.add('hidden');
  }

  const isAdmin = currentUser && currentUser.role === 'admin';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = "bg-dark-card border border-dark-border hover:border-gray-700 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-lg group";

    const isCode = item.type === 'code';
    const typeBadge = isCode 
      ? `<span class="px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-mono font-medium"><i class="fa-solid fa-code mr-1"></i>Код</span>`
      : `<span class="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium"><i class="fa-solid fa-link mr-1"></i>Ссылки</span>`;

    let contentHTML = '';

    if (isCode) {
      contentHTML = `
        <div class="relative group/code mt-3">
          <pre class="bg-dark-bg p-3.5 rounded-xl border border-dark-border font-mono text-xs text-gray-300 max-h-36 overflow-y-auto whitespace-pre-wrap">${escapeHTML(item.code)}</pre>
          <button onclick="copyToClipboard(\`${escapeForJS(item.code)}\`)" class="absolute top-2 right-2 px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg opacity-90 group-hover/code:opacity-100 transition-all shadow-md flex items-center space-x-1">
            <i class="fa-solid fa-copy"></i>
            <span>Копия</span>
          </button>
        </div>
      `;
    } else {
      const fontClass = `text-size-${item.fontSize || 'base'}`;
      const listTag = item.listStyle === 'decimal' ? 'ol' : 'ul';
      const listStyleClass = item.listStyle === 'decimal' ? 'list-decimal pl-5' : 'list-disc pl-5';

      const linksHTML = (item.links || []).map(link => `
        <li class="py-1">
          <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:text-brand-300 hover:underline inline-flex items-center space-x-1.5 transition-colors">
            <span>${escapeHTML(link.label)}</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px] opacity-70"></i>
          </a>
        </li>
      `).join('');

      contentHTML = `
        <div class="bg-dark-bg p-3.5 rounded-xl border border-dark-border mt-3">
          <${listTag} class="${listStyleClass} ${fontClass} text-gray-300 space-y-1 max-h-36 overflow-y-auto">
            ${linksHTML}
          </${listTag}>
        </div>
      `;
    }

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          ${typeBadge}
          <span class="text-xs font-mono text-gray-400 bg-dark-bg px-2 py-1 rounded border border-dark-border">${item.tag}</span>
        </div>

        <div class="flex items-start space-x-3">
          <div class="w-8 h-8 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-brand-500 shrink-0 mt-0.5">
            <i class="fa-solid ${item.icon || 'fa-box'}"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-100 text-base leading-snug group-hover:text-brand-400 transition-colors">${escapeHTML(item.title)}</h3>
            <p class="text-xs text-gray-400 mt-1 line-clamp-2">${escapeHTML(item.desc || '')}</p>
          </div>
        </div>

        ${contentHTML}
      </div>

      <div class="flex items-center justify-between pt-4 mt-4 border-t border-dark-border text-xs">
        <button onclick="viewDetail('${item.id}')" class="text-gray-400 hover:text-white flex items-center space-x-1 font-medium">
          <i class="fa-solid fa-expand"></i>
          <span>Подробнее</span>
        </button>

        ${isAdmin ? `
          <div class="flex items-center space-x-2">
            <button onclick="editItem('${item.id}')" class="p-1.5 text-gray-400 hover:text-brand-400 transition-colors" title="Редактировать">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button onclick="deleteItem('${item.id}')" class="p-1.5 text-gray-400 hover:text-rose-400 transition-colors" title="Удалить">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `;

    grid.appendChild(card);
  });
}

// SEARCH & FILTER HANDLERS
function handleSearch() {
  const val = document.getElementById('search-input').value;
  searchQuery = val;
  document.getElementById('clear-search').classList.toggle('hidden', !val);
  renderCards();
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  searchQuery = '';
  document.getElementById('clear-search').classList.add('hidden');
  renderCards();
}

function filterCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => {
    if (btn.dataset.cat === cat) {
      btn.className = "cat-btn active px-4 py-2 rounded-lg text-sm font-medium transition-all bg-brand-600 text-white shadow-lg shadow-brand-600/20";
    } else {
      btn.className = "cat-btn px-4 py-2 rounded-lg text-sm font-medium transition-all bg-dark-card border border-dark-border text-gray-400 hover:text-white hover:border-gray-600";
    }
  });
  renderCards();
}

function resetFilters() {
  clearSearch();
  filterCategory('all');
}

// ITEM CREATE / EDIT HANDLERS
function toggleItemTypeFields() {
  const type = document.getElementById('item-type').value;
  const codeBox = document.getElementById('field-code-container');
  const linksBox = document.getElementById('field-links-container');

  if (type === 'code') {
    codeBox.classList.remove('hidden');
    linksBox.classList.add('hidden');
  } else {
    codeBox.classList.add('hidden');
    linksBox.classList.remove('hidden');
  }
}

function saveItem(e) {
  e.preventDefault();
  const id = document.getElementById('edit-item-id').value;
  const type = document.getElementById('item-type').value;
  const title = document.getElementById('item-title').value.trim();
  const tag = document.getElementById('item-tag').value.trim();
  const icon = document.getElementById('item-icon').value.trim() || (type === 'code' ? 'fa-code' : 'fa-list');
  const desc = document.getElementById('item-desc').value.trim();

  let itemObj = { id: id || `item-${Date.now()}`, type, title, tag, icon, desc };

  if (type === 'code') {
    itemObj.code = document.getElementById('item-code').value;
  } else {
    itemObj.listStyle = document.getElementById('item-list-style').value;
    itemObj.fontSize = document.getElementById('item-font-size').value;
    const rawLinks = document.getElementById('item-links-raw').value.split('
');
    itemObj.links = rawLinks.filter(line => line.includes('|')).map(line => {
      const parts = line.split('|');
      return { label: parts[0].trim(), url: parts[1].trim() };
    });
  }

  if (id) {
    const index = items.findIndex(x => x.id === id);
    if (index !== -1) items[index] = itemObj;
  } else {
    items.unshift(itemObj);
  }

  saveState();
  renderCards();
  closeModal('modal-editor');
  showToast('Запись успешно сохранена!');
}

function editItem(id) {
  const item = items.find(x => x.id === id);
  if (!item) return;

  document.getElementById('editor-title').innerText = 'Редактировать запись';
  document.getElementById('edit-item-id').value = item.id;
  document.getElementById('item-type').value = item.type;
  document.getElementById('item-title').value = item.title;
  document.getElementById('item-tag').value = item.tag;
  document.getElementById('item-icon').value = item.icon || '';
  document.getElementById('item-desc').value = item.desc || '';

  toggleItemTypeFields();

  if (item.type === 'code') {
    document.getElementById('item-code').value = item.code || '';
  } else {
    document.getElementById('item-list-style').value = item.listStyle || 'disc';
    document.getElementById('item-font-size').value = item.fontSize || 'base';
    const raw = (item.links || []).map(l => `${l.label} | ${l.url}`).join('
');
    document.getElementById('item-links-raw').value = raw;
  }

  openModal('modal-editor');
}

function deleteItem(id) {
  if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;
  items = items.filter(x => x.id !== id);
  saveState();
  renderCards();
  showToast('Запись удалена');
}

// VIEW DETAIL MODAL
function viewDetail(id) {
  const item = items.find(x => x.id === id);
  if (!item) return;

  document.getElementById('detail-title').innerText = item.title;
  const content = document.getElementById('detail-content');

  if (item.type === 'code') {
    content.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center space-x-2">
          <span class="px-2.5 py-1 rounded bg-brand-500/10 text-brand-400 font-mono text-xs border border-brand-500/20">${item.tag}</span>
        </div>
        <p class="text-sm text-gray-300">${escapeHTML(item.desc || '')}</p>
        <div class="relative">
          <pre class="bg-dark-bg p-4 rounded-xl border border-dark-border font-mono text-xs text-gray-200 whitespace-pre-wrap overflow-x-auto">${escapeHTML(item.code)}</pre>
          <button onclick="copyToClipboard(\`${escapeForJS(item.code)}\`)" class="mt-3 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center space-x-2">
            <i class="fa-solid fa-copy"></i>
            <span>Скопировать код полностью</span>
          </button>
        </div>
      </div>
    `;
  } else {
    const fontClass = `text-size-${item.fontSize || 'base'}`;
    const listTag = item.listStyle === 'decimal' ? 'ol' : 'ul';
    const listStyleClass = item.listStyle === 'decimal' ? 'list-decimal pl-6' : 'list-disc pl-6';

    const linksHTML = (item.links || []).map(link => `
      <li class="py-1">
        <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:underline font-medium text-base inline-flex items-center space-x-2">
          <span>${escapeHTML(link.label)}</span>
          <i class="fa-solid fa-external-link text-xs"></i>
        </a>
      </li>
    `).join('');

    content.innerHTML = `
      <div class="space-y-4">
        <div class="flex items-center space-x-2">
          <span class="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs border border-emerald-500/20">${item.tag}</span>
        </div>
        <p class="text-sm text-gray-300">${escapeHTML(item.desc || '')}</p>
        <div class="bg-dark-bg p-5 rounded-xl border border-dark-border">
          <${listTag} class="${listStyleClass} ${fontClass} text-gray-200 space-y-2">
            ${linksHTML}
          </${listTag}>
        </div>
      </div>
    `;
  }

  openModal('modal-detail');
}

// ADMIN PANEL MANAGEMENT
function openAdminPanel() {
  renderUsersTable();
  openModal('modal-admin-panel');
}

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '';

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-dark-bg/50 transition-colors";
    tr.innerHTML = `
      <td class="p-3 font-medium">${u.username}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 rounded text-xs font-mono ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400'}">${u.role}</span>
      </td>
      <td class="p-3 text-right">
        ${u.username !== 'admin' ? `
          <button onclick="toggleUserRole('${u.username}')" class="text-xs px-2 py-1 bg-dark-bg border border-dark-border hover:border-brand-500 rounded text-gray-300 mr-1">
            Сменить роль
          </button>
          <button onclick="deleteUser('${u.username}')" class="text-xs px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded">
            Удалить
          </button>
        ` : '<span class="text-xs text-gray-500">Системный</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function toggleUserRole(username) {
  const u = users.find(x => x.username === username);
  if (u) {
    u.role = u.role === 'admin' ? 'user' : 'admin';
    saveState();
    renderUsersTable();
    renderAuthHeader();
    showToast(`Роль ${username} изменена`);
  }
}

function deleteUser(username) {
  if (!confirm(`Удалить пользователя ${username}?`)) return;
  users = users.filter(x => x.username !== username);
  saveState();
  renderUsersTable();
  showToast('Пользователь удален');
}

// IMPORT / EXPORT JSON
function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `savevault_backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('База данных экспортирована!');
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        items = imported;
        saveState();
        renderCards();
        showToast('Данные успешно импортированы!');
      }
    } catch (err) {
      showToast('Ошибка при чтении JSON файла', true);
    }
  };
  reader.readAsText(file);
}

async function resetToDefaults() {
  if (!confirm('Сбросить все данные к исходным из data.json?')) return;
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    items = data.items || [];
    users = data.users || [];
  } catch (e) {
    items = [];
    users = [];
  }
  saveState();
  renderCards();
  renderUsersTable();
  showToast('Данные сброшены к исходным');
}

// UTILS & TOAST
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Скопировано в буфер обмена!');
  });
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  toastMsg.innerText = msg;

  if (isError) {
    toast.className = "fixed bottom-6 right-6 transform translate-y-0 opacity-100 transition-all duration-300 bg-rose-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 z-50";
  } else {
    toast.className = "fixed bottom-6 right-6 transform translate-y-0 opacity-100 transition-all duration-300 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 z-50";
  }

  setTimeout(() => {
    toast.className = toast.className.replace('translate-y-0 opacity-100', 'translate-y-20 opacity-0');
  }, 3000);
}

function openModal(id) {
  if (id === 'modal-editor' && !document.getElementById('edit-item-id').value) {
    document.getElementById('editor-title').innerText = 'Создать новую запись';
    document.getElementById('form-item').reset();
    document.getElementById('edit-item-id').value = '';
    toggleItemTypeFields();
  }
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.classList.add('flex');
}

function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.add('hidden');
  el.classList.remove('flex');
}

function escapeHTML(str) {
  return str ? str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  ) : '';
}

function escapeForJS(str) {
  return str ? str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${') : '';
}
