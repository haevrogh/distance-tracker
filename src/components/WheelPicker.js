/**
 * Apple-style Wheel Picker with Haptic Feedback
 * Mimics UIPickerView - scroll drums for selecting values
 */

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 7;

function haptic(style = 'light') {
  if (!navigator.vibrate) return;
  switch (style) {
    case 'light': navigator.vibrate(1); break;
    case 'medium': navigator.vibrate(3); break;
    case 'rigid': navigator.vibrate([1, 10, 1]); break;
  }
}

function createColumn(items, selectedIndex, onChange) {
  const col = document.createElement('div');
  col.className = 'wheel-column';

  const list = document.createElement('div');
  list.className = 'wheel-list';

  const padCount = Math.floor(VISIBLE_ITEMS / 2);
  const allItems = [
    ...Array(padCount).fill({ label: '', value: null }),
    ...items,
    ...Array(padCount).fill({ label: '', value: null }),
  ];

  allItems.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'wheel-item';
    el.textContent = item.label;
    list.appendChild(el);
  });

  col.appendChild(list);

  let currentIndex = selectedIndex;
  let startY = 0;
  let startOffset = 0;
  let offset = -selectedIndex * ITEM_HEIGHT;
  let velocity = 0;
  let lastY = 0;
  let lastTime = 0;
  let isDragging = false;

  function setOffset(o, animate = false) {
    offset = o;
    if (animate) {
      list.style.transition = 'transform 0.35s cubic-bezier(0.23, 1, 0.32, 1)';
    } else {
      list.style.transition = 'none';
    }
    list.style.transform = `translateY(${offset}px)`;
    updateHighlight();
  }

  function updateHighlight() {
    const allEls = list.children;
    const centerPos = -offset / ITEM_HEIGHT;
    for (let i = 0; i < allEls.length; i++) {
      const isPad = i < padCount || i >= allEls.length - padCount;
      if (isPad) {
        allEls[i].style.opacity = '0';
      } else {
        allEls[i].style.opacity = '';
        allEls[i].style.transform = '';
        const realIdx = i - padCount;
        const dist = Math.abs(realIdx - centerPos);
        allEls[i].style.fontWeight = dist < 0.5 ? '600' : '400';
      }
    }
  }

  function snapToNearest() {
    const maxOffset = 0;
    const minOffset = -(items.length - 1) * ITEM_HEIGHT;
    let snapped = Math.round(offset / ITEM_HEIGHT) * ITEM_HEIGHT;
    snapped = Math.min(maxOffset, Math.max(minOffset, snapped));
    setOffset(snapped, true);

    const newIndex = Math.round(-snapped / ITEM_HEIGHT);
    if (newIndex !== currentIndex) {
      currentIndex = newIndex;
      haptic('medium');
      onChange(currentIndex, items[currentIndex]);
    }
  }

  function handleStart(clientY) {
    isDragging = true;
    list.style.transition = 'none';
    startY = clientY;
    startOffset = offset;
    lastY = clientY;
    lastTime = Date.now();
    velocity = 0;
  }

  function handleMove(clientY) {
    if (!isDragging) return;
    const dy = clientY - startY;
    const newOffset = startOffset + dy;

    const maxOffset = 0;
    const minOffset = -(items.length - 1) * ITEM_HEIGHT;
    let bounded = newOffset;
    if (newOffset > maxOffset) {
      bounded = maxOffset + (newOffset - maxOffset) * 0.3;
    } else if (newOffset < minOffset) {
      bounded = minOffset + (newOffset - minOffset) * 0.3;
    }

    setOffset(bounded);

    const now = Date.now();
    const dt = now - lastTime;
    if (dt > 0) {
      velocity = (clientY - lastY) / dt;
    }
    lastY = clientY;
    lastTime = now;

    // Haptic on crossing item boundaries
    const currIdx = Math.round(-bounded / ITEM_HEIGHT);
    if (currIdx !== currentIndex && currIdx >= 0 && currIdx < items.length) {
      haptic('light');
      currentIndex = currIdx;
      onChange(currentIndex, items[currentIndex]);
    }
  }

  function handleEnd() {
    if (!isDragging) return;
    isDragging = false;

    if (Math.abs(velocity) > 0.3) {
      const momentum = velocity * 180;
      const target = offset + momentum;
      const maxOffset = 0;
      const minOffset = -(items.length - 1) * ITEM_HEIGHT;
      let snapped = Math.round(target / ITEM_HEIGHT) * ITEM_HEIGHT;
      snapped = Math.min(maxOffset, Math.max(minOffset, snapped));

      list.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
      offset = snapped;
      list.style.transform = `translateY(${offset}px)`;
      updateHighlight();

      const newIndex = Math.round(-snapped / ITEM_HEIGHT);
      if (newIndex !== currentIndex) {
        currentIndex = newIndex;
        haptic('medium');
        onChange(currentIndex, items[currentIndex]);
      }
      setTimeout(() => haptic('rigid'), 350);
    } else {
      snapToNearest();
    }
  }

  col.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleStart(e.touches[0].clientY);
  }, { passive: false });

  col.addEventListener('touchmove', (e) => {
    e.preventDefault();
    handleMove(e.touches[0].clientY);
  }, { passive: false });

  col.addEventListener('touchend', () => handleEnd());
  col.addEventListener('touchcancel', () => handleEnd());

  col.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handleStart(e.clientY);
    const onMouseMove = (ev) => handleMove(ev.clientY);
    const onMouseUp = () => {
      handleEnd();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  setOffset(-selectedIndex * ITEM_HEIGHT);
  updateHighlight();

  return col;
}

