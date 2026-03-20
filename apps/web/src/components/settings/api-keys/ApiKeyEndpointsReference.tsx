import {
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  Copy,
  CreditCard,
  Package,
  RefreshCw,
  Tag,
  Users,
} from "lucide-react";
import { type ReactNode,useState } from "react";
import { useTranslation } from "react-i18next";

import { PermissionBadge } from "@/components/settings/api-keys/PermissionBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApiKeyPermission } from "@/types";

const SUBSCRIPTION_CREATE_BODY = `{
  "name": "Netflix",           // required
  "price": 15.99,              // required
  "currency_id": "<id>",       // required
  "cycle_id": "<id>",          // required - from GET api/external/cycles
  "frequency": 1,              // required - e.g. 1 = every 1 cycle
  "next_payment": "2025-02-01",// required - YYYY-MM-DD
  "auto_renew": true,          // optional
  "notify": true,              // optional
  "notify_days_before": 3,     // optional
  "notes": "...",              // optional
  "url": "https://...",        // optional
  "category_id": "<id>",       // optional
  "payment_method_id": "<id>", // optional
  "payer_id": "<id>"           // optional
}`;

const CATEGORY_CREATE_BODY = `{
  "name": "Entertainment",     // required
  "color": "#FF5733"           // optional - hex color code
}`;

const PAYMENT_METHOD_CREATE_BODY = `{
  "name": "Credit Card"        // required
}`;

const HOUSEHOLD_CREATE_BODY = `{
  "name": "John Doe"           // required
}`;

const CURRENCY_CREATE_BODY = `{
  "code": "USD",               // required - e.g., USD, EUR, BRL
  "symbol": "$",               // optional
  "name": "US Dollar"          // optional
}`;

const SUBSCRIPTION_UPDATE_BODY = `{
  "name": "Netflix",           // optional
  "price": 17.99,              // optional
  "currency_id": "<id>",       // optional
  "cycle_id": "<id>",          // optional
  "frequency": 1,              // optional
  "next_payment": "2025-03-01",// optional
  "auto_renew": true,          // optional
  "notify": true,              // optional
  "notify_days_before": 5,     // optional
  "inactive": false,           // optional
  "notes": "...",              // optional
  "url": "https://...",        // optional
  "category_id": "<id>",       // optional
  "payment_method_id": "<id>", // optional
  "payer_id": "<id>"           // optional
}`;

const CATEGORY_UPDATE_BODY = `{
  "name": "Movies & Series"    // required
}`;

const PAYMENT_METHOD_UPDATE_BODY = `{
  "name": "Debit Card"         // required
}`;

const HOUSEHOLD_UPDATE_BODY = `{
  "name": "Jane Doe"           // required
}`;

const CURRENCY_UPDATE_BODY = `{
  "code": "EUR",               // optional
  "symbol": "€",               // optional
  "name": "Euro"               // optional
}`;

const SUBSCRIPTION_STATUS_BODY = `{
  "active": true               // boolean (required)
}`;

const SUBSCRIPTION_MARK_PAID_BODY = `{
  "paid_at": "2025-02-01",     // optional - ISO date
  "amount": 15.99              // optional - amount paid
}`;

const SUBSCRIPTION_BATCH_BODY = `{
  "subscriptions": [           // array of subscription objects (required)
    { "name": "Netflix", ... },
    { "name": "Spotify", ... }
  ]
}`;

const CATEGORY_BULK_RENAME_BODY = `{
  "old_name": "Entertainment", // required (current name)
  "new_name": "Fun"            // required (new name)
}`;

const AUTHORIZATION_HEADER = "Authorization: Bearer YOUR_KEY";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiEndpoint {
  label: string;
  perm: ApiKeyPermission;
  method: HttpMethod;
  url: string;
  bodySchema?: string;
}

interface EndpointGroup {
  id: string;
  title: string;
  icon: ReactNode;
  endpoints: ApiEndpoint[];
}

