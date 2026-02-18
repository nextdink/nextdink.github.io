/**
 * BottomNav wrapper for nextdink
 * Uses shared BottomNav component with app-specific navigation items
 */
import { Home, Users, User } from "lucide-react";
import {
  BottomNav as SharedBottomNav,
  type NavItem,
} from "@shared/components/layout/BottomNav";
import { ROUTES } from "@/config/routes";

const navItems: NavItem[] = [
  { to: ROUTES.HOME, icon: Home, label: "Home" },
  { to: ROUTES.LISTS, icon: Users, label: "Lists" },
  { to: ROUTES.PROFILE, icon: User, label: "Profile" },
];

export function BottomNav() {
  return <SharedBottomNav items={navItems} />;
}
