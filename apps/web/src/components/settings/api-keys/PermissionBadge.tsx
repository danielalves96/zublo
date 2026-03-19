import { useTranslation } from "react-i18next";
import type { ApiKeyPermission } from "@/types";
import {
  API_KEY_PERMISSION_COLORS,
  API_KEY_PERMISSIONS,
} from "@/components/settings/api-keys/config";

interface PermissionBadgeProps {
  perm: ApiKeyPermission;
}

export function PermissionBadge({ perm }: PermissionBadgeProps) {
  const { t } = useTranslation();
  const permission = API_KEY_PERMISSIONS.find((item) => item.id === perm);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${API_KEY_PERMISSION_COLORS[perm].badge}`}
    >
      {t(permission?.labelKey ?? perm)}
    </span>
  );
}
