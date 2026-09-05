import type { Metadata } from "next";

import { AccountView } from "./AccountView";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Kavach account, and what this device is holding.",
};

export default function AccountPage() {
  return <AccountView />;
}
