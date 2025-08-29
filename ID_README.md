# 🤖 Wulang AI - Bot AI WhatsApp Canggih

Bot AI WhatsApp yang canggih dibangun dengan TypeScript, Node.js, dan prinsip Clean Architecture. Ditenagai oleh GPT-4o-mini, bot ini dapat memproses pesan teks, menganalisis PDF, dan menginterpretasi gambar sambil mempertahankan konteks percakapan yang cerdas.

## ✨ Fitur Utama

### 🧠 **Manajemen Percakapan Cerdas**
- **Respons Berbasis Konteks**: Mempertahankan riwayat percakapan dengan sliding window (10 pesan terakhir)
- **Deteksi Trigger Pintar**: Merespons kata kunci "wulang" untuk interaksi yang natural
- **Threading Percakapan**: Mengorganisir pesan ke dalam thread percakapan untuk konteks yang lebih baik
- **Pencegahan Duplikasi**: Mencegah pemrosesan pesan yang sama dua kali untuk menghemat konteks AI

### 📱 **Kemampuan Pemrosesan Media**
- **Analisis PDF**: Mengekstrak dan menganalisis konten teks dari dokumen PDF
- **Pengenalan Gambar**: Menganalisis gambar dan memberikan deskripsi detail
- **Penyimpanan Media**: Menyimpan file media dengan ringkasan yang dibuat AI
- **Konteks Multi-Modal**: Menggabungkan teks dan media untuk respons yang komprehensif

### 🏗️ **Arsitektur yang Kuat**
- **Clean Architecture**: Pemisahan tanggung jawab dengan lapisan Domain, Application, Infrastructure, dan Presentation
- **Dependency Injection**: Container layanan modular untuk pengujian dan pemeliharaan yang mudah
- **TypeScript**: Keamanan tipe penuh dan fitur JavaScript modern
- **Prisma ORM**: Operasi database yang aman tipe dengan PostgreSQL

### 🔧 **Siap Produksi**
- **Logging Komprehensif**: Logging berbasis Winston dengan berbagai level
- **Penanganan Error**: Penanganan error yang graceful dengan pesan yang ramah pengguna
- **Pemeliharaan Otomatis**: Pembersihan terjadwal untuk percakapan dan file lama
- **Shutdown Graceful**: Penanganan sinyal proses yang tepat

## 📋 Prasyarat

- **Node.js** 18+ 
- **PostgreSQL** 12+ database
- **OpenAI API** key (akses GPT-4o-mini)
- **WhatsApp** akun untuk autentikasi bot
- **Git** untuk kontrol versi

## 🚀 Mulai Cepat

### 1. **Clone dan Setup**
```bash
git clone https://github.com/bayy420-999/wulang-ai-remake.git
cd wulang-ai-remake
npm install
```

### 2. **Konfigurasi Environment**
Buat file `.env`:
```env
# Konfigurasi Database
DATABASE_URL="postgresql://username:password@localhost:5432/wulang_ai_db"

# Konfigurasi OpenAI
OPENAI_API_KEY="your_openai_api_key_here"
OPENAI_MODEL="gpt-4o-mini"
TEMPERATURE="0.7"

# Konfigurasi Bot
BOT_NAME="Wulang AI"
RESET_KEYWORD="!reset"
MAX_CONTEXT_MESSAGES="10"
SESSION_NAME="wulang-ai-session"

# Logging
LOG_LEVEL="info"
```

### 3. **Setup Database**
```bash
# Generate Prisma client
npm run db:generate

# Push schema ke database
npm run db:push
```

### 4. **Mulai Bot**
```bash
# Mode development
npm run dev

# Mode production
npm run build
npm start
```

## 💬 Cara Penggunaan

### **Interaksi Dasar**
1. **Mulai Percakapan**: Kirim pesan apa saja yang mengandung "wulang"
2. **Lanjutkan Chat**: Bot mengingat konteks percakapan Anda
3. **Reset Chat**: Kirim "!reset" untuk memulai ulang

### **Dukungan Media**
- **Kirim Gambar**: Upload gambar untuk analisis AI
- **Kirim PDF**: Upload PDF untuk ekstraksi teks dan analisis
- **Ajukan Pertanyaan**: Ajukan pertanyaan spesifik tentang media Anda

### **Contoh Percakapan**
```
Anda: "wulang, berapa 1 + 1?"
Bot: "1 + 1 sama dengan 2. Ada yang ingin kamu tanyakan lagi?"

Anda: "lalu successor dari hasil penjumlahan tadi?"
Bot: "Succesor dari 2 adalah 3. Jadi, jika ada hal lain yang ingin kamu ketahui, silakan tanya!"
```

