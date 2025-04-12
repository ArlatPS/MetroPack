export class Month {
    private readonly value: string;

    constructor(date: string) {
        if (!date || isNaN(Date.parse(date))) {
            throw new Error(`Invalid date format: ${date}`);
        }
        this.value = new Date(date).getFullYear() + '-' + (new Date(date).getMonth() + 1).toString().padStart(2, '0');
    }

    static validateMonth(month: string): boolean {
        const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
        return monthRegex.test(month);
    }

    public toString(): string {
        return this.value;
    }
}
