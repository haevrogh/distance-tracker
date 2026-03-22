export function showCheckAnimation() {
  const el = document.createElement('div');
  el.className = 'check-animation';
  el.innerHTML = `
    <div class="check-circle">
      <svg viewBox="0 0 24 24">
        <path d="M5 13l4 4L19 7"/>
      </svg>
    </div>
  `;
  document.body.appendChild(el);

  if (navigator.vibrate) navigator.vibrate(50);

  setTimeout(() => {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 800);
}

export function showDailyGoalBadge() {
  const el = document.createElement('div');
  el.className = 'daily-goal-badge';
  el.innerHTML = `
    <div class="daily-goal-badge-inner">
      Дневная цель достигнута!
    </div>
  `;
  document.body.appendChild(el);

  if (navigator.vibrate) navigator.vibrate(200);

  launchConfetti(30, 1500);

  setTimeout(() => {
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 500);
  }, 2000);
}

export function showWeeklyCelebration(distance, isOverAchieved, percent) {
  const el = document.createElement('div');
  el.className = 'celebration-overlay';
  el.innerHTML = `
    <div class="celebration-content">
      <div class="celebration-icon">${isOverAchieved ? '🏆' : '🎉'}</div>
      <div class="celebration-title">${isOverAchieved ? 'Перевыполнено!' : 'Неделя выполнена!'}</div>
      <div class="celebration-value">${distance.toFixed(1)} км</div>
      <div class="celebration-subtitle">${isOverAchieved ? `${percent}% от цели` : 'Отличная работа!'}</div>
    </div>
  `;

  el.addEventListener('click', () => dismiss());
  document.body.appendChild(el);

  if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

  launchConfetti(50, 3000);

  function dismiss() {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }

  setTimeout(dismiss, 3500);
}

function launchConfetti(count = 50, duration = 2000) {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const colors = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FFD700'];

  const particles = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 100,
    w: 6 + Math.random() * 6,
    h: 4 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    opacity: 1,
  }));

  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fadeStart = duration * 0.7;
    for (const p of particles) {
      p.x += p.vx;
      p.vy += 0.1;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      if (elapsed > fadeStart) {
        p.opacity = 1 - (elapsed - fadeStart) / (duration - fadeStart);
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
