"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "./logout-button";
import { useCurrentUser } from "@/lib/hooks/use-auth";

interface UserProfileProps {
  showLogout?: boolean;
  className?: string;
}

export function UserProfile({ showLogout = true, className }: UserProfileProps) {
  const user = useCurrentUser();

  if (!user) {
    return null;
  }

  const getInitials = (name?: string | null) => {
    if (!name || typeof name !== "string") {
      return "?"
    }

    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`flex items-center gap-3 ${className || ''}`}>
      <div className="text-right hidden sm:block">
        <div className="text-sm font-medium">{user.name || user.email}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
      </div>
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.picture} alt={user.name || user.email} />
        <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
      </Avatar>
      {showLogout && (
        <LogoutButton size="sm" variant="ghost" className="ml-2" />
      )}
    </div>
  );
}
