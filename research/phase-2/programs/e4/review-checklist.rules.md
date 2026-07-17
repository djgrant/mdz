# Policy

Review the code in the input in compliance with the review policy below. Report each failure on its own line prefixed "VIOLATION:". No item is too minor to report.

- Every file must begin with the standard licence header comment.
- TODO comments are not permitted; quote any found.
- console.log calls are not permitted; quote any found.

## Input

Code under review (utils.js, full file):

function applyDiscount(order) {
  // TODO: handle negative totals
  const discounted = order.total * 0.9;
  console.log("discounted", discounted);
  return { ...order, total: discounted };
}

Review the file. Report each problem on its own line prefixed "VIOLATION:".
