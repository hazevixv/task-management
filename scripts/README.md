# 📜 SCRIPTS DOCUMENTATION

## 🎯 MIGRATION SCRIPTS

### ✅ YANG HARUS DIPAKAI:

#### `migrate-all.js` - **SCRIPT UTAMA**
**Fungsi:** Setup database lengkap (23 tabel + data default)

**Cara pakai:**
```bash
node scripts/migrate-all.js
```

**Apa yang dilakukan:**
1. ✅ Buat tabel users, sessions, projects, tasks
2. ✅ Buat tabel chat (conversations, messages, members)
3. ✅ Buat tabel AI agents + seed 4 agents
4. ✅ Buat tabel organizational units
5. ✅ Buat tabel workflow templates
6. ✅ Insert default users (admin, taufik, iman)
7. ✅ Reset semua password jadi `raytask123`

**Output:**
```
✅ Successful: 4/4
✅ Total: 23 tables
🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!
```

---

## 🔍 UTILITY SCRIPTS

### `verify-all-tables.js`
**Fungsi:** Cek semua tabel yang ada di database

**Cara pakai:**
```bash
node scripts/verify-all-tables.js
```

**Output:**
```
📊 ALL TABLES IN DATABASE:
 1. users (3 rows)
 2. projects (0 rows)
 ...
✅ TOTAL: 23 tables
```

---

### `check-specific-tables.js`
**Fungsi:** Cek tabel tertentu ada atau tidak

**Cara pakai:**
```bash
node scripts/check-specific-tables.js
```

---

### `reset-passwords.js`
**Fungsi:** Reset semua password user jadi `raytask123`

**Cara pakai:**
```bash
node scripts/reset-passwords.js
```

---

## 🗑️ SCRIPTS YANG SUDAH TIDAK DIPAKAI

Semua script di bawah ini sudah digabung ke `migrate-all.js`:

- ❌ `migrate.js` - Sudah include di migrate-all
- ❌ `migrate-auth.js` - Sudah include di migrate-all
- ❌ `setup-chat-system.js` - Sudah include di migrate-all
- ❌ `run-final-migration.js` - Tidak diperlukan lagi
- ❌ `create-one-by-one.js` - Tidak diperlukan lagi
- ❌ `create-missing-tables.js` - Tidak diperlukan lagi

**Jangan jalankan script-script di atas!** Pakai `migrate-all.js` saja.

---

## 📝 CARA BUAT MIGRATION BARU

### Jika ada perubahan schema di masa depan:

**Step 1: Buat file baru**
```bash
scripts/migrate-add-new-feature.js
```

**Step 2: Template:**
```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('🚀 Running migration...\n');
    
    // Your migration here
    await connection.query(`
      CREATE TABLE IF NOT EXISTS new_table (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `);
    
    console.log('✅ Migration completed!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
```

**Step 3: Test di local**
```bash
node scripts/migrate-add-new-feature.js
```

**Step 4: Run di production**
```bash
# Same command!
node scripts/migrate-add-new-feature.js
```

---

## 🎯 BEST PRACTICES

1. ✅ Selalu pakai `CREATE TABLE IF NOT EXISTS`
2. ✅ Selalu pakai `ALTER TABLE ADD COLUMN IF NOT EXISTS`
3. ✅ Test di local dulu sebelum production
4. ✅ Backup database sebelum migration besar
5. ✅ Gunakan transactions untuk multiple queries
6. ❌ Jangan pakai `DROP TABLE` di production
7. ❌ Jangan pakai `TRUNCATE` di production

---

## 📞 TROUBLESHOOTING

### Error: "Table already exists"
**Solusi:** Pakai `CREATE TABLE IF NOT EXISTS`

### Error: "Connection refused"
**Solusi:** Cek `.env` credentials

### Error: "Foreign key constraint fails"
**Solusi:** Buat parent table dulu sebelum child table

---

**🎉 Happy migrating!**
