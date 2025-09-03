import { TextObservableParser } from '../observables/TextObservableParser';

describe('TextObservableParser', () => {
  test('parses simple observable definition', () => {
    const text = `
      observable "count-left" {
        source: particles
        filter: position.x < bounds.width/2
        reduce: count
      }
    `;
    
    const result = TextObservableParser.parse(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'count-left',
      source: 'particles',
      filter: 'position.x < bounds.width/2',
      reduce: 'count'
    });
  });

  test('parses multiple observables', () => {
    const text = `
      observable "temp" {
        source: particles
        select: velocity.magnitude
        reduce: avg
      }
      
      observable "density" {
        source: simulation
        reduce: count
      }
    `;
    
    const result = TextObservableParser.parse(text);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('temp');
    expect(result[1].name).toBe('density');
  });

  test('handles intervals', () => {
    const text = `
      observable "slow-stats" {
        interval: 5000
        reduce: count
      }
    `;
    
    const result = TextObservableParser.parse(text);
    expect(result[0].interval).toBe(5000);
  });
});