## 🏗️ Ikhtisar Arsitektur

### **Lapisan Clean Architecture**

```
┌─────────────────────────────────────┐
│           Presentation              │
│  ┌─────────────────────────────┐   │
│  │     WhatsAppBot             │   │ ← Integrasi WhatsApp
│  │     MessageHandler          │   │ ← Pemrosesan pesan
│  │     MaintenanceService      │   │ ← Tugas terjadwal
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│           Application              │
│  ┌─────────────────────────────┐   │
│  │  ProcessMessageUseCase      │   │ ← Logika bisnis
│  │  ResetConversationUseCase   │   │ ← Manajemen percakapan
│  │  ConversationManager        │   │ ← Manajemen state
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│             Domain                 │
│  ┌─────────────────────────────┐   │
│  │  User, Message,             │   │ ← Entitas inti
│  │  Conversation, Media        │   │ ← Aturan bisnis
│  │  Interfaces & Errors        │   │ ← Kontrak
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│         Infrastructure             │
│  ┌─────────────────────────────┐   │
│  │  Prisma Repositories        │   │ ← Akses data
│  │  OpenAIService              │   │ ← API eksternal
│  │  MediaProcessingService     │   │ ← Pemrosesan file
│  │  WhatsAppClient             │   │ ← API WhatsApp
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### **Struktur Proyek**
```
src/
├── application/           # Lapisan aplikasi
│   ├── dto/              # Data Transfer Objects
│   ├── services/         # Layanan aplikasi
│   └── use-cases/        # Logika bisnis
├── config/               # Konfigurasi
│   └── env.ts           # Variabel environment
├── domain/               # Lapisan domain
│   ├── entities/         # Entitas inti
│   ├── errors/           # Error domain
│   └── interfaces/       # Kontrak
├── infrastructure/       # Lapisan infrastruktur
│   ├── cache/           # Layanan caching
│   ├── database/        # Repository database
│   └── external/        # Layanan eksternal
├── lib/                  # Utilitas bersama
│   ├── db.ts            # Koneksi database
│   └── logger.ts        # Setup logging
├── presentation/         # Lapisan presentasi
│   ├── handlers/        # Handler pesan
│   └── services/        # Layanan presentasi
├── shared/              # Konfigurasi bersama
│   └── config/          # Container DI
└── index.ts             # Entry point aplikasi
```

## 🗄️ Skema Database

### **Entitas Inti**

#### **User**
```sql
- id: String (CUID, Primary Key)
- phoneNumber: String (Unique)
- name: String? (Optional)
- createdAt: DateTime
```

#### **Conversation**
```sql
- id: String (CUID, Primary Key)
- userId: String (Foreign Key)
- createdAt: DateTime
- updatedAt: DateTime
```

#### **Message**
```sql
- id: String (CUID, Primary Key)
- role: Enum (USER, ASSISTANT, SYSTEM)
- content: String? (Optional)
- mediaId: String? (Foreign Key)
- conversationId: String (Foreign Key)
- createdAt: DateTime
```

#### **Media**
```sql
- id: String (CUID, Primary Key)
- url: String
- type: String
- summary: String? (Dibuat AI)
- userId: String (Foreign Key)
- createdAt: DateTime
```

## 🔧 Opsi Konfigurasi

| Variabel | Deskripsi | Default | Wajib |
|----------|-----------|---------|-------|
| `DATABASE_URL` | String koneksi PostgreSQL | - | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | - | ✅ |
| `OPENAI_MODEL` | Model AI yang digunakan | `gpt-4o-mini` | ❌ |
| `TEMPERATURE` | Kreativitas respons AI (0-2) | `0.7` | ❌ |
| `BOT_NAME` | Nama tampilan bot | `Wulang AI` | ❌ |
| `RESET_KEYWORD` | Perintah reset percakapan | `!reset` | ❌ |
| `MAX_CONTEXT_MESSAGES` | Ukuran window konteks | `10` | ❌ |
| `SESSION_NAME` | ID sesi WhatsApp | `wulang-ai-session` | ❌ |
| `LOG_LEVEL` | Level logging | `info` | ❌ |

## 🛠️ Perintah Development

```bash
# Development
npm run dev              # Mulai dalam mode development
npm run build           # Build untuk production
npm start               # Mulai server production

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema ke database
npm run db:migrate      # Buat dan jalankan migrasi
npm run db:studio       # Buka Prisma Studio

