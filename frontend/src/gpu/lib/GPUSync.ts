import { hexToHsl } from './ColorUtils';

export function syncParticlesToContainer(
  tsContainer: any,
  data: Float32Array,
  collisionTimes: Float32Array | null,
  particleCount: number,
  canvasMapper: ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined,
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
  simulationTime: number,
  showCollisions: boolean
): void {
  if (!tsContainer || typeof tsContainer !== 'object') return;
  const particlesContainer: any = (tsContainer as any).particles;
  if (!particlesContainer) return;

  const tsCount: number = Number(
    particlesContainer?.count ?? (particlesContainer?._array?.length ?? 0)
  );
  if (!Number.isFinite(tsCount) || tsCount <= 0) return;

  const syncCount = Math.min(tsCount, particleCount);

  const allowFlashes = showCollisions === true;
  const maxFlashes = Math.max(50, Math.floor(syncCount * 0.05));
  let flashesThisFrame = 0;

  for (let i = 0; i < syncCount; i++) {
    const tsParticle = particlesContainer.get ? particlesContainer.get(i) : particlesContainer?._array?.[i];
    if (!tsParticle) continue;

    // Physics positions from GPU textures
    const px = data[i * 2];
    const py = data[i * 2 + 1];

    // Skip dead particles for absorbing BC: they are marked just outside bounds
    if ((px < bounds.xMin - 0.5) || (px > bounds.xMax + 0.5) || (py < bounds.yMin - 0.5) || (py > bounds.yMax + 0.5)) {
      if (tsParticle.position) {
        tsParticle.position.x = -1e9;
        tsParticle.position.y = -1e9;
      }
      continue;
    }

    if (canvasMapper) {
      const mapped = canvasMapper({ x: px, y: py });
      const w = tsContainer?.canvas?.size?.width ?? undefined;
      const h = tsContainer?.canvas?.size?.height ?? undefined;
      const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
      if (tsParticle.position) {
        tsParticle.position.x = (w && Number.isFinite(mapped.x)) ? clamp(mapped.x, 0, w) : mapped.x ?? 0;
        tsParticle.position.y = (h && Number.isFinite(mapped.y)) ? clamp(mapped.y, 0, h) : mapped.y ?? 0;
      }
    } else if (tsParticle.position) {
      tsParticle.position.x = px;
      tsParticle.position.y = py;
    }

    if (allowFlashes && collisionTimes && tsParticle.color) {
      const lastCollisionTime = collisionTimes[i] || 0;
      const timeSinceCollision = simulationTime - lastCollisionTime;

      if (timeSinceCollision < 0.5 && lastCollisionTime > 0 && flashesThisFrame < maxFlashes) { // Flash for 500ms
        const redColor = hexToHsl('#ff4444');
        tsParticle.color.h.value = redColor.h;
        tsParticle.color.s.value = redColor.s;
        tsParticle.color.l.value = redColor.l;
        flashesThisFrame++;
      } else {
        const blueColor = hexToHsl('#3b82f6');
        tsParticle.color.h.value = blueColor.h;
        tsParticle.color.s.value = blueColor.s;
        tsParticle.color.l.value = blueColor.l;
      }
    }
  }
}
