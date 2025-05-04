import { addDays, format, parse } from 'date-fns';

export function parseDate(date: string): Date {
    return parse(date, 'dd-MM-yyyy', new Date());
}

export function getNextNight(): string {
    let now = new Date();
    // if it is after 20:00 then return tomorrow
    if (now.getHours() >= 20) {
        now = addDays(now, 1);
    }
    return format(now, 'dd-MM-yyyy');
}
