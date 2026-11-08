// Number formatting shared by the engine and the levels.
function fmt(n) {
  if (n === Infinity) return '∞';
  return Number.isInteger(n) && Math.abs(n) < 1e21 ? n.toLocaleString('en-US') : String(n);
}

const money = (n) => '$' + fmt(Math.round(n));
