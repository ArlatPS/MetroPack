import { parseDate, getNextNight } from '../../src/helpers/dateHelpers';

describe('parseDate', () => {
    it('parses a valid date string correctly', () => {
        const result = parseDate('24-03-2025');
        expect(result).toEqual(new Date(2025, 2, 24));
    });

    it('returns an invalid date for an incorrect format', () => {
        const result = parseDate('2025-03-24');
        expect(result.toString()).toBe('Invalid Date');
    });
});

describe('getNextNight', () => {
    it('returns the same date in correct format if current time is before 20:00', () => {
        const mockDate = new Date(2023, 7, 15, 19, 59); // 15th Aug 2023, 19:59
        jest.useFakeTimers().setSystemTime(mockDate);

        const result = getNextNight();
        expect(result).toBe('15-08-2023');

        jest.useRealTimers();
    });

    it('returns the next date in correct format if current time is after 20:00', () => {
        const mockDate = new Date(2023, 7, 15, 20, 1); // 15th Aug 2023, 20:01
        jest.useFakeTimers().setSystemTime(mockDate);

        const result = getNextNight();
        expect(result).toBe('16-08-2023');

        jest.useRealTimers();
    });

    it('returns the next date in correct format for edge case of exactly 20:00', () => {
        const mockDate = new Date(2023, 7, 15, 20, 0); // 15th Aug 2023, 20:00
        jest.useFakeTimers().setSystemTime(mockDate);

        const result = getNextNight();
        expect(result).toBe('16-08-2023');

        jest.useRealTimers();
    });
});
