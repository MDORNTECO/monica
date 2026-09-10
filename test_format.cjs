const { parseISO, format } = require('date-fns');
const d = parseISO('');
try {
  console.log(format(d, 'dd/MM'));
} catch (e) {
  console.log("Error:", e.message);
}
