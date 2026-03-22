import { getAllEntries, deleteEntry } from '../db.js';
import { formatDateHuman, formatDateShort, getWeekStart, getWeekEnd } from '../utils/date.js';
import { sumDistance, sumCalories } from '../utils/calculations.js';
import { subscribe, emit } from '../store.js';
import { navigate } from '../router.js';

export function render() {
  return `
    <div class="screen" id="history-screen">
      <div class="screen-title">История</div>
      <div id="history-content"></div>
    </div>
  `;
}

export function mount(container) {
  const unsubs = [];

  async function refresh() {
    const entries = await getAllEntries();
    const contentEl = container.querySelector('#history-content');
    if (!contentEl) return;

    if (entries.length === 0) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-text">Пока нет записей.<br>Добавьте первую тренировку!</div>
        </div>
      `;
      return;
    }

    // Group by week
    const weeks = new Map();
    for (const entry of entries) {
      const weekStart = getWeekStart(entry.date);
      if (!weeks.has(weekStart)) {
        weeks.set(weekStart, []);
      }
      weeks.get(weekStart).push(entry);
    }

    let html = '';
    for (const [weekStart, weekEntries] of weeks) {
      const weekEnd = getWeekEnd(weekStart);
      const totalDist = sumDistance(weekEntries);
      const totalCal = sumCalories(weekEntries);

      // Group by day within week
      const days = new Map();
      for (const e of weekEntries) {
        if (!days.has(e.date)) days.set(e.date, []);
        days.get(e.date).push(e);
      }

      html += `
        <div class="history-week">
          <div class="history-week-header">
            <div class="history-week-title">${formatDateHuman(weekStart)} — ${formatDateHuman(weekEnd)}</div>
            <div class="history-week-total">${totalDist.toFixed(1)} км${totalCal ? ` · ${totalCal} ккал` : ''}</div>
          </div>
          <div class="list-group">
      `;

      for (const [date, dayEntries] of days) {
        const dayTotal = sumDistance(dayEntries);
        html += `
          <div class="history-day">
            <div class="list-item history-day-header" style="cursor:default;">
              <span class="history-day-name">${formatDateShort(date)}</span>
              <span class="history-day-date">${formatDateHuman(date)}</span>
              <span class="history-day-total">${dayTotal.toFixed(1)} км</span>
            </div>
        `;

        for (const entry of dayEntries) {
          html += `
            <div class="list-item entry-item" data-id="${entry.id}" style="padding-left:44px;cursor:pointer;">
              <div class="entry-item-info">
                <div class="entry-item-distance">${entry.distance} км</div>
                <div class="entry-item-meta">
                  ${entry.calories ? `🔥 ${entry.calories} ккал` : ''}
                  ${entry.note ? ` · ${entry.note}` : ''}
                </div>
              </div>
              <button class="entry-item-delete" data-delete-id="${entry.id}" aria-label="Удалить">✕</button>
            </div>
          `;
        }

        html += `</div>`;
      }

      html += `</div></div>`;
    }

    contentEl.innerHTML = html;
  }

  refresh();

  function handleClick(e) {
    const deleteBtn = e.target.closest('[data-delete-id]');
    if (deleteBtn) {
      e.stopPropagation();
      const id = Number(deleteBtn.dataset.deleteId);
      confirmDelete(id);
      return;
    }
    const entryItem = e.target.closest('.entry-item[data-id]');
    if (entryItem) {
      navigate(`/add?id=${entryItem.dataset.id}`);
    }
  }

  function confirmDelete(id) {
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

  const screen = container.querySelector('#history-screen');
  if (screen) screen.addEventListener('click', handleClick);

  unsubs.push(subscribe('entries-changed', refresh));

  return () => {
    unsubs.forEach((fn) => fn());
    if (screen) screen.removeEventListener('click', handleClick);
  };
}
