const db = require('../config/database');

const findAll = async () => {
  const result = await db.query('SELECT * FROM users');
  return result.rows;
};

const findById = async (id) => {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};

const create = async (userData) => {
  const { name, email } = userData;
  const result = await db.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    [name, email]
  );
  return result.rows[0];
};

module.exports = {
  findAll,
  findById,
  create
};
