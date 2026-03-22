import { Chart, registerables } from 'chart.js';
import { getEntriesByDateRange, getAllMeasurements, getSetting } from '../db.js';
import {
  today,
  getWeekStart,
  getWeekEnd,
  getDaysOfWeek,
  formatDateShort,
  formatDateHuman,
  weeksAgo,
  addDays,
} from '../utils/date.js';
import { sumDistance } from '../utils/calculations.js';
import { subscribe } from '../store.js';

Chart.register(...registerables);

const chartInstances = [];

function destroyCharts() {
  chartInstances.forEach((c) => c.destroy());
  chartInstances.length = 0;
}

export function render() {
  return `
    <div class="screen" id="charts-screen">
      <div class="screen-title">Графики</div>

      <div class="segment-control" id="period-selector" style="margin-bottom:16px;">
        <button class="segment-btn active" data-period="week">Неделя</button>
        <button class="segment-btn" data-period="month">Месяц</button>
        <button class="segment-btn" data-period="3months">3 мес</button>
      </div>

      <div class="chart-container">
        <div class="chart-title">Дистанция</div>
        <div class="chart-canvas-wrapper">
          <canvas id="distance-chart"></canvas>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Калории</div>
        <div class="chart-canvas-wrapper">
          <canvas id="calories-chart"></canvas>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Вес</div>
        <div class="chart-canvas-wrapper">
          <canvas id="weight-chart"></canvas>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Талия и бёдра</div>
        <div class="chart-canvas-wrapper">
          <canvas id="body-chart"></canvas>
        </div>
      </div>
    </div>
  `;
}

export function mount(container) {
  let currentPeriod = 'week';
  const unsubs = [];

  async function refresh() {
    destroyCharts();
    await renderDistanceChart(container, currentPeriod);
    await renderCaloriesChart(container, currentPeriod);
    await renderWeightChart(container);
    await renderBodyChart(container);
  }

  refresh();

  // Period selector
  const selector = container.querySelector('#period-selector');
  function handlePeriodClick(e) {
    const btn = e.target.closest('.segment-btn');
    if (!btn) return;
    currentPeriod = btn.dataset.period;
    selector.querySelectorAll('.segment-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
    refresh();
  }
  if (selector) selector.addEventListener('click', handlePeriodClick);

  unsubs.push(subscribe('entries-changed', refresh));
  unsubs.push(subscribe('measurements-changed', refresh));

  return () => {
    destroyCharts();
    unsubs.forEach((fn) => fn());
    if (selector) selector.removeEventListener('click', handlePeriodClick);
  };
}

async function renderDistanceChart(container, period) {
  const canvas = container.querySelector('#distance-chart');
  if (!canvas) return;

  const { labels, data, goalLine } = await getDistanceData(period);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(0, 122, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 122, 255, 0.02)');

  const chart = new Chart(ctx, {
    type: period === 'week' ? 'bar' : 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Дистанция (км)',
          data,
          backgroundColor:
            period === 'week'
              ? data.map((v, i) => {
                  return v >= (goalLine || 999)
                    ? 'rgba(52, 199, 89, 0.8)'
                    : 'rgba(0, 122, 255, 0.8)';
                })
              : gradient,
          borderColor: 'rgba(0, 122, 255, 1)',
          borderWidth: period === 'week' ? 0 : 2.5,
          borderRadius: period === 'week' ? 8 : 0,
          fill: period !== 'week',
          tension: 0.4,
          pointRadius: period === 'week' ? 0 : 4,
          pointBackgroundColor: 'rgba(0, 122, 255, 1)',
        },
      ],
    },
    options: chartOptions('км'),
  });
  chartInstances.push(chart);
}

async function renderCaloriesChart(container, period) {
  const canvas = container.querySelector('#calories-chart');
  if (!canvas) return;

  const { labels, data: distData } = await getDistanceData(period);
  const weight = (await getSetting('currentWeight')) || 70;

  const calData = distData.map((d) => Math.round(d * weight * 0.5));

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(255, 149, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 149, 0, 0.02)');

  const chart = new Chart(ctx, {
    type: period === 'week' ? 'bar' : 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Калории',
          data: calData,
          backgroundColor:
            period === 'week'
              ? 'rgba(255, 149, 0, 0.8)'
              : gradient,
          borderColor: 'rgba(255, 149, 0, 1)',
          borderWidth: period === 'week' ? 0 : 2.5,
          borderRadius: period === 'week' ? 8 : 0,
          fill: period !== 'week',
          tension: 0.4,
          pointRadius: period === 'week' ? 0 : 4,
          pointBackgroundColor: 'rgba(255, 149, 0, 1)',
        },
      ],
    },
    options: chartOptions('ккал'),
  });
  chartInstances.push(chart);
}

