import { analyse, SR, type Analysis } from "./analysis";

/** Decode a recorded or uploaded audio blob and run the prosody analysis. Browser only. */
export async function analyseBlob(blob: Blob): Promise<Analysis> {
  const ab = await blob.arrayBuffer();
  const dec = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(ab);
  const N = Math.ceil(dec.duration * SR);

  const r1 = new OfflineAudioContext(1, N, SR);
  const s1 = r1.createBufferSource();
  s1.buffer = dec;
  s1.connect(r1.destination);
  s1.start();
  const x = (await r1.startRendering()).getChannelData(0);

  const r2 = new OfflineAudioContext(1, N, SR);
  const s2 = r2.createBufferSource();
  const bp = r2.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1000;
  bp.Q.value = 0.6;
  s2.buffer = dec;
  s2.connect(bp);
  bp.connect(r2.destination);
  s2.start();
  const y = (await r2.startRendering()).getChannelData(0);

  return analyse(x, y, dec.duration);
}
