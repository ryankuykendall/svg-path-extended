// Thumbnail Web Worker
// Receives an ImageBitmap and produces PNG Blobs at multiple sizes via OffscreenCanvas

self.onmessage = async (e) => {
  const { bitmap, sizes } = e.data; // sizes = [1024, 512, 256]

  try {
    const results = {};

    for (const size of sizes) {
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');

      // White background (so transparent SVG areas aren't black)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Draw bitmap scaled to fit
      ctx.drawImage(bitmap, 0, 0, size, size);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      results[size] = blob;
    }

    bitmap.close();
    self.postMessage({ success: true, results });
  } catch (err) {
    bitmap.close();
    self.postMessage({ success: false, error: err.message });
  }
};
