
const crypto = require('node:crypto');

function createPatientsService(db) {
  if (!db || !db.open) {
    throw new Error('Une base de données ouverte est obligatoire.');
  }

  function listPatients(medecinId) {
    if (typeof medecinId !== 'string' || !medecinId.trim()) {
      throw new Error('L’identifiant du médecin est obligatoire.');
    }

    return db.prepare(`
      SELECT
        id,
        medecin_id,
        numero_dossier,
        nom,
        prenom,
        date_naissance,
        sexe,
        telephone,
        adresse,
        date_creation,
        date_modification
      FROM patients
      WHERE medecin_id = ? AND archive = 0
      ORDER BY nom COLLATE NOCASE, prenom COLLATE NOCASE
    `).all(medecinId);
  }

  function findPossibleDuplicates(medecinId, patient) {
    const nom = patient.nom.trim();
    const prenom = patient.prenom.trim();
    const telephone = typeof patient.telephone === 'string'
      ? patient.telephone.trim()
      : '';

    if (!telephone) {
      return [];
    }

    return db.prepare(`
      SELECT
        id,
        numero_dossier,
        nom,
        prenom,
        date_naissance,
        telephone
      FROM patients
      WHERE medecin_id = ?
        AND archive = 0
        AND nom = ? COLLATE NOCASE
        AND prenom = ? COLLATE NOCASE
        AND telephone = ?
      ORDER BY date_creation DESC
    `).all(medecinId, nom, prenom, telephone);
  }

  function createPatient(patient) {
    const {
      medecinId,
      nom,
      prenom,
      dateNaissance = null,
      sexe = null,
      telephone = null,
      adresse = null,
      antecedents = null,
      allergies = null,
    } = patient || {};

    if (
      typeof medecinId !== 'string' || !medecinId.trim() ||
      typeof nom !== 'string' || !nom.trim() ||
      typeof prenom !== 'string' || !prenom.trim()
    ) {
      throw new Error('Le médecin, le nom et le prénom sont obligatoires.');
    }

    const cleanNom = nom.trim();
    const cleanPrenom = prenom.trim();
    const cleanTelephone = typeof telephone === 'string'
      ? telephone.trim() || null
      : null;

    const duplicates = findPossibleDuplicates(medecinId, {
      nom: cleanNom,
      prenom: cleanPrenom,
      telephone: cleanTelephone,
    });

    if (duplicates.length > 0) {
      return {
        duplicate: true,
        existingPatients: duplicates,
      };
    }

    const create = db.transaction(() => {
      const lastNumber = db.prepare(`
        SELECT numero_dossier
        FROM patients
        WHERE medecin_id = ?
          AND numero_dossier GLOB 'PAT-[0-9]*'
        ORDER BY CAST(SUBSTR(numero_dossier, 5) AS INTEGER) DESC
        LIMIT 1
      `).get(medecinId);

      const nextNumber = lastNumber
        ? Number(lastNumber.numero_dossier.slice(4)) + 1
        : 1;

      const numeroDossier = `PAT-${String(nextNumber).padStart(4, '0')}`;
      const id = crypto.randomUUID();

      db.prepare(`
        INSERT INTO patients (
          id,
          medecin_id,
          numero_dossier,
          nom,
          prenom,
          date_naissance,
          sexe,
          telephone,
          adresse,
          antecedents,
          allergies
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        medecinId,
        numeroDossier,
        cleanNom,
        cleanPrenom,
        dateNaissance || null,
        sexe || null,
        cleanTelephone,
        adresse || null,
        antecedents || null,
        allergies || null
      );

      return {
        duplicate: false,
        patient: {
          id,
          medecinId,
          numeroDossier,
          nom: cleanNom,
          prenom: cleanPrenom,
          dateNaissance: dateNaissance || null,
          sexe: sexe || null,
          telephone: cleanTelephone,
          adresse: adresse || null,
        },
      };
    });

    return create();
  }

  return {
    listPatients,
    findPossibleDuplicates,
    createPatient,
  };
}

module.exports = { createPatientsService };
