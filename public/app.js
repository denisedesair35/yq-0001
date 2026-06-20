const moodInput = document.getElementById('moodInput');
const submitBtn = document.getElementById('submitBtn');
const moodList = document.getElementById('moodList');
const message = document.getElementById('message');
const editModal = document.getElementById('editModal');
const editMoodInput = document.getElementById('editMoodInput');
const closeModal = document.getElementById('closeModal');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveEditBtn = document.getElementById('saveEditBtn');

let currentEditId = null;

function formatDateTime(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
  setTimeout(() => {
    message.textContent = '';
    message.className = 'message';
  }, 3000);
}

async function loadMoods() {
  try {
    const response = await fetch('/api/moods');
    const moods = await response.json();

    if (moods.length === 0) {
      moodList.innerHTML = '<li class="empty-state">还没有心情记录，快来记录第一条吧！</li>';
      return;
    }

    moodList.innerHTML = moods.map(mood => `
      <li class="mood-item" data-id="${mood.id}">
        <div class="mood-time">🕒 ${formatDateTime(mood.created_at)}</div>
        <div class="mood-content">${escapeHtml(mood.content)}</div>
        <div class="mood-actions">
          <button class="action-btn edit-btn" data-id="${mood.id}" data-action="edit">✏️ 编辑</button>
          <button class="action-btn delete-btn" data-id="${mood.id}" data-action="delete">🗑️ 删除</button>
        </div>
      </li>
    `).join('');
  } catch (err) {
    console.error('加载心情记录失败:', err);
    moodList.innerHTML = '<li class="empty-state" style="color: #f44336;">加载失败，请刷新页面重试</li>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function submitMood() {
  const content = moodInput.value.trim();

  if (!content) {
    showMessage('请输入心情内容', 'error');
    moodInput.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '提交中...';

  try {
    const response = await fetch('/api/mood', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showMessage('心情记录成功！', 'success');
      moodInput.value = '';
      await loadMoods();
    } else {
      showMessage(result.error || '提交失败', 'error');
    }
  } catch (err) {
    console.error('提交失败:', err);
    showMessage('网络错误，请稍后重试', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '记录心情';
  }
}

function openEditModal(id, content) {
  currentEditId = id;
  editMoodInput.value = content;
  editModal.classList.add('show');
  setTimeout(() => editMoodInput.focus(), 100);
}

function closeEditModal() {
  currentEditId = null;
  editMoodInput.value = '';
  editModal.classList.remove('show');
}

async function saveEdit() {
  const content = editMoodInput.value.trim();

  if (!currentEditId) {
    showMessage('无效的编辑操作', 'error');
    return;
  }

  if (!content) {
    showMessage('心情内容不能为空', 'error');
    editMoodInput.focus();
    return;
  }

  saveEditBtn.disabled = true;
  saveEditBtn.textContent = '保存中...';

  try {
    const response = await fetch(`/api/mood/${currentEditId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showMessage('修改成功！', 'success');
      closeEditModal();
      await loadMoods();
    } else {
      showMessage(result.error || '修改失败', 'error');
    }
  } catch (err) {
    console.error('修改失败:', err);
    showMessage('网络错误，请稍后重试', 'error');
  } finally {
    saveEditBtn.disabled = false;
    saveEditBtn.textContent = '保存修改';
  }
}

async function deleteMood(id) {
  if (!confirm('确定要删除这条心情记录吗？此操作不可撤销。')) {
    return;
  }

  try {
    const response = await fetch(`/api/mood/${id}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showMessage('删除成功！', 'success');
      await loadMoods();
    } else {
      showMessage(result.error || '删除失败', 'error');
    }
  } catch (err) {
    console.error('删除失败:', err);
    showMessage('网络错误，请稍后重试', 'error');
  }
}

submitBtn.addEventListener('click', submitMood);

moodInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    submitMood();
  }
});

moodList.addEventListener('click', (e) => {
  const target = e.target;
  if (target.tagName !== 'BUTTON' || !target.dataset.action) {
    return;
  }

  const id = parseInt(target.dataset.id);
  if (!id || isNaN(id)) {
    return;
  }

  if (target.dataset.action === 'edit') {
    const moodItem = target.closest('.mood-item');
    const contentEl = moodItem.querySelector('.mood-content');
    const content = contentEl.textContent;
    openEditModal(id, content);
  } else if (target.dataset.action === 'delete') {
    deleteMood(id);
  }
});

closeModal.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);
saveEditBtn.addEventListener('click', saveEdit);

editModal.addEventListener('click', (e) => {
  if (e.target === editModal) {
    closeEditModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editModal.classList.contains('show')) {
    closeEditModal();
  }
});

editMoodInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    saveEdit();
  }
});

loadMoods();
