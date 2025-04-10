// ./apps/frontend/src/components/layout/Sidebar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  Bell,
  Settings,
  LogOut,
  UserRound
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useLogin } from "@/features/auth/useLogin";

// Define navigation items structure for scalability
type NavItem = {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
};

// Navigation items with labels
const navItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/activity", label: "Activity", icon: Bell },
];

export function Sidebar() {
  const { logout } = useLogin();
  const navigate = useNavigate();

  // Active and inactive styles
  const activeClassName = "bg-sidebar-accent text-sidebar-accent-foreground";
  const inactiveClassName =
    "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground";

  return (
    <aside className="flex h-screen w-20 flex-col items-center border-r border-sidebar-border bg-sidebar p-4 space-y-4">
      {/* Navigation */}
      <nav className="flex flex-grow flex-col items-center space-y-6">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className="flex flex-col items-center justify-center transition-colors group"
          >
            {({ isActive }) => (
              <>
                <div className={cn("p-2 rounded-md", isActive ? activeClassName : inactiveClassName)}>
                  <item.icon
                    className="h-6 w-6 transition-transform duration-150 group-hover:scale-110"
                    fill={isActive ? "currentColor" : "none"}
                  />
                </div>
                <span className="mt-1 text-xs text-sidebar-foreground">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto flex flex-col items-center space-y-4 pb-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="group flex items-center justify-center rounded-md p-1 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground transition-colors"
            >
              <UserRound className="h-6 w-6 transition-transform duration-150 group-hover:scale-110" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 ml-2 mb-2" side="right" align="start">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onSelect={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}