function getMethodColor(method: HttpMethod) {
  switch (method) {
    case "GET":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "POST":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "PUT":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "PATCH":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "DELETE":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
  }
}

function buildEndpointGroups(
  t: (key: string) => string,
  baseUrl: string,
): EndpointGroup[] {
  return [
    {
      id: "subscriptions",
      title: t("subscriptions"),
      icon: <Package className="h-4 w-4" />,
      endpoints: [
        {
          label: t("api_key_endpoint_subscriptions_list"),
          perm: "subscriptions:read",
          method: "GET",
          url: `${baseUrl}/api/external/subscriptions`,
        },
        {
          label: t("api_key_endpoint_subscriptions_get"),
          perm: "subscriptions:read",
          method: "GET",
          url: `${baseUrl}/api/external/subscriptions/{id}`,
        },
        {
          label: t("api_key_endpoint_subscriptions_create"),
          perm: "subscriptions:write",
          method: "POST",
          url: `${baseUrl}/api/external/subscriptions`,
          bodySchema: SUBSCRIPTION_CREATE_BODY,
        },
        {
          label: t("api_key_endpoint_subscriptions_update"),
          perm: "subscriptions:write",
          method: "PUT",
          url: `${baseUrl}/api/external/subscriptions/{id}`,
          bodySchema: SUBSCRIPTION_UPDATE_BODY,
        },
        {
          label: t("api_key_endpoint_subscriptions_delete"),
          perm: "subscriptions:write",
          method: "DELETE",
          url: `${baseUrl}/api/external/subscriptions/{id}`,
        },
        {
          label: t("api_key_endpoint_subscriptions_status"),
          perm: "subscriptions:write",
          method: "PATCH",
          url: `${baseUrl}/api/external/subscriptions/{id}/status`,
          bodySchema: SUBSCRIPTION_STATUS_BODY,
        },
        {
          label: t("api_key_endpoint_subscriptions_mark_paid"),
          perm: "subscriptions:write",
          method: "POST",
          url: `${baseUrl}/api/external/subscriptions/{id}/mark-paid`,
          bodySchema: SUBSCRIPTION_MARK_PAID_BODY,
        },
        {
          label: t("api_key_endpoint_subscriptions_batch"),
          perm: "subscriptions:write",
          method: "POST",
          url: `${baseUrl}/api/external/subscriptions/batch`,
          bodySchema: SUBSCRIPTION_BATCH_BODY,
        },
      ],
    },
    {
      id: "cycles",
      title: t("cycles"),
      icon: <RefreshCw className="h-4 w-4" />,
      endpoints: [
        {
          label: t("api_key_endpoint_cycles_list"),
          perm: "subscriptions:read",
          method: "GET",
          url: `${baseUrl}/api/external/cycles`,
        },
      ],
    },
    {
      id: "stats",
      title: `${t("statistics")} & ${t("calendar")}`,
      icon: <BarChart3 className="h-4 w-4" />,
      endpoints: [
        {
          label: t("api_key_endpoint_statistics"),
          perm: "statistics:read",
          method: "GET",
          url: `${baseUrl}/api/external/statistics`,
        },
        {
          label: t("api_key_endpoint_calendar"),
          perm: "calendar:read",
          method: "GET",
          url: `${baseUrl}/api/calendar/ical`,
        },
      ],
    },
    {
      id: "categories",
      title: t("categories"),
      icon: <Tag className="h-4 w-4" />,
      endpoints: [
        {
          label: t("api_key_endpoint_categories_list"),
          perm: "categories:read",
          method: "GET",
          url: `${baseUrl}/api/external/categories`,
        },
        {
          label: t("api_key_endpoint_categories_create"),
          perm: "categories:write",
          method: "POST",
          url: `${baseUrl}/api/external/categories`,
          bodySchema: CATEGORY_CREATE_BODY,
        },
        {
          label: t("api_key_endpoint_categories_update"),
          perm: "categories:write",
          method: "PUT",
          url: `${baseUrl}/api/external/categories/{id}`,
          bodySchema: CATEGORY_UPDATE_BODY,
        },
        {
          label: t("api_key_endpoint_categories_delete"),
          perm: "categories:write",
          method: "DELETE",
          url: `${baseUrl}/api/external/categories/{id}`,
        },
        {
          label: t("api_key_endpoint_categories_bulk_rename"),
          perm: "categories:write",
          method: "POST",
          url: `${baseUrl}/api/external/categories/bulk-rename`,
          bodySchema: CATEGORY_BULK_RENAME_BODY,
        },
      ],
    },
    {
      id: "payment_methods",
      title: t("payment_methods"),
      icon: <CreditCard className="h-4 w-4" />,
      endpoints: [
        {
          label: t("api_key_endpoint_payment_methods_list"),
          perm: "payment_methods:read",
          method: "GET",
          url: `${baseUrl}/api/external/payment-methods`,
        },
        {
          label: t("api_key_endpoint_payment_methods_create"),
          perm: "payment_methods:write",
          method: "POST",
          url: `${baseUrl}/api/external/payment-methods`,
          bodySchema: PAYMENT_METHOD_CREATE_BODY,
        },
        {
          label: t("api_key_endpoint_payment_methods_update"),
          perm: "payment_methods:write",
          method: "PUT",
          url: `${baseUrl}/api/external/payment-methods/{id}`,
          bodySchema: PAYMENT_METHOD_UPDATE_BODY,
        },
        {
          label: t("api_key_endpoint_payment_methods_delete"),
          perm: "payment_methods:write",
          method: "DELETE",
          url: `${baseUrl}/api/external/payment-methods/{id}`,
        },
      ],
    },
    {
      id: "household",
      title: t("household"),
      icon: <Users className="h-4 w-4" />,
      endpoints: [
        {
          label: t("api_key_endpoint_household_list"),
          perm: "household:read",
          method: "GET",
          url: `${baseUrl}/api/external/household`,
        },
        {
          label: t("api_key_endpoint_household_create"),
          perm: "household:write",
          method: "POST",
          url: `${baseUrl}/api/external/household`,
          bodySchema: HOUSEHOLD_CREATE_BODY,
        },
        {
          label: t("api_key_endpoint_household_update"),
          perm: "household:write",
          method: "PUT",
          url: `${baseUrl}/api/external/household/{id}`,
          bodySchema: HOUSEHOLD_UPDATE_BODY,
        },
        {
          label: t("api_key_endpoint_household_delete"),
          perm: "household:write",
          method: "DELETE",
          url: `${baseUrl}/api/external/household/{id}`,
        },
      ],
    },
    {
      id: "currencies",
      title: t("currencies"),
      icon: <Coins className="h-4 w-4" />,
      endpoints: [
        {
          label: t("api_key_endpoint_currencies_list"),
          perm: "currencies:read",
          method: "GET",
          url: `${baseUrl}/api/external/currencies`,
        },
        {
          label: t("api_key_endpoint_currencies_create"),
          perm: "currencies:write",
          method: "POST",
          url: `${baseUrl}/api/external/currencies`,
          bodySchema: CURRENCY_CREATE_BODY,
        },
        {
          label: t("api_key_endpoint_currencies_update"),
          perm: "currencies:write",
          method: "PUT",
          url: `${baseUrl}/api/external/currencies/{id}`,
          bodySchema: CURRENCY_UPDATE_BODY,
        },
        {
          label: t("api_key_endpoint_currencies_delete"),
          perm: "currencies:write",
          method: "DELETE",
          url: `${baseUrl}/api/external/currencies/{id}`,
        },
        {
          label: t("api_key_endpoint_currencies_set_main"),
          perm: "currencies:write",
          method: "PUT",
          url: `${baseUrl}/api/external/currencies/{id}/main`,
        },
      ],
    },
  ];
}

