
const Database = require('better-sqlite3');

function connectDatabase(databasePath) {
  if (typeof databasePath !== 'string' || !databasePath.trim()) {
    throw new Error('Le chemin de la base de données est obligatoire.');
  }

  const db = new Database(databasePath);

  try {
    const integrity = db.pragma('quick_check', { simple: true });

    if (integrity !== 'ok') {
      throw new Error(`Vérification SQLite échouée : ${integrity}`);
    }

    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

module.exports = { connectDatabase };
