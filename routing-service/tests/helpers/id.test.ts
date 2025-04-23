import { uuidToInt, intToUuid } from '../../src/helpers/id';

describe('uuidToInt', () => {
    it('returns a positive integer for a valid UUID', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const result = uuidToInt(uuid);
        expect(result).toBeGreaterThan(0);
    });

    it('returns the same integer for the same UUID', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const result1 = uuidToInt(uuid);
        const result2 = uuidToInt(uuid);
        expect(result1).toBe(result2);
    });

    it('returns different integers for different UUIDs', () => {
        const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
        const uuid2 = '550e8400-e29b-41d4-a716-446655440001';
        const result1 = uuidToInt(uuid1);
        const result2 = uuidToInt(uuid2);
        expect(result1).not.toBe(result2);
    });
});

describe('intToUuid', () => {
    it('returns the correct UUID for a given integer', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const uuidMap = new Map<number, string>();
        const int = uuidToInt(uuid);
        uuidMap.set(int, uuid);
        const result = intToUuid(int, uuidMap);
        expect(result).toBe(uuid);
    });

    it('returns undefined if the integer is not in the map', () => {
        const uuidMap = new Map<number, string>();
        const result = intToUuid(12345, uuidMap);
        expect(result).toBeUndefined();
    });

    it('handles collisions gracefully by returning the mapped UUID', () => {
        const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
        const uuid2 = '550e8400-e29b-41d4-a716-446655440001';
        const uuidMap = new Map<number, string>();
        const int1 = uuidToInt(uuid1);
        uuidMap.set(int1, uuid1);
        uuidMap.set(int1, uuid2); // Overwrite with a new UUID
        const result = intToUuid(int1, uuidMap);
        expect(result).toBe(uuid2);
    });
});