/**
 * Picker configuration presets
 */
const PICKER_CONFIGS = {
  weight: {
    title: 'Вес',
    unit: 'кг',
    intRange: [30, 200],
    decStep: 1, // 0.1 increments
    defaultValue: 70,
  },
  waist: {
    title: 'Талия',
    unit: 'см',
    intRange: [40, 180],
    decStep: 5, // 0.5 increments (0, 5)
    defaultValue: 70,
  },
  hips: {
    title: 'Бёдра',
    unit: 'см',
    intRange: [50, 180],
    decStep: 5, // 0.5 increments (0, 5)
    defaultValue: 90,
  },
  goal: {
    title: 'Недельная цель',
    unit: 'км',
    intRange: [1, 100],
    decStep: 5, // 0.5 increments (0, 5)
    defaultValue: 10,
  },
  distance: {
    title: 'Дистанция',
    unit: 'км',
    intRange: [0, 99],
    decStep: 1, // 0.1 increments
    defaultValue: 5,
  },
};

/**
 * Show a wheel picker
 * @param {string} type - 'weight' | 'waist' | 'hips' | 'goal'
 * @param {number} currentValue - Current value
 * @param {function} onConfirm - Callback with selected value
 */
export function showPicker(type, currentValue, onConfirm) {
  const config = PICKER_CONFIGS[type];
  if (!config) return;

  const value = currentValue || config.defaultValue;
  const intPart = Math.floor(value);
  const rawDec = Math.round((value % 1) * 10);

  // Generate integer items
  const intItems = [];
  for (let i = config.intRange[0]; i <= config.intRange[1]; i++) {
    intItems.push({ label: String(i), value: i });
  }

  // Generate decimal items
  const decItems = [];
  if (config.decStep === 1) {
    for (let i = 0; i <= 9; i++) {
      decItems.push({ label: String(i), value: i });
    }
  } else {
    // 0.5 step → only 0 and 5
    decItems.push({ label: '0', value: 0 });
    decItems.push({ label: '5', value: 5 });
  }

  let selectedInt = Math.max(config.intRange[0], Math.min(config.intRange[1], intPart));
  let selectedDec = rawDec;

  // Find closest decimal index
  let decIndex = 0;
  let minDist = Infinity;
  decItems.forEach((item, idx) => {
    const d = Math.abs(item.value - selectedDec);
    if (d < minDist) { minDist = d; decIndex = idx; }
  });
  selectedDec = decItems[decIndex].value;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'wheel-overlay';

  const sheet = document.createElement('div');
  sheet.className = 'wheel-sheet';

  // Header
  const header = document.createElement('div');
  header.className = 'wheel-header';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'wheel-header-btn';
  cancelBtn.textContent = 'Отмена';

  const title = document.createElement('div');
  title.className = 'wheel-title';
  title.textContent = config.title;

  const doneBtn = document.createElement('button');
  doneBtn.className = 'wheel-header-btn wheel-header-done';
  doneBtn.textContent = 'Готово';

  header.appendChild(cancelBtn);
  header.appendChild(title);
  header.appendChild(doneBtn);

  // Picker body
  const body = document.createElement('div');
  body.className = 'wheel-body';

  const intCol = createColumn(intItems, selectedInt - config.intRange[0], (idx, item) => {
    selectedInt = item.value;
  });

  const sep = document.createElement('div');
  sep.className = 'wheel-separator';
  sep.textContent = '.';

  const decCol = createColumn(decItems, decIndex, (idx, item) => {
    selectedDec = item.value;
  });

  const unitEl = document.createElement('div');
  unitEl.className = 'wheel-unit';
  unitEl.textContent = config.unit;

  body.appendChild(intCol);
  body.appendChild(sep);
  body.appendChild(decCol);
  body.appendChild(unitEl);

  // Selection highlight band
  const highlight = document.createElement('div');
  highlight.className = 'wheel-highlight';
  body.appendChild(highlight);

  sheet.appendChild(header);
  sheet.appendChild(body);
  overlay.appendChild(sheet);

  function close() {
    // Unlock viewport
    const savedScrollY = Math.abs(parseInt(document.body.style.top || '0', 10));
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';
    window.scrollTo(0, savedScrollY);

    overlay.classList.add('wheel-closing');
    sheet.classList.add('wheel-sheet-closing');
    setTimeout(() => overlay.remove(), 300);
  }

  cancelBtn.addEventListener('click', () => {
    haptic('light');
    close();
  });

  doneBtn.addEventListener('click', () => {
    haptic('medium');
    const finalValue = selectedInt + selectedDec / 10;
    onConfirm(finalValue);
    close();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      haptic('light');
      close();
    }
  });

  document.body.appendChild(overlay);

  // Lock viewport
  const scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(() => overlay.classList.add('wheel-visible'));
}
