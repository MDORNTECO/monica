const { parseISO, isPast, isToday } = require('date-fns');
const due = parseISO('2026-09-04');
console.log('due', due);
console.log('isPast', isPast(due));
console.log('isToday', isToday(due));