export function ApiKeyEndpointsReference() {
  const { t } = useTranslation();
  const baseUrl = window.location.origin;
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedBodies, setExpandedBodies] = useState<Set<string>>(new Set());
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const endpointGroups = buildEndpointGroups(t, baseUrl);

  const copyValue = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedUrl(value);
    setTimeout(() => setCopiedUrl(null), 1500);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  };

  const toggleBody = (bodyId: string) => {
    setExpandedBodies((current) => {
      const next = new Set(current);

      if (next.has(bodyId)) {
        next.delete(bodyId);
      } else {
        next.add(bodyId);
      }

      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center gap-2.5 bg-muted/30 px-6 py-4 transition-colors duration-150 hover:bg-muted/50"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="flex-1 text-left text-sm font-semibold">
          {t("api_key_endpoints_title")}
        </h3>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="divide-y border-t bg-muted/5">
          <div className="space-y-2 px-6 py-4 bg-background/80">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Authorization Header
            </p>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 break-all rounded-lg border border-border/40 bg-muted/60 px-3 py-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {AUTHORIZATION_HEADER}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg"
                onClick={() => copyValue(AUTHORIZATION_HEADER)}
              >
                {copiedUrl === AUTHORIZATION_HEADER ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
          {endpointGroups.map((group) => {
            const isGroupOpen = expandedGroups.has(group.id);

            return (
              <div key={group.id} className="group/group">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-6 py-3.5 transition-colors duration-150 hover:bg-muted/40"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover/group:text-primary">
                    {group.icon}
                  </div>
                  <span className="flex-1 text-left text-sm font-medium">
                    {group.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-[10px] font-bold"
                    >
                      {group.endpoints.length}
                    </Badge>
                    <ChevronRight
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                        isGroupOpen ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>

                {isGroupOpen ? (
                  <div className="divide-y border-t bg-background">
                    {group.endpoints.map((endpoint) => {
                      const bodyId = `${group.id}-${endpoint.method}-${endpoint.label}`;
                      const isBodyOpen = expandedBodies.has(bodyId);

                      return (
                        <div
                          key={`${endpoint.url}-${endpoint.method}`}
                          className="space-y-2.5 bg-background/50 px-6 py-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`min-w-[50px] rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums ${getMethodColor(
                                endpoint.method,
                              )}`}
                            >
                              {endpoint.method}
                            </span>
                            <span className="text-sm font-medium">
                              {endpoint.label}
                            </span>
                            <PermissionBadge perm={endpoint.perm} />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <code className="flex-1 break-all rounded-lg border border-border/40 bg-muted/60 px-3 py-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                              {endpoint.url}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 cursor-pointer rounded-lg transition-colors hover:bg-primary/5 hover:text-primary"
                              onClick={() => copyValue(endpoint.url)}
                              aria-label="Copy URL"
                            >
                              {copiedUrl === endpoint.url ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </Button>
                          </div>

                          {endpoint.bodySchema ? (
                            <div className="pl-1">
                              <button
                                className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
                                onClick={() => toggleBody(bodyId)}
                              >
                                <div
                                  className={`rounded bg-muted/80 p-0.5 transition-transform duration-200 ${
                                    isBodyOpen ? "rotate-180" : ""
                                  }`}
                                >
                                  <ChevronDown className="h-2.5 w-2.5" />
                                </div>
                                {t("api_key_show_body_schema")}
                              </button>

                              {isBodyOpen ? (
                                <div className="group/code relative mt-2.5">
                                  <pre className="overflow-x-auto rounded-xl border border-border/30 bg-muted/40 px-4 py-3.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                                    {endpoint.bodySchema}
                                  </pre>
                                  <button
                                    className="absolute right-2 top-2 cursor-pointer rounded-lg border border-border/50 bg-background/80 p-1.5 text-muted-foreground opacity-0 transition-all hover:text-primary group-hover/code:opacity-100"
                                    onClick={() => copyValue(endpoint.bodySchema!)}
                                    title="Copy schema"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
