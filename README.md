# Live Map - Jalan Santai Dies Natalis ke-64 Universitas Udayana

Proyek ini adalah aplikasi web satu halaman (Single Page Application) berbasis peta interaktif yang digunakan untuk melacak rute dan progress peserta secara *real-time* (Live Map) pada acara Jalan Santai.

Aplikasi ini menggunakan GPS pada perangkat pengguna (HP) untuk menampilkan posisi mereka di atas rute yang telah ditentukan, memberikan informasi mengenai checkpoint terdekat, serta memperkirakan jarak tempuh.

## 🌟 Fitur Utama

- **Peta Rute Interaktif**: Menampilkan garis rute jalan santai dan titik-titik lokasi checkpoint secara jelas menggunakan Leaflet.js.
- **Pelacakan GPS (Live Tracking)**: Pengguna dapat menyalakan pelacakan lokasi untuk melihat ikon diri mereka bergerak di sepanjang rute.
- **Indikator Kemajuan (Progress Bar)**: Sistem akan otomatis menghitung posisi pengguna di jalur rute dan menampilkan seberapa jauh persentase perjalanan mereka.
- **Deteksi Keluar Jalur (Off-Route Detection)**: Aplikasi akan mendeteksi dan memberi tahu jika pengguna melenceng jauh dari jalur yang telah ditetapkan.
- **Fitur Berbagi (Share & QR Code)**: Peserta dapat dengan mudah membagikan rute ini ke teman-temannya melalui tautan (copy link) atau menampilkan QR Code langsung dari layar aplikasi. QR Code juga dapat diunduh (download).
- **Responsive & Mobile-Friendly**: Tampilan (UI) dirancang khusus agar menyerupai aplikasi *native* pada perangkat seluler (Bottom Sheet, Floating Action Buttons), termasuk dukungan untuk mode *landscape* di layar kecil.

## 📂 Struktur File

Proyek ini sangat ringan dan tidak memerlukan instalasi *backend* khusus. Cukup dengan 2 file utama:

1. **`jalan-santai-live-map.html`**: Ini adalah file utama yang berisi semua kode antarmuka (HTML), gaya desain (CSS), dan logika pemrograman (JavaScript). File ini yang dibuka oleh browser.
2. **`route.json`**: File data yang berisi daftar titik koordinat yang membentuk jalur rute, serta lokasi-lokasi checkpoint. **Catatan:** File ini sengaja di-*ignore* oleh Git (`.gitignore`). Anda harus membuat file ini secara manual sebelum menjalankan proyek (lihat formatnya di bawah).

## 🚀 Cara Penggunaan (Bagi Pengembang/Panitia)

Karena aplikasi ini melakukan *fetch* (pengambilan data) ke file `route.json`, Anda **tidak bisa** sekadar mengklik ganda file HTML untuk membukanya (karena browser akan memblokirnya dengan alasan keamanan CORS `file://`).

Anda harus menjalankannya melalui **Local Web Server**. 

### Langkah-langkah menjalankan di komputer lokal:

**Opsi 1: Menggunakan VS Code (Disarankan)**
1. Buka folder proyek ini (`Dies`) di aplikasi Visual Studio Code.
2. Install ekstensi **"Live Server"** buatan Ritwick Dey.
3. Klik kanan pada file `jalan-santai-live-map.html` lalu pilih **"Open with Live Server"**.
4. Halaman akan terbuka secara otomatis di browser Anda (biasanya di `http://127.0.0.1:5500/...`).

**Opsi 2: Menggunakan Python**
Jika Anda sudah menginstal Python, buka Terminal (atau Command Prompt) di dalam folder proyek ini, lalu jalankan:
```bash
# Untuk Python 3:
python -m http.server 8000
```
Kemudian buka browser dan akses: `http://localhost:8000/jalan-santai-live-map.html`

### Cara Menggunakan Aplikasi (Bagi Pengguna/Peserta)
1. Buka tautan/link aplikasi melalui peramban (browser) di Smartphone Anda (contoh: Safari atau Chrome).
2. Tekan tombol **"Lacak Lokasi"**.
3. Browser akan meminta izin akses Lokasi (GPS). Pilih **"Allow" / "Izinkan"**.
4. Peta akan otomatis fokus ke lokasi Anda saat ini, dan progress Anda akan mulai dihitung jika Anda berjalan di atas garis rute.

## 🛠 Cara Membuat/Memodifikasi Rute (`route.json`)

Karena `route.json` diabaikan oleh Git (tidak ikut di-*push*), Anda harus membuat file bernama `route.json` di dalam folder utama proyek sebelum menjalankannya.

Format isi `route.json` yang harus Anda buat:
```json
{
  "checkpoints": [
    { "name": "Start/Finish Lap. Rektorat", "lat": -8.797285, "lng": 115.176466, "flag": true },
    { "name": "Simpang FISIP", "lat": -8.798485, "lng": 115.173872, "flag": false },
    ...
  ],
  "path": [
    { "lat": -8.797285, "lng": 115.176466 },
    { "lat": -8.797258, "lng": 115.176413 },
    ...
  ]
}
```

*   **`checkpoints`**: Array yang berisi titik-titik perhentian.
    *   `name`: Nama lokasi yang akan tampil di aplikasi.
    *   `lat` & `lng`: Koordinat lokasi.
    *   `flag`: Jika bernilai `true`, pin di peta akan berupa bendera (cocok untuk Start/Finish). Jika `false`, pin berupa angka urutan.
*   **`path`**: Array yang berisi ratusan/ribuan titik koordinat berurutan yang akan dihubungkan dengan garis membentuk rute jalan yang harus dilewati.

## 🧰 Teknologi yang Digunakan
- **HTML5 & Vanilla CSS**: Untuk struktur dan tata letak *responsive*.
- **Vanilla JavaScript (ES6)**: Untuk logika deteksi lokasi (Geolocation API), kalkulasi jarak (Rumus Haversine), dan *event listener*.
- **[Leaflet.js](https://leafletjs.com/)**: Library peta *open-source* yang sangat ringan.
- **[QRCode.js](https://davidshimjs.github.io/qrcodejs/)**: Untuk *generate* gambar QR code secara dinamis.
- **OpenStreetMap**: Sebagai penyedia sumber gambar peta utama (Gratis).

---
*Dibuat untuk memeriahkan Dies Natalis Universitas Udayana.*
