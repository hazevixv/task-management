# ⚡ DEPLOY INYOURTASK - 100% GRATIS!

## 🎯 DATABASE: AIVEN (100% GRATIS PERMANENT!)

### ✅ KENAPA AIVEN?
- ✅ **GRATIS PERMANENT** - 1GB storage, tidak perlu kartu kredit
- ✅ MySQL (kode langsung jalan, tidak perlu ubah apa-apa)
- ✅ **TIDAK ADA JEDA** (always-on, bukan serverless)
- ✅ Setup 5 menit
- ✅ **BENAR-BENAR $0/BULAN SELAMANYA**

### ❌ KENAPA BUKAN YANG LAIN?
- ❌ **Railway**: Butuh kartu kredit (meski ada $5 credit)
- ❌ **PlanetScale**: $47/bulan (MAHAL!)
- ❌ **Cloudflare D1**: SQLite, harus rewrite semua query
- ❌ **Neon DB**: PostgreSQL + ada cold start lag

---

## 📋 LANGKAH DEPLOY (10 MENIT)

### 1️⃣ Setup Aiven MySQL (3 menit)
```bash
1. Daftar: https://aiven.io (TIDAK PERLU KARTU KREDIT!)
2. Klik "Create service"
3. Pilih "MySQL"
4. Plan: "Free" (1GB)
5. Region: Singapore
6. Klik "Create service" → Tunggu 2 menit
7. Copy connection details:
   - Host: mysql-xxx.aivencloud.com
   - Port: 12345
   - User: avnadmin
   - Password: xxx
   - Database: defaultdb
```

### 2️⃣ Run Migration (2 menit)
```bash
# Update .env
DB_HOST=mysql-xxx.aivencloud.com
DB_USER=avnadmin
DB_PASSWORD=xxx
DB_NAME=defaultdb
DB_PORT=12345

# Run migration
node scripts/migrate-all.js
```

### 3️⃣ Push ke GitHub (2 menit)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/inyourtask.git
git push -u origin main
```

### 4️⃣ Deploy Vercel (3 menit)
```bash
1. https://vercel.com → Sign up dengan GitHub
2. "Add New" → "Project" → Import repo
3. Add env variables (copy dari .env)
4. Deploy!
```

---

## 🔄 UPDATE CODE

```bash
git add .
git commit -m "Update"
git push origin main
# Vercel auto-deploy dalam 2 menit! ✅
```

## 💰 BIAYA: $0/BULAN!

| Service | Cost |
|---------|------|
| Aiven MySQL | **$0** |
| Vercel | **$0** |
| GitHub | **$0** |
| Domain | $12/year (sudah beli) |
| Gemini API | $0-2/month |

**Total: GRATIS!** 🎉
