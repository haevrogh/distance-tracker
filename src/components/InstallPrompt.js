let deferredPrompt = null;

export function init() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showBanner('android');
  });

  // Check if iOS Safari and not standalone
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone =
    window.navigator.standalone ||
    window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS && !isStandalone) {
    const dismissed = localStorage.getItem('install-dismissed');
    if (!dismissed) {
      setTimeout(() => showBanner('ios'), 2000);
    }
  }
}

function showBanner(platform) {
  if (document.querySelector('.install-banner')) return;

  const el = document.createElement('div');
  el.className = 'install-banner';

  if (platform === 'ios') {
    el.innerHTML = `
      <div class="install-banner-content">
        <div class="install-banner-icon">📲</div>
        <div class="install-banner-text">
          <div class="install-banner-title">Установите приложение</div>
          <div class="install-banner-desc">Нажмите <strong>Поделиться</strong> → <strong>На экран «Домой»</strong></div>
        </div>
        <button class="install-banner-close" aria-label="Закрыть">✕</button>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div class="install-banner-content">
        <div class="install-banner-icon">📲</div>
        <div class="install-banner-text">
          <div class="install-banner-title">Установите приложение</div>
          <div class="install-banner-desc">Быстрый доступ с главного экрана</div>
        </div>
        <button class="install-banner-action btn btn-sm btn-primary">Установить</button>
        <button class="install-banner-close" aria-label="Закрыть">✕</button>
      </div>
    `;
  }

  document.body.appendChild(el);

  el.querySelector('.install-banner-close').addEventListener('click', () => {
    localStorage.setItem('install-dismissed', '1');
    el.style.transition = 'transform 0.3s, opacity 0.3s';
    el.style.transform = 'translateY(100%)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  });

  const installBtn = el.querySelector('.install-banner-action');
  if (installBtn && deferredPrompt) {
    installBtn.addEventListener('click', async () => {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        el.remove();
      }
      deferredPrompt = null;
    });
  }
}

// Styles
const style = document.createElement('style');
style.textContent = `
  .install-banner {
    position: fixed;
    bottom: calc(var(--tab-bar-height) + var(--safe-bottom) + 8px);
    left: 12px;
    right: 12px;
    z-index: 200;
    animation: slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .install-banner-content {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--color-card);
    border-radius: var(--radius-lg);
    padding: 14px 16px;
    box-shadow: var(--shadow-lg);
  }

  .install-banner-icon {
    font-size: 28px;
    flex-shrink: 0;
  }

  .install-banner-text {
    flex: 1;
    min-width: 0;
  }

  .install-banner-title {
    font-size: 15px;
    font-weight: 600;
  }

  .install-banner-desc {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin-top: 2px;
  }

  .install-banner-close {
    font-size: 16px;
    color: var(--color-text-tertiary);
    padding: 8px;
    flex-shrink: 0;
  }
`;
document.head.appendChild(style);
