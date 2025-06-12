const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🗑️ Очищення БД...');
    
    // Вимикаємо перевірку зовнішніх ключів
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // Дропаємо всі таблиці
    const tables = ['reviews', 'bids', 'projects', 'users'];
    for (const table of tables) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS \`${table}\``);
        console.log(`✅ Таблиця ${table} видалена`);
      } catch (error) {
        console.log(`⚠️ Таблиця ${table} не існувала`);
      }
    }
    
    // Вмикаємо перевірку зовнішніх ключів
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ БД очищена успішно!');

  } catch (error) {
    console.error('❌ Помилка:', error);
  } finally {
    await connection.end();
  }
}

resetDatabase();