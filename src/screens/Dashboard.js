import { createProgressRing } from '../components/ProgressRing.js';
import { getEntriesByDate, getEntriesByDateRange, getSetting, deleteEntry } from '../db.js';
import { getDailyRecommendation, sumCalories } from '../utils/calculations.js';
import { today, getWeekStart, getWeekEnd, formatDateHuman } from '../utils/date.js';
import { subscribe, emit } from '../store.js';
import { navigate } from '../router.js';

const ring = createProgressRing(180, 14);

export function render() {
  return `
    <div class="screen dashboard" id="dashboard">
      <div class="screen-title">Трекер Дистанции</div>
      <div id="dashboard-content">
        <div class="empty-state">
          <div class="empty-state-icon">🏃</div>
          <div class="empty-state-text">Загрузка...</div>
        </div>
      </div>
    </div>
  `;
}

export function mount(container) {
  const unsubs = [];

  async function refresh() {
    const todayStr = today();
    const weekStart = getWeekStart(todayStr);
    const weekEnd = getWeekEnd(todayStr);
    const weeklyGoal = (await getSetting('weeklyGoal')) || 0;
    const weekEntries = await getEntriesByDateRange(weekStart, weekEnd);
    const todayEntries = await getEntriesByDate(todayStr);
    const rec = getDailyRecommendation(weeklyGoal, weekEntries);
    const todayCalories = sumCalories(todayEntries);

    const contentEl = container.querySelector('#dashboard-content');
    if (!contentEl) return;

    if (!weeklyGoal) {
      contentEl.innerHTML = `
        <div class="card card-elevated" style="text-align:center;padding:32px 24px;margin-bottom:16px;">
          <div style="font-size:48px;margin-bottom:16px;">🎯</div>
          <div style="font-size:20px;font-weight:600;margin-bottom:8px;">Установите недельную цель</div>
          <div style="color:var(--color-text-secondary);margin-bottom:20px;">
            Перейдите в настройки и задайте недельный объём ходьбы в километрах
          </div>
          <button class="btn btn-primary" onclick="location.hash='/settings'">Настройки</button>
        </div>
      `;
      return;
    }

    contentEl.innerHTML = `
      <div class="dashboard-progress">
        ${ring.render(
          rec.progress,
          `${rec.progressPercent}%`,
          `${rec.totalDone.toFixed(1)} / ${weeklyGoal} км`
        )}
      </div>

      <div class="dashboard-stats">
        <div class="stat-card highlight">
          <div class="stat-value">${rec.leftToday} км</div>
          <div class="stat-label">Осталось сегодня</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${rec.recommendedToday} км</div>
          <div class="stat-label">Рекомендация на день</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${rec.remaining.toFixed(1)} км</div>
          <div class="stat-label">Осталось за неделю</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${rec.daysLeft}</div>
          <div class="stat-label">Дней до конца недели</div>
        </div>
      </div>

      ${todayCalories > 0 ? `
        <div class="card" style="text-align:center;padding:12px;margin-bottom:16px;">
          <span style="font-size:15px;color:var(--color-warning);font-weight:600;">🔥 ${todayCalories} ккал сожжено сегодня</span>
        </div>
      ` : ''}

      <div class="today-entries-header">
        <div class="today-entries-title">Сегодня, ${formatDateHuman(todayStr)}</div>
      </div>

      ${todayEntries.length === 0 ? `
        <div class="card" style="text-align:center;padding:24px;color:var(--color-text-secondary);">
          Пока нет записей. Нажмите + чтобы добавить
        </div>
      ` : `
        <div class="list-group">
          ${todayEntries.map((e) => `
            <div class="list-item entry-item" data-id="${e.id}">
              <div class="entry-item-icon">🚶</div>
              <div class="entry-item-info">
                <div class="entry-item-distance">${e.distance} км</div>
                <div class="entry-item-meta">
                  ${e.calories ? `🔥 ${e.calories} ккал` : ''}
                  ${e.note ? ` · ${e.note}` : ''}
                </div>
              </div>
              <button class="entry-item-delete" data-delete-id="${e.id}" aria-label="Удалить">✕</button>
            </div>
          `).join('')}
        </div>
      `}
    `;
  }

  refresh();

  // Event delegation
  function handleClick(e) {
    const deleteBtn = e.target.closest('[data-delete-id]');
    if (deleteBtn) {
      e.stopPropagation();
      const id = Number(deleteBtn.dataset.deleteId);
      showDeleteConfirm(id, container, refresh);
      return;
    }
    const entryItem = e.target.closest('.entry-item[data-id]');
    if (entryItem) {
      navigate(`/add?id=${entryItem.dataset.id}`);
    }
  }

  const dashEl = container.querySelector('#dashboard');
  if (dashEl) dashEl.addEventListener('click', handleClick);

  unsubs.push(subscribe('entries-changed', refresh));
  unsubs.push(subscribe('settings-changed', refresh));

  return () => {
    unsubs.forEach((fn) => fn());
    if (dashEl) dashEl.removeEventListener('click', handleClick);
  };
}

function showDeleteConfirm(id, container, refresh) {
  const overlay = document.createElement('div');
  overlay.className = 'action-sheet-overlay';
  overlay.innerHTML = `
    <div class="action-sheet">
      <div class="action-sheet-group">
        <div class="action-sheet-title">Удалить запись?</div>
        <button class="action-sheet-btn danger" data-action="delete">Удалить</button>
      </div>
      <div class="action-sheet-group">
        <button class="action-sheet-btn action-sheet-cancel" data-action="cancel">Отмена</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'delete') {
      await deleteEntry(id);
      emit('entries-changed');
    }
    overlay.remove();
  });

  document.body.appendChild(overlay);
}
