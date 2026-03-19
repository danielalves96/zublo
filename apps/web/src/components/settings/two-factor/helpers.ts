import { LS_KEYS } from "@/lib/constants";

export function clearTrustedDevice(userId: string) {
  localStorage.removeItem(LS_KEYS.totpTrusted(userId));
}
