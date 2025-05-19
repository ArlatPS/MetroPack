import { addDays, format, isWeekend, parse } from 'date-fns';

export function getNextWorkingDays(numOfDays: number): string[] {
    const dates: Date[] = [];
    let currentDate = new Date();

    for (let i = 0; i < numOfDays; i++) {
        currentDate = getNextWorkingDay(currentDate);
        dates.push(currentDate);
        currentDate = addDays(currentDate, 1);
    }

    return dates.map((date) => format(date, 'dd-MM-yyyy'));
}

function getNextWorkingDay(date: Date): Date {
    let nextDate = date;
    while (isWeekend(nextDate)) {
        nextDate = addDays(nextDate, 1);
    }
    return nextDate;
}

export function parseDate(date: string): Date {
    return parse(date, 'dd-MM-yyyy', new Date());
}

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
