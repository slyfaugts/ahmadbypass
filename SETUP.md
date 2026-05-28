# AhmadBypass v3 — Setup Guide

## Fitur Baru v3
- ✅ Login Discord OAuth
- ✅ Limit 5 upload/hari (free users)
- ✅ Unlimited untuk Premium & Admin
- ✅ Admin panel (upgrade/downgrade user)
- ✅ Simpan API Key (opsional)
- ✅ Custom Proxy URL
- ✅ Browser Notification saat upload selesai
- ✅ Auto-switch ke Batch jika drop 2+ file
- ✅ Search & filter history
- ✅ Export history CSV
- ✅ Link langsung ke asset Roblox
- ✅ Mobile-friendly (bottom nav, tap targets 44px)

---

## Step 1 — Firebase Setup

1. Buka https://console.firebase.google.com
2. Buat project baru
3. Pilih **Realtime Database** → Create database → Start in test mode
4. Salin URL database (contoh: `https://nama-project-default-rtdb.firebaseio.com`)
5. Settings → Service Accounts → **Database secrets** → Show → salin secret key

---

## Step 2 — Discord Developer App

1. Buka https://discord.com/developers/applications
2. New Application → beri nama "AhmadBypass"
3. Tab **OAuth2**:
   - Salin **Client ID** dan **Client Secret**
   - Tambah Redirect URI: `https://DOMAIN_KAMU.vercel.app/api/auth?action=discord`
4. Scopes yang diperlukan: `identify`, `email`

---

## Step 3 — Cari Discord User ID Kamu (untuk Admin Bypass)

1. Discord → Settings → Advanced → aktifkan **Developer Mode**
2. Klik kanan nama kamu sendiri → **Copy User ID**
3. Paste ke `ADMIN_DISCORD_IDS` di .env

---

## Step 4 — Deploy ke Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Saat ditanya environment variables, isi sesuai `.env.example`.

Atau via Vercel Dashboard:
- Settings → Environment Variables → tambah satu per satu

---

## Step 5 — Update DISCORD_CLIENT_ID di index.html

Cari baris ini di `index.html`:
```js
const DISCORD_CLIENT_ID = 'GANTI_DENGAN_CLIENT_ID_KAMU';
```
Ganti dengan Client ID Discord app kamu.

---

## Cara Upgrade User ke Premium (sebagai Admin)

1. Login dengan akun Discord kamu (yang terdaftar di ADMIN_DISCORD_IDS)
2. Tab **Settings** → scroll ke bawah → **ADMIN — USER MANAGEMENT**
3. Klik **LOAD USERS** → lihat semua user yang sudah login
4. Klik **⬆ PREMIUM** di sebelah nama user yang mau di-upgrade

---

## Cara User Minta Upgrade

1. User DM Discord admin dengan screenshot bukti transfer
2. Admin buka Settings → Admin Panel → upgrade user tersebut
3. User logout & login ulang → tier otomatis berubah ke Premium

