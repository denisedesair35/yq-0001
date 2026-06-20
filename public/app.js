const moodInput = document.getElementById('moodInput');
const submitBtn = document.getElementById('submitBtn');
const moodList = document.getElementById('moodList');
const message = document.getElementById('message');

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
      <li class="mood-item">
        <div class="mood-time">🕒 ${formatDateTime(mood.created_at)}</div>
        <div class="mood-content">${escapeHtml(mood.content)}</div>
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

submitBtn.addEventListener('click', submitMood);

moodInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    submitMood();
  }
});

loadMoods();
