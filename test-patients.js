
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { createPatientsService } = require('./src/patients/patients.service');

const db = new Database(':memory:');

try {
  db.exec(`
    CREATE TABLE medecins (
      id TEXT PRIMARY KEY
    );

    CREATE TABLE patients (
      id TEXT PRIMARY KEY,
      medecin_id TEXT NOT NULL,
      numero_dossier TEXT NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      date_naissance TEXT,
      sexe TEXT,
      telephone TEXT,
      adresse TEXT,
      antecedents TEXT,
      allergies TEXT,
      date_creation TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      date_modification TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archive INTEGER NOT NULL DEFAULT 0 CHECK (archive IN (0, 1)),
      UNIQUE (medecin_id, numero_dossier),
      FOREIGN KEY (medecin_id) REFERENCES medecins(id)
    );
  `);

  db.prepare('INSERT INTO medecins (id) VALUES (?)').run('medecin-test');

  const service = createPatientsService(db);

  const premier = service.createPatient({
    medecinId: 'medecin-test',
    nom: 'Dupont',
    prenom: 'Jean',
    telephone: '690000000',
  });

  assert.equal(premier.duplicate, false);
  assert.equal(premier.patient.numeroDossier, 'PAT-0001');
  console.log('Création du patient : OK');

  const doublon = service.createPatient({
    medecinId: 'medecin-test',
    nom: 'Dupont',
    prenom: 'Jean',
    telephone: '690000000',
  });

  assert.equal(doublon.duplicate, true);
  console.log('Détection des doublons : OK');

  const patients = service.listPatients('medecin-test');
  assert.equal(patients.length, 1);
  console.log('Liste des patients : OK');

  const second = service.createPatient({
    medecinId: 'medecin-test',
    nom: 'Martin',
    prenom: 'Paul',
    telephone: '691111111',
  });

  assert.equal(second.patient.numeroDossier, 'PAT-0002');
  console.log('Numérotation automatique : OK');
} finally {
  db.close();
}

