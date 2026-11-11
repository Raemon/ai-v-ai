// The octopus ticket's code (octopus.js can't say this as data): on a rerun, orders.csv is the
// shop's whole order history, 48,213 orders in no order at all. Priya's is the newest, and nowhere
// near the top. The viewer shows the first rows; the rest are there to be sorted, not read.
(function () {
  'use strict';

  const FIRST_ORDER = 10001;
  const HERS = 58213;
  const ORDERS = HERS - FIRST_ORDER + 1; // 48,213
  const SHOWN = 400;

  const NAMES = ['A. Haddad', 'B. Okonkwo', 'C. Lindqvist', 'D. Okafor', 'E. Marsh', 'F. Nakamura', 'G. Petrov', 'H. Silva',
    'I. Brennan', 'J. Mbeki', 'K. Aalto', 'L. Romano', 'M. Russo', 'N. Duarte', 'O. Kowalski', 'P. Iyer', 'Q. Tran',
    'R. Novak', 'S. Adeyemi', 'T. Lin', 'U. Berg', 'V. Castillo', 'W. Osei', 'Y. Tanaka', 'Z. Farah', 'Priya S.'];
  const ITEMS = [
    ['whale (giant)', 'WHL-G-GRY'], ['octopus (large)', 'OCT-L-BLU'], ['octopus (giant)', 'OCT-G-PNK'], ['sloth (medium)', 'SLO-M-BRN'],
    ['penguin (small)', 'PEN-S-BLK'], ['narwhal (large)', 'NAR-L-WHT'], ['otter (medium)', 'OTR-M-BRN'], ['axolotl (small)', 'AXO-S-PNK'],
  ];
  // Mostly delivered, some still moving, and a scattering held at the flooded depot.
  const STATUSES = ['delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered',
    'in transit', 'in transit', 'processing', 'held at Depot 7', 'returned'];

  // The same "random" choices every time: a row's order number decides everything else in it.
  const pick = (list, n, salt) => list[((n * 2654435761 + salt) >>> 0) % list.length];

  function row(order) {
    const [item, sku] = pick(ITEMS, order, 17);
    return [order, pick(NAMES, order, 5), item, sku, pick(STATUSES, order, 29)].join(',');
  }

  // The first rows of the export: order numbers in no order, never hers, never twice.
  function firstOrders() {
    const seen = new Set();
    let seed = 482;
    while (seen.size < SHOWN) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      seen.add(FIRST_ORDER + (seed % (ORDERS - 1)));
    }
    return [...seen];
  }

  const bigOrders = () => ['order,customer,item,sku,status', ...firstOrders().map(row), '…,…,…,…,…'].join('\n');

  SCENARIO.hooks('octopus', { bigOrders });
})();
