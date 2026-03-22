import { getSetting, setSetting, addMeasurement, getAllMeasurements, getLatestMeasurement } from '../db.js';
import { today, formatDateHuman } from '../utils/date.js';
import { emit } from '../store.js';
import { exportAllData, importData } from '../utils/export.js';

export function render() {
  return `
    <div class="screen" id="settings-screen">
      <div class="screen-title">Настройки</div>
      <div id="settings-content"></div>
    </div>
  `;
}

export function mount(container) {
  async function refresh() {
    const weeklyGoal = (await getSetting('weeklyGoal')) || '';
    const currentWeight = (await getSetting('currentWeight')) || '';
    const latest = await getLatestMeasurement();
    const measurements = await getAllMeasurements();
    const contentEl = container.querySelector('#settings-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="section-header">Цель</div>
      <div class="settings-section">
        <div class="input-group">
          <div class="input-row">
            <label for="weekly-goal">Недельная цель</label>
            <input type="number" id="weekly-goal" value="${weeklyGoal}"
                   placeholder="0" inputmode="decimal" step="0.5" min="0">
            <span style="color:var(--color-text-secondary);font-size:15px;">км</span>
          </div>
        </div>
      </div>

      <div class="section-header">Замеры тела</div>
      <div class="settings-section">
        <div class="input-group">
          <div class="input-row">
            <label for="weight-input">Вес</label>
            <input type="number" id="weight-input" value="${currentWeight}"
                   placeholder="0" inputmode="decimal" step="0.1" min="0">
            <span style="color:var(--color-text-secondary);font-size:15px;">кг</span>
          </div>
          <div class="input-row">
            <label for="waist-input">Талия</label>
            <input type="number" id="waist-input" value="${latest?.waist || ''}"
                   placeholder="0" inputmode="decimal" step="0.5" min="0">
            <span style="color:var(--color-text-secondary);font-size:15px;">см</span>
          </div>
          <div class="input-row">
            <label for="hips-input">Бёдра</label>
            <input type="number" id="hips-input" value="${latest?.hips || ''}"
                   placeholder="0" inputmode="decimal" step="0.5" min="0">
            <span style="color:var(--color-text-secondary);font-size:15px;">см</span>
          </div>
        </div>
        <div style="padding:12px 0;">
          <button class="btn btn-secondary btn-block" id="save-measurements-btn">
            Сохранить замеры
          </button>
        </div>

        ${measurements.length > 0 ? `
          <div class="section-header">История замеров</div>
          <div class="list-group">
            ${measurements.reverse().slice(0, 10).map((m) => `
              <div class="list-item">
                <div class="list-item-content">
                  <div class="list-item-title">${formatDateHuman(m.date)}</div>
                  <div class="list-item-subtitle">
                    ${m.weight ? `${m.weight} кг` : ''}
                    ${m.waist ? ` · Талия: ${m.waist} см` : ''}
                    ${m.hips ? ` · Бёдра: ${m.hips} см` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="section-header">Данные</div>
      <div class="settings-section">
        <div class="list-group">
          <button class="list-item" id="export-btn" style="width:100%;text-align:left;">
            <div class="list-item-content">
              <div class="list-item-title">Экспорт данных</div>
              <div class="list-item-subtitle">Скачать все данные в JSON файл</div>
            </div>
          </button>
          <label class="list-item" style="cursor:pointer;">
            <div class="list-item-content">
              <div class="list-item-title">Импорт данных</div>
              <div class="list-item-subtitle">Загрузить данные из файла</div>
            </div>
            <input type="file" id="import-input" accept=".json" style="display:none;">
          </label>
        </div>
      </div>

      <div class="settings-footer">
        Трекер Дистанции v1.0.0<br>
        Данные хранятся локально на устройстве
      </div>

      <div id="settings-toast" style="display:none;"></div>
    `;

    bindEvents(contentEl);
  }

  function bindEvents(el) {
    // Weekly goal - auto-save on change
    const goalInput = el.querySelector('#weekly-goal');
    let goalTimeout;
    goalInput.addEventListener('input', () => {
      clearTimeout(goalTimeout);
      goalTimeout = setTimeout(async () => {
        const val = parseFloat(goalInput.value) || 0;
        await setSetting('weeklyGoal', val);
        emit('settings-changed');
        showToast(el, 'Цель сохранена');
      }, 500);
    });

    // Weight - auto-save
    const weightInput = el.querySelector('#weight-input');
    let weightTimeout;
    weightInput.addEventListener('input', () => {
      clearTimeout(weightTimeout);
      weightTimeout = setTimeout(async () => {
        const val = parseFloat(weightInput.value) || 0;
        await setSetting('currentWeight', val);
        emit('settings-changed');
      }, 500);
    });

    // Save measurements button
    el.querySelector('#save-measurements-btn').addEventListener('click', async () => {
      const weight = parseFloat(weightInput.value) || null;
      const waist = parseFloat(el.querySelector('#waist-input').value) || null;
      const hips = parseFloat(el.querySelector('#hips-input').value) || null;

      if (!weight && !waist && !hips) {
        showToast(el, 'Введите хотя бы один замер');
        return;
      }

      if (weight) {
        await setSetting('currentWeight', weight);
      }

      await addMeasurement({
        date: today(),
        weight,
        waist,
        hips,
      });

      emit('measurements-changed');
      emit('settings-changed');
      showToast(el, 'Замеры сохранены');
      refresh();
    });

    // Export
    el.querySelector('#export-btn').addEventListener('click', async () => {
      await exportAllData();
      showToast(el, 'Данные экспортированы');
    });

    // Import
    el.querySelector('#import-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const count = await importData(file);
        emit('entries-changed');
        emit('measurements-changed');
        emit('settings-changed');
        showToast(el, `Импортировано ${count} записей`);
        refresh();
      } catch (err) {
        showToast(el, `Ошибка: ${err.message}`, true);
      }
    });
  }

  refresh();
  return () => {};
}

function showToast(el, message, isError = false) {
  // Remove existing
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.cssText = `
    position: fixed;
    top: calc(16px + var(--safe-top));
    left: 50%;
    transform: translateX(-50%);
    background: ${isError ? 'var(--color-danger)' : 'var(--color-text)'};
    color: white;
    padding: 12px 24px;
    border-radius: var(--radius-full);
    font-size: 15px;
    font-weight: 500;
    z-index: 5000;
    animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: var(--shadow-lg);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) scale(0.8)';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
