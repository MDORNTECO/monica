const { parseISO, isSameDay } = require('date-fns');
try {
  console.log(isSameDay(parseISO(''), new Date()));
} catch (e) {
  console.log("Error:", e.message);
}
