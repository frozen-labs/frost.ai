import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Bot, Users } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "../../lib/utils/styles";

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/agents", label: "Agents", icon: Bot },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/models", label: "Models", icon: Bot },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-6">
        <img src="/logo.png" alt="Frost AI" className="h-13 w-auto" />
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} to={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  isActive && "bg-secondary"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
