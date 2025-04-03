import { getNextWorkingDays, parseDate } from '../../src/helpers/dateHelpers';
import { format } from 'date-fns';

describe('getNextWorkingDays', () => {
    beforeAll(() => {
        jest.useFakeTimers();
    });

    it('returns the next working days for a given number of days', () => {
        const result = getNextWorkingDays(5);
        expect(result.length).toBe(5);
        result.forEach((date) => {
            const parsedDate = parseDate(date);
            expect(parsedDate.getDay()).not.toBe(0); // Not Sunday
            expect(parsedDate.getDay()).not.toBe(6); // Not Saturday
        });
    });

    it('returns an empty array if numOfDays is 0', () => {
        const result = getNextWorkingDays(0);
        expect(result).toEqual([]);
    });

    it('handles a large number of days correctly', () => {
        const result = getNextWorkingDays(100);
        expect(result.length).toBe(100);
    });

    it('returns correct dates when starting on a weekend', () => {
        jest.setSystemTime(new Date('2023-10-07')); // Set to a Saturday
        const result = getNextWorkingDays(3);
        expect(result).toEqual([
            format(new Date('2023-10-09'), 'dd-MM-yyyy'), // Monday
            format(new Date('2023-10-10'), 'dd-MM-yyyy'), // Tuesday
            format(new Date('2023-10-11'), 'dd-MM-yyyy'), // Wednesday
        ]);
        jest.useRealTimers();
    });
});

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
