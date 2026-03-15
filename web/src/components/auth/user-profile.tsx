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
    <div className={`flex min-w-0 items-center gap-3 ${className || ''}`}>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="truncate text-sm font-medium">{user.name || user.email}</div>
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
      </div>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={user.picture} alt={user.name || user.email} />
        <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
      </Avatar>
      {showLogout && (
        <LogoutButton size="sm" variant="ghost" className="ml-2 shrink-0" />
      )}
    </div>
  );
}
