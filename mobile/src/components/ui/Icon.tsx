import { MaterialIcons } from "@expo/vector-icons";
import { StyleProp, TextStyle } from "react-native";

// Material Symbols Outlined (used in the design mockups) isn't shipped in
// @expo/vector-icons, and RN can't reliably render ligature-based icon fonts.
// This maps the mockups' snake_case Symbol names to verified kebab-case
// MaterialIcons glyphs so screen code can keep referencing names that match
// the mockups (easier to cross-check while building).
const ICON_MAP = {
  grid_view: "grid-view",
  receipt_long: "receipt-long",
  cc_attribution: "receipt-long", // mockup artifact, not a real Symbol name
  group: "group",
  person: "person",
  analytics: "analytics",
  insights: "insights",
  add_circle: "add-circle",
  add: "add",
  payments: "payments",
  document_scanner: "document-scanner",
  photo_camera: "photo-camera",
  notifications: "notifications",
  notifications_none: "notifications-none",
  group_add: "group-add",
  person_add: "person-add",
  restaurant: "restaurant",
  home: "home",
  confirmation_number: "confirmation-number",
  coffee: "coffee",
  auto_awesome: "auto-awesome",
  compare_arrows: "compare-arrows",
  backspace: "backspace",
  close: "close",
  check: "check",
  arrow_back: "arrow-back",
  settings: "settings",
  flight_takeoff: "flight-takeoff",
  train: "train",
  local_bar: "local-bar",
  hotel: "hotel",
  account_balance_wallet: "account-balance-wallet",
  trending_up: "trending-up",
  trending_down: "trending-down",
  menu: "menu",
  logout: "logout",
  expand_more: "expand-more",
  expand_less: "expand-less",
  share: "share",
  archive: "archive",
  unarchive: "unarchive",
  edit: "edit",
  delete: "delete",
  more_vert: "more-vert",
  search: "search",
  category: "category",
  calendar_today: "calendar-today",
  chevron_right: "chevron-right",
  error_outline: "error-outline",
  check_circle: "check-circle",
  photo_library: "photo-library",
  send: "send",
  visibility_off: "visibility-off",
  restore: "restore",
  celebration: "celebration",
} as const satisfies Record<string, React.ComponentProps<typeof MaterialIcons>["name"]>;

export type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Icon({ name, size = 24, color, style }: IconProps) {
  return <MaterialIcons name={ICON_MAP[name]} size={size} color={color} style={style} />;
}