async function renderWeightChart(container) {
  const canvas = container.querySelector('#weight-chart');
  if (!canvas) return;

  const measurements = await getAllMeasurements();
  const withWeight = measurements.filter((m) => m.weight);

  if (withWeight.length < 2) {
    canvas.parentElement.innerHTML =
      '<div class="empty-state" style="padding:24px;"><div class="empty-state-text">Нужно минимум 2 замера веса</div></div>';
    return;
  }

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(175, 82, 222, 0.2)');
  gradient.addColorStop(1, 'rgba(175, 82, 222, 0.02)');

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: withWeight.map((m) => formatDateHuman(m.date)),
      datasets: [
        {
          label: 'Вес (кг)',
          data: withWeight.map((m) => m.weight),
          borderColor: 'rgba(175, 82, 222, 1)',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: 'rgba(175, 82, 222, 1)',
          borderWidth: 2.5,
        },
      ],
    },
    options: chartOptions('кг'),
  });
  chartInstances.push(chart);
}

async function renderBodyChart(container) {
  const canvas = container.querySelector('#body-chart');
  if (!canvas) return;

  const measurements = await getAllMeasurements();
  const withBody = measurements.filter((m) => m.waist || m.hips);

  if (withBody.length < 2) {
    canvas.parentElement.innerHTML =
      '<div class="empty-state" style="padding:24px;"><div class="empty-state-text">Нужно минимум 2 замера тела</div></div>';
    return;
  }

  const chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: withBody.map((m) => formatDateHuman(m.date)),
      datasets: [
        {
          label: 'Талия (см)',
          data: withBody.map((m) => m.waist),
          borderColor: 'rgba(255, 59, 48, 0.9)',
          backgroundColor: 'rgba(255, 59, 48, 0.1)',
          tension: 0.4,
          pointRadius: 5,
          borderWidth: 2.5,
          fill: false,
        },
        {
          label: 'Бёдра (см)',
          data: withBody.map((m) => m.hips),
          borderColor: 'rgba(0, 199, 190, 0.9)',
          backgroundColor: 'rgba(0, 199, 190, 0.1)',
          tension: 0.4,
          pointRadius: 5,
          borderWidth: 2.5,
          fill: false,
        },
      ],
    },
    options: chartOptions('см'),
  });
  chartInstances.push(chart);
}

function chartOptions(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 13, family: 'var(--font-family)' },
        bodyFont: { size: 15, weight: '600', family: 'var(--font-family)' },
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: (ctx) => `${ctx.parsed.y} ${unit}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11, family: 'var(--font-family)' },
          color: '#8E8E93',
        },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(60, 60, 67, 0.06)' },
        ticks: {
          font: { size: 11, family: 'var(--font-family)' },
          color: '#8E8E93',
          callback: (v) => `${v}`,
        },
        border: { display: false },
      },
    },
    animation: {
      duration: 600,
      easing: 'easeOutQuart',
    },
  };
}

async function getDistanceData(period) {
  const todayStr = today();
  const weeklyGoal = (await getSetting('weeklyGoal')) || 0;

  if (period === 'week') {
    const weekStart = getWeekStart(todayStr);
    const days = getDaysOfWeek(weekStart);
    const entries = await getEntriesByDateRange(weekStart, getWeekEnd(todayStr));

    const data = days.map((d) =>
      Math.round(sumDistance(entries.filter((e) => e.date === d)) * 10) / 10
    );
    const dailyGoal = weeklyGoal ? Math.round((weeklyGoal / 7) * 10) / 10 : 0;

    return {
      labels: days.map(formatDateShort),
      data,
      goalLine: dailyGoal,
    };
  }

  const weeksCount = period === 'month' ? 4 : 13;
  const labels = [];
  const data = [];

  for (let i = weeksCount - 1; i >= 0; i--) {
    const startDate = getWeekStart(weeksAgo(i));
    const endDate = getWeekEnd(startDate);
    const entries = await getEntriesByDateRange(startDate, endDate);
    labels.push(formatDateHuman(startDate).replace(/ .*/, ''));
    data.push(Math.round(sumDistance(entries) * 10) / 10);
  }

  return { labels, data, goalLine: weeklyGoal };
}
