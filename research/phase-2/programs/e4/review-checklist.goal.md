# Goal

Review the code in the input and report any problems.

## Input

Code under review (utils.js, full file):

function applyDiscount(order) {
  // TODO: handle negative totals
  const discounted = order.total * 0.9;
  console.log("discounted", discounted);
  return { ...order, total: discounted };
}

Review the file. Report each problem on its own line prefixed "VIOLATION:".
