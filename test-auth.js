
const Database = require('better-sqlite3');
const { createAuthService } = require('./src/auth/auth.service');

async function main() {
  const db = new Database(':memory:');

  try {
    db.exec(`
      CREATE TABLE medecins (
        id TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        mot_de_passe_hash TEXT NOT NULL,
        specialite TEXT,
        actif INTEGER NOT NULL DEFAULT 1,
        date_creation TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const auth = createAuthService(db);

    const doctor = await auth.registerDoctor({
      nom: 'Test',
      prenom: 'Medecin',
      email: 'test@example.com',
      password: 'TestMotDePasse2026',
      specialite: 'Médecine générale',
    });

    console.log('Inscription : OK');

    const connected = await auth.loginDoctor({
      email: 'TEST@example.com',
      password: 'TestMotDePasse2026',
    });

    console.log(
      'Connexion :',
      connected.id === doctor.id ? 'OK' : 'ÉCHEC'
    );

    try {
      await auth.registerDoctor({
        nom: 'Autre',
        prenom: 'Medecin',
        email: 'autre@example.com',
        password: 'AutreMotDePasse2026',
      });

      console.log('Blocage deuxième inscription : ÉCHEC');
    } catch (error) {
      console.log(
        'Blocage deuxième inscription :',
        error.message.includes('existe déjà') ? 'OK' : error.message
      );
    }
  } catch (error) {
    console.error('Erreur du test :', error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();

