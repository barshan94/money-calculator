export function formatMoney(
  amount: number,
  currency: string,
) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}