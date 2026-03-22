import { navigate, getCurrentPath } from '../router.js';

const tabs = [
  {
    path: '/',
    label: 'Главная',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
  {
    path: '/history',
    label: 'История',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  },
  {
    path: '/add',
    label: 'Добавить',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    isCenter: true,
  },
  {
    path: '/charts',
    label: 'Графики',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  },
  {
    path: '/settings',
    label: 'Настройки',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  },
];

export function render() {
  const current = getCurrentPath();
  return `
    <nav class="tab-bar">
      ${tabs
        .map(
          (tab) => `
        <button class="tab-bar-item ${current === tab.path ? 'active' : ''} ${tab.isCenter ? 'tab-center' : ''}"
                data-path="${tab.path}">
          <span class="tab-bar-icon">${tab.icon}</span>
          <span class="tab-bar-label">${tab.label}</span>
        </button>
      `
        )
        .join('')}
    </nav>
  `;
}

export function mount(container) {
  const nav = container.querySelector('.tab-bar');
  if (!nav) return;

  function handleClick(e) {
    const btn = e.target.closest('.tab-bar-item');
    if (!btn) return;
    const path = btn.dataset.path;
    navigate(path);
    // Update active state immediately
    nav.querySelectorAll('.tab-bar-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.path === path);
    });
  }

  nav.addEventListener('click', handleClick);
  return () => nav.removeEventListener('click', handleClick);
}

// Tab bar styles
const style = document.createElement('style');
style.textContent = `
  .tab-bar {
    display: flex;
    align-items: flex-end;
    justify-content: space-around;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 0.5px solid var(--color-separator);
    padding-bottom: var(--safe-bottom);
    height: var(--tab-bar-height);
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
  }

  .tab-bar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px 0 2px;
    flex: 1;
    color: var(--color-text-tertiary);
    transition: color 0.2s;
    gap: 2px;
    min-height: 49px;
  }

  .tab-bar-item.active {
    color: var(--color-primary);
  }

  .tab-bar-item.tab-center {
    color: var(--color-primary);
  }

  .tab-bar-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tab-bar-icon svg {
    width: 24px;
    height: 24px;
  }

  .tab-center .tab-bar-icon {
    width: 44px;
    height: 44px;
    background: var(--color-primary);
    border-radius: 50%;
    color: white;
    margin-top: -14px;
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.35);
  }

  .tab-center .tab-bar-icon svg {
    width: 22px;
    height: 22px;
  }

  .tab-bar-label {
    font-size: 10px;
    font-weight: 500;
  }

  .tab-center .tab-bar-label {
    color: var(--color-primary);
  }
`;
document.head.appendChild(style);
