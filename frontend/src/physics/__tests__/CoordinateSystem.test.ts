import { CoordinateSystem } from '../core/CoordinateSystem';

describe('CoordinateSystem', () => {
  let coordSystem: CoordinateSystem;

  beforeEach(() => {
    coordSystem = new CoordinateSystem(
      { width: 800, height: 600 },
      { 
        type: 'periodic',
        xMin: 0,
        xMax: 100,
        yMin: 0,
        yMax: 100
      },
      '2D'
    );
  });

  test('should convert between physics and canvas coordinates', () => {
    const physicsPos = { x: 50, y: 50 };
    const canvasPos = coordSystem.toCanvas(physicsPos);
    expect(canvasPos.x).toBeCloseTo(400);
    expect(canvasPos.y).toBeCloseTo(300);
    
    const convertedBack = coordSystem.toPhysics(canvasPos);
    expect(convertedBack.x).toBeCloseTo(physicsPos.x);
    expect(convertedBack.y).toBeCloseTo(physicsPos.y);
  });

  test('should convert between Vector and Velocity types', () => {
    const vector = { x: 1, y: 2 };
    const velocity = coordSystem.toVelocity(vector);
    expect(velocity.vx).toBe(1);
    expect(velocity.vy).toBe(2);
    
    const convertedBack = coordSystem.toVector(velocity);
    expect(convertedBack.x).toBe(1);
    expect(convertedBack.y).toBe(2);
  });

  // Add more tests for boundary conditions, dimension handling, etc.
});
