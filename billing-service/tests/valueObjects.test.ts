import { Month } from '../src/valueObjects';

describe('Month', () => {
    it('creates a valid Month instance from a valid date string', () => {
        const month = new Month('2023-03-15');
        expect(month.toString()).toBe('2023-03');
    });

    it('throws an error when an invalid date string is provided', () => {
        expect(() => new Month('invalid-date')).toThrow();
    });

    it('validates a correctly formatted month string', () => {
        expect(Month.validateMonth('2023-03')).toBe(true);
    });

    it('invalidates an incorrectly formatted month string', () => {
        expect(Month.validateMonth('2023-3')).toBe(false);
        expect(Month.validateMonth('03-2023')).toBe(false);
        expect(Month.validateMonth('2023/03')).toBe(false);
        expect(Month.validateMonth('')).toBe(false);
    });

    it('invalidates a month string with invalid values', () => {
        expect(Month.validateMonth('2023-13')).toBe(false);
        expect(Month.validateMonth('2023-00')).toBe(false);
        expect(Month.validateMonth('abcd-ef')).toBe(false);
    });
});
