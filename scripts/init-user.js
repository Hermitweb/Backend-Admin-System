const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const db = new sqlite3.Database('database.sqlite');

async function initUser() {
  const email = 'admin@example.com';
  const password = await bcrypt.hash('123456', 10);
  const name = 'Admin';
  const id = generateUUID();

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err) {
      console.error('Error checking user:', err);
      return;
    }

    if (row) {
      console.log('User already exists:', row.email);
      db.close();
      return;
    }

    db.run(
      'INSERT INTO users (id, email, password, name, avatar, status, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, email, password, name, null, 'active', 'super_admin', new Date().toISOString()],
      (err) => {
        if (err) {
          console.error('Error inserting user:', err);
        } else {
          console.log('User created successfully:', email);
        }
        db.close();
      }
    );
  });
}

initUser();