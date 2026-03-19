export type DisplayKey =
  | "monthly_price"
  | "show_original_price"
  | "hide_disabled"
  | "disabled_to_bottom"
  | "subscription_progress"
  | "mobile_navigation"
  | "remove_background"
  | "convert_currency"
  | "payment_tracking";

export interface DisplayToggleDefinition {
  key: DisplayKey;
  labelKey: string;
  descriptionKey: string;
}

export const DISPLAY_TOGGLES: DisplayToggleDefinition[] = [
  {
    key: "monthly_price",
    labelKey: "monthly_price",
    descriptionKey: "monthly_price_desc",
  },
  {
    key: "show_original_price",
    labelKey: "show_original_price",
    descriptionKey: "show_original_price_desc",
  },
  {
    key: "hide_disabled",
    labelKey: "hide_disabled",
    descriptionKey: "hide_disabled_desc",
  },
  {
    key: "disabled_to_bottom",
    labelKey: "disabled_to_bottom",
    descriptionKey: "disabled_to_bottom_desc",
  },
  {
    key: "subscription_progress",
    labelKey: "subscription_progress",
    descriptionKey: "subscription_progress_desc",
  },
  {
    key: "mobile_navigation",
    labelKey: "mobile_navigation",
    descriptionKey: "mobile_navigation_desc",
  },
  {
    key: "remove_background",
    labelKey: "remove_background",
    descriptionKey: "remove_background_desc",
  },
  {
    key: "convert_currency",
    labelKey: "convert_currency",
    descriptionKey: "convert_currency_desc",
  },
];
