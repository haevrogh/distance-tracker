import {
  addEntry,
  updateEntry,
  deleteEntry,
  getEntryById,
  getSetting,
} from '../db.js';
import { calculateCalories } from '../utils/calculations.js';
import { today } from '../utils/date.js';
import { emit } from '../store.js';
import { navigate } from '../router.js';
import {
  showCheckAnimation,
  showDailyGoalBadge,
  showWeeklyCelebration,
} from '../utils/celebrations.js';
import { getEntriesByDateRange } from '../db.js';
import { getDailyRecommendation } from '../utils/calculations.js';
import { getWeekStart, getWeekEnd } from '../utils/date.js';
import { showPicker } from '../components/WheelPicker.js';

export function render(params) {
  const isEdit = params && params.id;
  return `
    <div class="screen add-entry-screen" id="add-entry">
      <div class="screen-title">${isEdit ? 'Редактировать' : 'Новая запись'}</div>

      <div class="add-entry-hero" id="distance-picker-trigger" style="cursor:pointer;">
        <div class="big-input" id="distance-display" data-value="0">0.0</div>
        <div class="big-input-unit">километров · нажмите чтобы указать</div>
      </div>
      <input type="hidden" id="distance-input" value="0">

      <div class="input-group">
        <div class="input-row">
          <label for="date-input">Дата</label>
          <input type="date" id="date-input" value="${today()}">
        </div>
        <div class="input-row">
          <label for="note-input">Заметка</label>
          <input type="text" id="note-input" placeholder="Необязательно" maxlength="100">
        </div>
      </div>

      <div style="padding:16px 0;display:flex;flex-direction:column;gap:12px;">
        <button class="btn btn-primary btn-block" id="save-entry-btn">
          ${isEdit ? 'Сохранить' : 'Добавить'}
        </button>
        ${isEdit ? `
          <button class="btn btn-danger btn-block" id="delete-entry-btn">
            Удалить запись
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

export function mount(container, params) {
  const isEdit = params && params.id;
  const distInput = container.querySelector('#distance-input');
  const distDisplay = container.querySelector('#distance-display');
  const distTrigger = container.querySelector('#distance-picker-trigger');
  const dateInput = container.querySelector('#date-input');
  const noteInput = container.querySelector('#note-input');
  const saveBtn = container.querySelector('#save-entry-btn');
  const deleteBtn = container.querySelector('#delete-entry-btn');

  function setDistance(val) {
    distInput.value = val;
    distDisplay.dataset.value = val;
    distDisplay.textContent = val > 0 ? val.toFixed(1) : '0.0';
    // Update hint text
    const unitEl = container.querySelector('.big-input-unit');
    if (unitEl) {
      unitEl.textContent = val > 0 ? 'километров' : 'километров · нажмите чтобы указать';
    }
  }

  function openDistancePicker() {
    const current = parseFloat(distInput.value) || 0;
    showPicker('distance', current, (newVal) => {
      setDistance(newVal);
    });
  }

  // Load existing entry for editing
  if (isEdit) {
    loadEntry(Number(params.id));
  }

  // Open picker on tap (auto-open for new entries)
  distTrigger.addEventListener('click', openDistancePicker);
  if (!isEdit) {
    setTimeout(() => openDistancePicker(), 400);
  }

  async function loadEntry(id) {
    const entry = await getEntryById(id);
    if (entry) {
      setDistance(entry.distance);
      dateInput.value = entry.date;
      noteInput.value = entry.note || '';
    }
  }

  async function save() {
    const distance = parseFloat(distInput.value);
    if (!distance || distance <= 0) {
      distDisplay.classList.add('shake');
      setTimeout(() => distDisplay.classList.remove('shake'), 500);
      openDistancePicker();
      return;
    }

    const date = dateInput.value || today();
    const note = noteInput.value.trim();
    const weight = await getSetting('currentWeight');
    const calories = calculateCalories(weight, distance);

    if (isEdit) {
      await updateEntry(Number(params.id), { distance, date, note, calories });
    } else {
      await addEntry({ distance, date, note, calories });
    }

    emit('entries-changed');

    // Check celebrations
    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(date);
    const weeklyGoal = (await getSetting('weeklyGoal')) || 0;
    const weekEntries = await getEntriesByDateRange(weekStart, weekEnd);
    const rec = getDailyRecommendation(weeklyGoal, weekEntries);

    showCheckAnimation();

    if (rec.isGoalReached && weeklyGoal > 0) {
      setTimeout(() => {
        showWeeklyCelebration(
          rec.totalDone,
          rec.isOverAchieved,
          rec.progressPercent
        );
      }, 1000);
    } else if (rec.leftToday <= 0 && weeklyGoal > 0) {
      setTimeout(() => showDailyGoalBadge(), 1000);
    }

    setTimeout(() => navigate('/'), 600);
  }

  async function handleDelete() {
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
        await deleteEntry(Number(params.id));
        emit('entries-changed');
        navigate('/');
      }
      overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  saveBtn.addEventListener('click', save);
  if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);

  return () => {
    saveBtn.removeEventListener('click', save);
    if (deleteBtn) deleteBtn.removeEventListener('click', handleDelete);
    distTrigger.removeEventListener('click', openDistancePicker);
  };
}

// Shake animation for validation
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-8px); }
    40%, 80% { transform: translateX(8px); }
  }
  .shake {
    animation: shake 0.4s ease-in-out;
    border: 2px solid var(--color-danger) !important;
    border-radius: var(--radius-md);
  }
`;
document.head.appendChild(style);
