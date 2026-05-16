export function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatAssetAmount(amount: number, asset: string) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7
  }).format(amount)} ${asset}`;
}

export function formatApy(rate: number) {
  return `${rate.toFixed(1)}% APY`;
}
