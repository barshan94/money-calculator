export type PickedContact = {
  name?: string;
  phoneNumber?: string;
};

type ContactPickerNavigator = Navigator & {
  contacts?: {
    select: (
      properties: string[],
      options?: {
        multiple?: boolean;
      },
    ) => Promise<
      Array<{
        name?: string[];
        tel?: string[];
      }>
    >;
  };
};

export function isContactPickerSupported() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const nav = navigator as ContactPickerNavigator;

  return typeof nav.contacts?.select === "function";
}

export async function pickContact(): Promise<PickedContact | null> {
  if (!isContactPickerSupported()) {
    return null;
  }

  const nav = navigator as ContactPickerNavigator;

  const contacts = await nav.contacts!.select(
    ["name", "tel"],
    {
      multiple: false,
    },
  );

  if (!contacts.length) {
    return null;
  }

  const contact = contacts[0];

  return {
    name: contact.name?.[0],
    phoneNumber: contact.tel?.[0],
  };
}