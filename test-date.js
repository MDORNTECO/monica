const { parseISO, isPast, isToday } = require('date-fns');
const due = parseISO('2026-09-05');
console.log('due', due);
console.log('isPast', isPast(due));
console.log('isToday', isToday(due));
