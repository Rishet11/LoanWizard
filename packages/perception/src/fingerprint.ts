async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function canvasHash(): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'no-canvas';

  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, 200, 40);
  ctx.font = '14px Arial';
  ctx.fillStyle = '#000080';
  ctx.fillText('loan-wizard', 10, 25);
  ctx.fillStyle = 'rgba(255,0,0,0.5)';
  ctx.fillRect(50, 5, 30, 10);

  return sha256(canvas.toDataURL());
}

export async function buildFingerprint() {
  return {
    ua: navigator.userAgent,
    screen: {
      w: window.screen.width,
      h: window.screen.height,
      dpr: window.devicePixelRatio ?? 1,
    },
    canvas_hash: await canvasHash(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang: navigator.language,
  };
}
