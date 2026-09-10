const { parseISO, isSameMonth } = require('date-fns');
const d = parseISO('');
try {
  console.log(isSameMonth(d, new Date()));
} catch (e) {
  console.log("Error:", e.message);
}
