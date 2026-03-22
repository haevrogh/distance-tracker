import { db } from '../db.js';

export async function exportAllData() {
  const data = {
    version: 1,
    exportDate: new Date().toISOString(),
    entries: await db.entries.toArray(),
    measurements: await db.measurements.toArray(),
    settings: await db.settings.toArray(),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `distance-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.entries) {
          throw new Error('Неверный формат файла');
        }

        await db.transaction(
          'rw',
          db.entries,
          db.measurements,
          db.settings,
          async () => {
            await db.entries.clear();
            if (data.entries.length) {
              await db.entries.bulkAdd(
                data.entries.map(({ id, ...rest }) => rest)
              );
            }
            await db.measurements.clear();
            if (data.measurements?.length) {
              await db.measurements.bulkAdd(
                data.measurements.map(({ id, ...rest }) => rest)
              );
            }
            await db.settings.clear();
            if (data.settings?.length) {
              await db.settings.bulkPut(data.settings);
            }
          }
        );

        resolve(data.entries.length);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}
