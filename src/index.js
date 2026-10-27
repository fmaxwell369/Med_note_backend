
const { connectDatabase } = require('./database/connection');
const { createPatientsService } = require('./patients/patients.service');
const { createAuthService } = require('./auth/auth.service');

function createBackend({ databasePath }) {
  const db = connectDatabase(databasePath);

  try {
    const auth = createAuthService(db);
    const patients = createPatientsService(db);

    return {
      db,
      auth,
      patients,

      close() {
        if (db.open) {
          db.close();
        }
      },
    };
  } catch (error) {
    if (db.open) {
      db.close();
    }

    throw error;
  }
}

module.exports = { createBackend };
