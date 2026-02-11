import { describe, expect, it } from 'vitest';
import { parseIbkrPaste } from './ibkrParser';

describe('parseIbkrPaste', () => {
  it('parses a long option trade with multiple exits', () => {
    const input = [
      "+\t16:36:13\tNVDA Feb13'26 190 PUT\tSLD\t10\t2.60\t7.02\t145.99",
      "+\t16:26:48\tNVDA Feb13'26 190 PUT\tSLD\t5\t3.15\t3.51\t348.00",
      "\t16:19:31\tNVDA Feb13'26 190 PUT\tSLD\t5\t2.79\t3.51\t168.00",
      "+\t16:18:51\tNVDA Feb13'26 190 PUT\tBOT\t20\t2.44\t13.97",
    ].join('\n');

    const parsed = parseIbkrPaste(input);

    expect(parsed.symbol).toBe("NVDA Feb13'26 190 PUT");
    expect(parsed.assetClass).toBe('option');
    expect(parsed.direction).toBe('long');
    expect(parsed.quantity).toBe(20);
    expect(parsed.entryPrice).toBe(2.44);
    expect(parsed.entryFees).toBe(13.97);
    expect(parsed.exits).toHaveLength(3);
    expect(parsed.exits[0]).toEqual({
      exit_time: '16:36',
      quantity: 10,
      price: 2.6,
      fees: 7.02,
    });
  });

  it('parses a short trade when first row is SLD', () => {
    const input = [
      '10:01:00 TSLA SLD 100 220.00 1.25',
      '10:15:00 TSLA BOT 40 215.00 0.75',
      '10:30:00 TSLA BOT 60 210.00 0.75',
    ].join('\n');

    const parsed = parseIbkrPaste(input);

    expect(parsed.direction).toBe('short');
    expect(parsed.quantity).toBe(100);
    expect(parsed.entryPrice).toBe(220);
    expect(parsed.entryFees).toBe(1.25);
    expect(parsed.exits).toHaveLength(2);
  });

  it('throws for mixed symbols', () => {
    const input = [
      '10:01:00 TSLA BOT 100 220.00 1.25',
      '10:15:00 AAPL SLD 100 221.00 0.75',
    ].join('\n');

    expect(() => parseIbkrPaste(input)).toThrow(/multiple symbols/i);
  });

  it('throws for unparseable lines', () => {
    expect(() => parseIbkrPaste('not a valid line')).toThrow(/could not parse/i);
  });
});
