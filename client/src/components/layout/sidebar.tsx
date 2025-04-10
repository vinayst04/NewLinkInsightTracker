import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  Link as LinkIcon, 
  PlusCircle, 
  QrCode, 
  Settings, 
  LogOut,
  X
} from "lucide-react";

interface SidebarProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { logoutMutation } = useAuth();
  
  const getInitials = (name: string) => {
    return name.split('@')[0].substring(0, 2).toUpperCase();
  };
  
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/auth");
  };
  
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "My Links",
      href: "/links",
      icon: <LinkIcon className="h-5 w-5" />,
    },
    {
      name: "Create Link",
      href: "/create",
      icon: <PlusCircle className="h-5 w-5" />,
    },
    {
      name: "QR Codes",
      href: "/qr-codes",
      icon: <QrCode className="h-5 w-5" />,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transform transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo and mobile close button */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 6L10 18.5M6.5 8.5L3 12L6.5 15.5M17.5 8.5L21 12L17.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h1 className="text-xl font-bold">LinkInsight</h1>
            </div>
            
            <button 
              className="lg:hidden rounded-sm opacity-70 hover:opacity-100 focus:outline-none" 
              onClick={onClose}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-2">
            <nav className="px-2">
              <ul className="space-y-1">
                {navigationItems.map((item) => (
                  <li key={item.href}>
                    <Button
                      variant={item.href === location ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start text-base",
                        item.href === location 
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                      onClick={() => setLocation(item.href)}
                    >
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>
          </ScrollArea>

          {/* User profile */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user ? getInitials(user.username) : "UN"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.username || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || user?.username || "Unknown"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                title="Logout"
              >
                <LogOut className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
