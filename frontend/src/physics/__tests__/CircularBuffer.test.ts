import { CircularBuffer } from '../utils/CircularBuffer';

describe('CircularBuffer', () => {
  let buffer: CircularBuffer<number>;
  const capacity = 3;

  beforeEach(() => {
    buffer = new CircularBuffer<number>(capacity);
  });

  test('maintains fixed size', () => {
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    
    expect(buffer.getSize()).toBe(capacity);
    expect(buffer.getAll()).toEqual([2, 3, 4]);
  });

  test('retrieves elements in order', () => {
    buffer.push(1);
    buffer.push(2);
    
    expect(buffer.get(0)).toBe(1);
    expect(buffer.get(1)).toBe(2);
  });

  test('handles empty buffer', () => {
    expect(buffer.isEmpty()).toBe(true);
    expect(buffer.get(0)).toBeUndefined();
  });

  test('clears buffer', () => {
    buffer.push(1);
    buffer.push(2);
    buffer.clear();
    
    expect(buffer.isEmpty()).toBe(true);
    expect(buffer.getSize()).toBe(0);
  });

  test('wraps around correctly', () => {
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    buffer.push(5);
    
    expect(buffer.getAll()).toEqual([3, 4, 5]);
  });
});