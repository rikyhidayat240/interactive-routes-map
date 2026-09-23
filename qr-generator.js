/**
 * QRGenerator - Plug & Play QR Code with Logo Overlay
 * Dependency: qrcode.js via CDN
 *
 * Usage:
 *   const qr = new QRGenerator({ containerId, text, logoUrl, colorDark, downloadFilename });
 *   qr.render();
 *   qr.download();
 */
class QRGenerator {
  constructor(options = {}) {
    this.containerId      = options.containerId      || 'qrcode';
    this.text             = options.text             || window.location.href;
    this.logoUrl          = options.logoUrl          || '';
    this.colorDark        = options.colorDark        || '#114084';
    this.colorLight       = options.colorLight       || '#ffffff';
    this.qrSize           = options.qrSize           || 512;
    this.displaySize      = options.displaySize      || 168;
    this.logoBgSize       = options.logoBgSize       || 220;
    this.downloadFilename = options.downloadFilename || 'qr-code.png';
    this._canvas          = null; // cache referensi canvas
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.warn(`[QRGenerator] Container #${this.containerId} tidak ditemukan.`);
      return;
    }
    container.innerHTML = '';
    this._canvas = null;

    new QRCode(container, {
      text:         this.text,
      width:        this.qrSize,
      height:       this.qrSize,
      colorDark:    this.colorDark,
      colorLight:   this.colorLight,
      correctLevel: QRCode.CorrectLevel.H
    });

    // Gunakan MutationObserver agar tidak bergantung pada timeout tetap
    const observer = new MutationObserver(() => {
      const canvas = container.querySelector('canvas');
      if (!canvas) return;
      observer.disconnect();
      this._canvas = canvas;
      canvas.style.width  = `${this.displaySize}px`;
      canvas.style.height = `${this.displaySize}px`;
      if (this.logoUrl) {
        this._overlayLogo(container, canvas);
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    // Fallback: jika qrcode.js sudah render synchronously sebelum observer aktif
    const existingCanvas = container.querySelector('canvas');
    if (existingCanvas) {
      observer.disconnect();
      this._canvas = existingCanvas;
      existingCanvas.style.width  = `${this.displaySize}px`;
      existingCanvas.style.height = `${this.displaySize}px`;
      if (this.logoUrl) {
        this._overlayLogo(container, existingCanvas);
      }
    }
  }

  _overlayLogo(container, canvas) {
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = this.logoUrl;

    img.onload = () => {
      const cx = this.qrSize / 2;
      const cy = this.qrSize / 2;
      const r  = this.logoBgSize / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = this.colorLight;
      ctx.fill();

      const offset = (this.qrSize - this.logoBgSize) / 2;
      ctx.drawImage(img, offset, offset, this.logoBgSize, this.logoBgSize);

      this._syncImg(container, canvas);
    };

    img.onerror = () => {
      // Logo gagal → tetap tampilkan QR tanpa logo
      console.warn(`[QRGenerator] Logo gagal dimuat dari: ${this.logoUrl}. QR tetap ditampilkan.`);
      this._syncImg(container, canvas);
    };
  }

  // Update img element qrcode.js agar sinkron dengan canvas (termasuk logo overlay)
  _syncImg(container, canvas) {
    const qrImg = container.querySelector('img');
    if (qrImg) {
      qrImg.src          = canvas.toDataURL('image/png');
      qrImg.style.width  = `${this.displaySize}px`;
      qrImg.style.height = `${this.displaySize}px`;
    }
  }

  download(filename) {
    const fname     = filename || this.downloadFilename;
    const container = document.getElementById(this.containerId);
    const canvas    = this._canvas || (container ? container.querySelector('canvas') : null);
    const qrImg     = container ? container.querySelector('img') : null;

    if (!canvas && !qrImg) {
      console.warn('[QRGenerator] QR belum siap. Pastikan render() sudah dipanggil.');
      return false;
    }

    const link    = document.createElement('a');
    link.download = fname;
    // Prioritaskan canvas (sudah ada overlay logo); fallback ke img src
    link.href     = canvas ? canvas.toDataURL('image/png') : qrImg.src;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
}
