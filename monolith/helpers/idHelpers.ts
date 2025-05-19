export function uuidToInt(uuid: string): number {
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
        const char = uuid.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return Math.abs(hash);
}

export function intToUuid(int: number, uuidMap: Map<number, string>): string | undefined {
    return uuidMap.get(int);
}
