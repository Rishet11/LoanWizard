import { PerceptionEngine } from '../src/engine';
import type { PerceptionEvent } from '@loan-wizard/contracts';

const videoEl = document.getElementById('video') as HTMLVideoElement;
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const logEl = document.getElementById('log') as HTMLDivElement;

let engine: PerceptionEngine | null = null;

function log(event: PerceptionEvent): void {
  const entry = document.createElement('div');
  const isError = event.type === 'error';
  entry.innerHTML = `<span class="event-type ${isError ? 'error' : ''}">[${event.type}]</span> ${JSON.stringify(event.payload)}`;
  logEl.prepend(entry);
}

function setStatus(s: string): void {
  statusEl.textContent = `Status: ${s}`;
}

startBtn.addEventListener('click', async () => {
  if (engine) return;
  logEl.innerHTML = '';
  setStatus('starting…');

  engine = new PerceptionEngine({
    sessionId: `demo-${Date.now()}`,
    onEvent: (e) => {
      log(e);
      if (e.type === 'permission_granted') setStatus('running');
      if (e.type === 'session_ended') { setStatus('ended'); engine = null; }
      if (e.type === 'error') { setStatus(`error: ${e.payload.message}`); engine = null; }
    },
  });

  engine.attachVideo(videoEl);
  await engine.start();
});

stopBtn.addEventListener('click', () => {
  engine?.stop();
  engine = null;
  setStatus('stopped');
});
