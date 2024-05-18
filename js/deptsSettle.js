//
// This deptSettle is a js implementation of depts python package (https://gitlab.com/almet/debts/)
// it's the same algorithm used in ihatemoney.org so a desktop user can use the website
//

function settle(balances) {
  let { debiters, crediters } = orderBalance(balances);
  checkBalance(debiters, crediters);
  return reduceBalance(debiters, crediters);
}

function checkBalance(debiters, crediters) {
  function sum(balance) {
    return balance.reduce((total, [, v]) => total + Math.abs(v), 0);
  }

  const sumDebiters = sum(debiters);
  const sumCrediters = sum(crediters);

  if (Math.abs(sumCrediters - sumDebiters) >= 0.01) {
    throw new Error(
      `Unsolvable : debiters (-${sumDebiters}) and crediters (+${sumCrediters}) are unbalanced.`
    );
  }
}

function orderBalance(balances) {
  const balancesMap = new Map();

  for (const [id, balance] of balances) {
    const currentBalance = balancesMap.get(id) || 0;
    balancesMap.set(id, currentBalance + balance);
  }

  const crediters = [];
  const debiters = [];

  for (const [id, balance] of balancesMap) {
    if (balance > 0) {
      crediters.push([id, balance]);
    } else {
      debiters.push([id, balance]);
    }
  }

  return { debiters, crediters };
}

function reduceBalance(crediters, debiters, results = []) {
  if (crediters.length === 0 || debiters.length === 0) {
    return results;
  }

  crediters = crediters.sort((a, b) => {
    return a[1] - b[1] >= 0;
  });
  debiters = debiters.sort((a, b) => {
    return b[1] - a[1] >= 0;
  });

  const [debiter, debiterBalance] = crediters.pop();
  const [crediter, crediterBalance] = debiters.pop();

  const amount = Math.min(Math.abs(crediterBalance), Math.abs(debiterBalance));
  const dueAmount = parseFloat(amount.toFixed(2));

  if (dueAmount >= 0.01) {
    results.push([debiter, dueAmount, crediter]);
  }

  const newDebiterBalance = debiterBalance + amount;
  if (newDebiterBalance < 0) {
    crediters.push([debiter, newDebiterBalance]);
    crediters = crediters.sort((a, b) => {
      return a[1] - b[1] >= 0;
    });
  }

  const newCrediterBalance = crediterBalance - amount;
  if (newCrediterBalance > 0) {
    debiters.push([crediter, newCrediterBalance]);
    debiters = debiters.sort((a, b) => {
      return b[1] - a[1] >= 0;
    });
  }

  return reduceBalance(crediters, debiters, results);
}
