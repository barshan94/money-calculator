"use client";

type Props = {
  personName: string;
  phoneNumber: string;
  currency: string;
  remainingAmount: number;
};

export default function LoanWhatsAppButton({
  personName,
  phoneNumber,
  currency,
  remainingAmount,
}: Props) {
  function openWhatsApp() {
    const cleanNumber = phoneNumber.replace(
      /\D/g,
      "",
    );

    if (!cleanNumber) {
      return;
    }

    const amount = remainingAmount.toLocaleString(
      "en-BD",
      {
        minimumFractionDigits: 2,
      },
    );

    const message =
      `Hi ${personName}, this is a reminder about the ` +
      `outstanding loan amount of ${currency} ${amount}. ` +
      `Please let me know when you can make the repayment. Thank you.`;

    const url =
      `https://wa.me/${cleanNumber}?text=` +
      encodeURIComponent(message);

    window.open(url, "_blank");
  }

  return (
    <button
      type="button"
      onClick={openWhatsApp}
    >
      WhatsApp Reminder
    </button>
  );
}