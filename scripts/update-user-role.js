const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database.sqlite');

const email = 'admin@example.com';
const newRole = 'super_admin';

db.run(
  'UPDATE users SET role = ? WHERE email = ?',
  [newRole, email],
  function(err) {
    if (err) {
      console.error('Error updating user role:', err);
    } else {
      if (this.changes > 0) {
        console.log(`✅ 用户 ${email} 的角色已更新为 ${newRole}`);
      } else {
        console.log(`❌ 未找到用户 ${email}`);
      }
    }
    db.close();
  }
);