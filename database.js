const Database = require("better-sqlite3");

/* 
  Inicializa o banco de dados.
  A coluna 'username' foi definida como única
  para evitar duplicação de nomes de usuários,
  consequentemente evitando requisições http
  duplicadas. 
*/
function initializeDB() {
  const db = new Database("social.db");
  db.prepare(
    ` CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT,
      username TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
      `
  ).run();

  return db;
}

module.exports = { initializeDB };