# Pemeliharaan
npm run maintenance     # Jalankan pemeliharaan manual
```

## 🐛 Troubleshooting

### **Masalah Umum**

#### **1. Koneksi Database Gagal**
```bash
Error: Failed to connect to database
```
**Solusi:**
- Verifikasi `DATABASE_URL` di `.env`
- Pastikan PostgreSQL berjalan
- Periksa konektivitas jaringan

#### **2. Error OpenAI API**
```bash
Error: OpenAI API key invalid
```
**Solusi:**
- Verifikasi `OPENAI_API_KEY` di `.env`
- Periksa izin API key
- Pastikan kredit mencukupi

#### **3. Autentikasi WhatsApp Gagal**
```bash
Error: WhatsApp QR code expired
```
**Solusi:**
- Hapus folder `.wwebjs_auth`
- Restart bot
- Scan QR code lagi

#### **4. Masalah Konteks**
```bash
Problem: Pesan duplikat dalam konteks
```
**Solusi:**
- Periksa apakah pencegahan duplikasi bekerja
- Verifikasi tracking ID pesan
- Restart aplikasi

### **Mode Debug**
```bash
# Set log level ke debug
LOG_LEVEL=debug npm run dev
```

## 📊 Optimasi Performa

### **Manajemen Konteks**
- **Sliding Window**: Hanya menyimpan 10 pesan terakhir dalam konteks
- **Pencegahan Duplikasi**: Menghindari pemrosesan pesan yang sama dua kali
- **Manajemen Memori**: Membersihkan ID pesan lama

### **Optimasi Database**
- **Query Terindeks**: Dioptimalkan untuk pencarian percakapan
- **Connection Pooling**: Koneksi database yang efisien
- **Cascading Deletes**: Pembersihan data terkait yang tepat

### **Pemrosesan Media**
- **Penyimpanan Sementara**: File disimpan sementara dan dibersihkan
- **Batas Ukuran**: Batas ukuran file 10MB
- **Dukungan Format**: PDF dan format gambar umum

## 🔒 Pertimbangan Keamanan

- **Variabel Environment**: Data sensitif disimpan di `.env`
- **Validasi Input**: Semua input divalidasi dan disanitasi
- **Penanganan Error**: Tidak ada data sensitif dalam pesan error
- **Moderasi Konten**: Filtering konten tidak pantas dasar

## 📈 Monitoring & Logging

### **Level Log**
- `error`: Error dan kegagalan kritis
- `warn`: Pesan peringatan
- `info`: Informasi umum
- `debug`: Informasi debugging detail

### **File Log**
- **Development**: Output konsol saja
- **Production**: Logging berbasis file dengan rotasi

### **Metrik Utama**
- Waktu pemrosesan pesan
- Waktu generasi respons AI
- Performa query database
- Tingkat dan jenis error

## 🤝 Kontribusi

1. **Fork** repository
2. **Buat** branch fitur (`git checkout -b feature/fitur-keren`)
3. **Commit** perubahan Anda (`git commit -m 'Tambah fitur keren'`)
4. **Push** ke branch (`git push origin feature/fitur-keren`)
5. **Buka** Pull Request

### **Panduan Development**
- Ikuti praktik terbaik TypeScript
- Pertahankan prinsip clean architecture
- Tambahkan penanganan error komprehensif
- Sertakan logging yang tepat
- Tulis pesan commit yang jelas

## 📄 Lisensi

Proyek ini dilisensikan di bawah MIT License - lihat file [LICENSE](LICENSE) untuk detail.

## 🆘 Dukungan

### **Mendapatkan Bantuan**
1. Periksa bagian [troubleshooting](#troubleshooting)
2. Tinjau log untuk pesan error
3. Verifikasi konfigurasi Anda
4. Buka issue di GitHub

### **Sumber Daya Berguna**
- [Dokumentasi Prisma](https://www.prisma.io/docs)
- [Dokumentasi WhatsApp Web.js](https://docs.wwebjs.dev/)
- [Dokumentasi OpenAI API](https://platform.openai.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🚀 Deployment

### **Checklist Produksi**
- [ ] Setup database PostgreSQL
- [ ] Konfigurasi variabel environment
- [ ] Setup logging dan monitoring
- [ ] Konfigurasi strategi backup
- [ ] Setup sertifikat SSL/TLS
- [ ] Konfigurasi process manager (PM2)
- [ ] Setup reverse proxy (Nginx)

### **Deployment Docker**
```dockerfile
# Contoh Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

**Dibuat dengan ❤️ menggunakan TypeScript, Node.js, dan prinsip Clean Architecture**
