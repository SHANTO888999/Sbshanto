const MAX_IMAGE_DATA_URL_LENGTH = 280_000;
const MAX_VIDEO_DATA_URL_LENGTH = 760_000;
const MAX_VIDEO_DIRECT_BYTES = 540 * 1024;
const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
]);

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read selected file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function loadImageFromFile(file: File): Promise<{ img: HTMLImageElement; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, cleanup: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Selected file is not a valid image.'));
    };
    img.src = url;
  });
}

export async function processProjectPhotoFile(
  file: File,
  options?: { maxDataUrlLength?: number; hardCapLength?: number }
): Promise<{ dataUrl: string; sizeKB: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPG, PNG, or WebP).');
  }

  const maxTargetLength = options?.maxDataUrlLength ?? MAX_IMAGE_DATA_URL_LENGTH;
  const hardCapLength = options?.hardCapLength ?? MAX_VIDEO_DATA_URL_LENGTH;

  const { img, cleanup } = await loadImageFromFile(file);
  try {
    const srcW = img.naturalWidth || 1280;
    const srcH = img.naturalHeight || 720;
    const widths = [1200, 960, 720, 540];
    const qualities = [0.84, 0.72, 0.58, 0.45];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas is unavailable for image optimization.');
    }

    let bestResult = '';

    for (const maxW of widths) {
      const scale = Math.min(1, maxW / srcW);
      const targetW = Math.max(1, Math.round(srcW * scale));
      const targetH = Math.max(1, Math.round(srcH * scale));
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      for (const mime of ['image/webp', 'image/jpeg'] as const) {
        for (const q of qualities) {
          const dataUrl = canvas.toDataURL(mime, q);
          if (mime === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
            break;
          }
          bestResult = dataUrl;
          if (dataUrl.length <= maxTargetLength) {
            return {
              dataUrl,
              sizeKB: Math.max(1, Math.round((dataUrl.length * 0.75) / 1024)),
            };
          }
        }
      }
    }

    if (bestResult && bestResult.length <= hardCapLength) {
      return {
        dataUrl: bestResult,
        sizeKB: Math.max(1, Math.round((bestResult.length * 0.75) / 1024)),
      };
    }

    throw new Error('Photo is too large even after compression. Try a smaller image or paste a URL.');
  } finally {
    cleanup();
  }
}

function loadVideoMetadata(
  file: File
): Promise<{ video: HTMLVideoElement; duration: number; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');

    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Timed out reading video metadata.'));
    }, 10000);

    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      resolve({ video, duration, cleanup: () => URL.revokeObjectURL(url) });
    };

    video.onerror = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error('Selected video format cannot be decoded on this browser.'));
    };

    video.src = url;
  });
}

function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp8',
    'video/webm;codecs=vp9',
    'video/webm',
    'video/mp4',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

async function transcodeShortClip(
  video: HTMLVideoElement,
  maxSeconds: number,
  targetBitsPerSecond: number,
  onProgress?: (label: string) => void
): Promise<Blob> {
  const srcW = video.videoWidth || 640;
  const srcH = video.videoHeight || 360;
  const scale = Math.min(1, 640 / srcW);
  const targetW = Math.max(2, Math.floor((srcW * scale) / 2) * 2);
  const targetH = Math.max(2, Math.floor((srcH * scale) / 2) * 2);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.captureStream !== 'function') {
    throw new Error('Browser video optimizer is unavailable. Choose a clip under 500 KB or paste an MP4 URL.');
  }

  const mimeType = pickRecorderMimeType();
  const stream = canvas.captureStream(20);
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: targetBitsPerSecond })
    : new MediaRecorder(stream, { videoBitsPerSecond: targetBitsPerSecond });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) chunks.push(ev.data);
  };

  const clipSeconds = Math.max(1, Math.min(maxSeconds, video.duration || maxSeconds));

  return new Promise<Blob>((resolve, reject) => {
    let rafId = 0;
    let stopped = false;

    const finish = () => {
      if (stopped) return;
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      try {
        video.pause();
      } catch {
        // ignore
      }
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    };

    recorder.onstop = () => {
      const normalizedMime = mimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
      resolve(new Blob(chunks, { type: normalizedMime }));
    };

    recorder.onerror = () => {
      if (rafId) cancelAnimationFrame(rafId);
      reject(new Error('Could not optimize video clip on this device.'));
    };

    const startDrawLoop = () => {
      const startedAt = performance.now();
      const renderFrame = () => {
        if (stopped) return;
        ctx.drawImage(video, 0, 0, targetW, targetH);
        const elapsed = (performance.now() - startedAt) / 1000;
        const pct = Math.min(99, Math.round((elapsed / clipSeconds) * 100));
        onProgress?.(`Optimizing short clip (${pct}%)...`);

        if (elapsed >= clipSeconds || video.ended) {
          finish();
          return;
        }
        rafId = requestAnimationFrame(renderFrame);
      };
      rafId = requestAnimationFrame(renderFrame);
    };

    video.currentTime = 0;
    recorder.start(250);
    video
      .play()
      .then(() => {
        startDrawLoop();
        window.setTimeout(finish, (clipSeconds + 0.35) * 1000);
      })
      .catch(() => {
        finish();
        reject(new Error('Browser blocked video processing. Try a shorter clip under 500 KB or paste a URL.'));
      });
  });
}

export async function processProjectVideoFile(
  file: File,
  onProgress?: (label: string) => void
): Promise<{ dataUrl: string; sizeKB: number; trimmedSeconds: number }> {
  if (!file.type.startsWith('video/')) {
    throw new Error('Please choose a valid video file (MP4 or WebM).');
  }

  onProgress?.('Reading video clip...');
  const { video, duration, cleanup } = await loadVideoMetadata(file);

  try {
    const cleanMime = file.type.toLowerCase();
    if (file.size <= MAX_VIDEO_DIRECT_BYTES && ALLOWED_VIDEO_MIMES.has(cleanMime)) {
      const directDataUrl = await readFileAsDataUrl(file);
      if (directDataUrl.length <= MAX_VIDEO_DATA_URL_LENGTH) {
        return {
          dataUrl: directDataUrl,
          sizeKB: Math.max(1, Math.round(file.size / 1024)),
          trimmedSeconds: Math.round(duration || 5),
        };
      }
    }

    onProgress?.('Trimming & compressing to 6s preview loop...');
    const clipDuration = Math.min(duration || 6, 6);
    const compressedBlob = await transcodeShortClip(video, clipDuration, 380_000, onProgress);
    let dataUrl = await readFileAsDataUrl(compressedBlob);

    if (dataUrl.length > MAX_VIDEO_DATA_URL_LENGTH) {
      onProgress?.('Applying extra compression...');
      const smallerBlob = await transcodeShortClip(video, Math.min(clipDuration, 4), 220_000, onProgress);
      dataUrl = await readFileAsDataUrl(smallerBlob);
    }

    if (dataUrl.length > MAX_VIDEO_DATA_URL_LENGTH) {
      throw new Error(
        'Video clip is still too large for direct cloud save (limit ~550 KB). Use a 3–5 sec clip or paste an https:// MP4 link.'
      );
    }

    return {
      dataUrl,
      sizeKB: Math.max(1, Math.round((dataUrl.length * 0.75) / 1024)),
      trimmedSeconds: Math.round(clipDuration),
    };
  } finally {
    cleanup();
  }
}
