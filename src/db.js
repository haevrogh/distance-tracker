import Dexie from 'dexie';

export const db = new Dexie('DistanceTracker');

db.version(1).stores({
  entries: '++id, date, createdAt',
  measurements: '++id, date',
  settings: 'key',
});

// --- Entries ---

export async function addEntry(entry) {
  const now = Date.now();
  return db.entries.add({
    date: entry.date,
    distance: entry.distance,
    calories: entry.calories || 0,
    note: entry.note || '',
    createdAt: now,
  });
}

export async function updateEntry(id, changes) {
  return db.entries.update(id, changes);
}

export async function deleteEntry(id) {
  return db.entries.delete(id);
}

export async function getEntryById(id) {
  return db.entries.get(id);
}

export async function getEntriesByDateRange(startDate, endDate) {
  return db.entries
    .where('date')
    .between(startDate, endDate, true, true)
    .sortBy('createdAt');
}

export async function getEntriesByDate(date) {
  return db.entries.where('date').equals(date).sortBy('createdAt');
}

export async function getAllEntries() {
  return db.entries.orderBy('date').reverse().toArray();
}

// --- Measurements ---

export async function addMeasurement(m) {
  return db.measurements.add({
    date: m.date,
    weight: m.weight ?? null,
    waist: m.waist ?? null,
    hips: m.hips ?? null,
  });
}

export async function getAllMeasurements() {
  return db.measurements.orderBy('date').toArray();
}

export async function getLatestMeasurement() {
  return db.measurements.orderBy('date').last();
}

// --- Settings ---

export async function getSetting(key) {
  const row = await db.settings.get(key);
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  return db.settings.put({ key, value });
}
