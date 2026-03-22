import { getSetting, setSetting, addMeasurement, getAllMeasurements, getLatestMeasurement } from '../db.js';
import { today, formatDateHuman } from '../utils/date.js';
import { emit } from '../store.js';
import { exportAllData, importData } from '../utils/export.js';
import { showPicker } from '../components/WheelPicker.js';

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
          <div class="input-row input-row-tappable" id="goal-row" data-picker="goal" data-value="${weeklyGoal || 0}">
            <label>Недельная цель</label>
            <span class="input-row-value" id="goal-display">${weeklyGoal ? `${parseFloat(weeklyGoal).toFixed(1)} км` : 'Указать'}</span>
            <span class="input-row-chevron"></span>
          </div>
        </div>
      </div>

      <div class="section-header">Замеры тела</div>
      <div class="settings-section">
        <div class="input-group">
          <div class="input-row input-row-tappable" id="weight-row" data-picker="weight" data-value="${currentWeight || 0}">
            <label>Вес</label>
            <span class="input-row-value" id="weight-display">${currentWeight ? `${parseFloat(currentWeight).toFixed(1)} кг` : 'Указать'}</span>
            <span class="input-row-chevron"></span>
          </div>
          <div class="input-row input-row-tappable" id="waist-row" data-picker="waist" data-value="${latest?.waist || 0}">
            <label>Талия</label>
            <span class="input-row-value" id="waist-display">${latest?.waist ? `${parseFloat(latest.waist).toFixed(1)} см` : 'Указать'}</span>
            <span class="input-row-chevron"></span>
          </div>
          <div class="input-row input-row-tappable" id="hips-row" data-picker="hips" data-value="${latest?.hips || 0}">
            <label>Бёдра</label>
            <span class="input-row-value" id="hips-display">${latest?.hips ? `${parseFloat(latest.hips).toFixed(1)} см` : 'Указать'}</span>
            <span class="input-row-chevron"></span>
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
    // Picker values stored on rows via data-value
    const units = { goal: 'км', weight: 'кг', waist: 'см', hips: 'см' };

    // Open picker on row tap
    el.querySelectorAll('[data-picker]').forEach((row) => {
      row.addEventListener('click', () => {
        const type = row.dataset.picker;
        const currentVal = parseFloat(row.dataset.value) || 0;

        showPicker(type, currentVal, async (newVal) => {
          row.dataset.value = newVal;
          const displayEl = row.querySelector('.input-row-value');
          displayEl.textContent = `${newVal.toFixed(1)} ${units[type]}`;

          if (type === 'goal') {
            await setSetting('weeklyGoal', newVal);
            emit('settings-changed');
            showToast(el, 'Цель сохранена');
          } else if (type === 'weight') {
            await setSetting('currentWeight', newVal);
            emit('settings-changed');
          }
        });
      });
    });

    // Save measurements button
    el.querySelector('#save-measurements-btn').addEventListener('click', async () => {
      const weight = parseFloat(el.querySelector('#weight-row').dataset.value) || null;
      const waist = parseFloat(el.querySelector('#waist-row').dataset.value) || null;
      const hips = parseFloat(el.querySelector('#hips-row').dataset.value) || null;

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
