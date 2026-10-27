
const argon2 = require('argon2');
const crypto = require('node:crypto');

function createAuthService(db) {
  if (!db || !db.open) {
    throw new Error('Une base de données ouverte est obligatoire.');
  }

  async function registerDoctor({
    nom,
    prenom,
    email,
    password,
    specialite = null,
  }) {
    nom = typeof nom === 'string' ? nom.trim() : '';
    prenom = typeof prenom === 'string' ? prenom.trim() : '';
    email = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!nom || !prenom || !email) {
      throw new Error('Le nom, le prénom et l’email sont obligatoires.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Adresse e-mail invalide.');
    }

    if (typeof password !== 'string' || password.length < 12) {
      throw new Error('Le mot de passe doit contenir au moins 12 caractères.');
    }

    const passwordHash = await argon2.hash(password);
    const id = crypto.randomUUID();

    const createFirstDoctor = db.transaction(() => {
      const total = db.prepare(
        'SELECT COUNT(*) AS total FROM medecins'
      ).get().total;

      if (total !== 0) {
        throw new Error(
          'Le compte initial existe déjà. Connectez-vous.'
        );
      }

      db.prepare(`
        INSERT INTO medecins (
          id, nom, prenom, email, mot_de_passe_hash, specialite
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        nom,
        prenom,
        email,
        passwordHash,
        typeof specialite === 'string' ? specialite.trim() || null : null
      );
    });

    createFirstDoctor();

    return { id, nom, prenom, email };
  }

  async function loginDoctor({ email, password }) {
    email = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!email || typeof password !== 'string' || !password) {
      throw new Error('L’email et le mot de passe sont obligatoires.');
    }

    const doctor = db.prepare(`
      SELECT id, nom, prenom, email, mot_de_passe_hash, specialite
      FROM medecins
      WHERE email = ? AND actif = 1
    `).get(email);

    if (
      !doctor ||
      !(await argon2.verify(doctor.mot_de_passe_hash, password))
    ) {
      throw new Error('E-mail ou mot de passe incorrect.');
    }

    return {
      id: doctor.id,
      nom: doctor.nom,
      prenom: doctor.prenom,
      email: doctor.email,
      specialite: doctor.specialite,
    };
  }

  return { registerDoctor, loginDoctor };
}

module.exports = { createAuthService };
