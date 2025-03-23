import { addDays, format, isWeekend } from 'date-fns';

export function getNextWorkingDays(numOfDays: number): string[] {
    const dates: Date[] = [];
    let currentDate = new Date();

    for (let i = 0; i < numOfDays; i++) {
        currentDate = getNextWorkingDay(currentDate);
        dates.push(currentDate);
        currentDate = addDays(currentDate, 1);
    }

    return dates.map((date) => format(date, 'dd.MM.yyyy'));
}

function getNextWorkingDay(date: Date): Date {
    let nextDate = date;
    while (isWeekend(nextDate)) {
        nextDate = addDays(nextDate, 1);
    }
    return nextDate;
}
