"use client";

type Props = {
  personName: string;
  phoneNumber: string;
  currency: string;
  remainingAmount: number;
};

function normalizeBangladeshWhatsAppNumber(
  value: string,
) {
  let phone = value.replace(/\D/g, "");

  // Already international:
  // 8801712345678
  if (phone.startsWith("880")) {
    return phone;
  }

  // Local Bangladesh format:
  // 01712345678
  if (phone.startsWith("01")) {
    return `88${phone}`;
  }

  // Without the leading zero:
  // 1712345678
  if (phone.startsWith("1")) {
    return `880${phone}`;
  }

  return phone;
}

export default function LoanWhatsAppButton({
  personName,
  phoneNumber,
  currency,
  remainingAmount,
}: Props) {
  function openWhatsApp() {
    const cleanNumber =
      normalizeBangladeshWhatsAppNumber(
        phoneNumber,
      );

    if (!/^8801\d{9}$/.test(cleanNumber)) {
      window.alert(
        "The saved WhatsApp number is not a valid Bangladesh mobile number.",
      );
      return;
    }

    const amount =
      remainingAmount.toLocaleString(
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

    window.open(
      url,
      "_blank",
      "noopener,noreferrer",
    );
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