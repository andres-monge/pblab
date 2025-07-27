"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getNotifications, markNotificationAsRead } from "@/lib/actions/notifications";
import type { NotificationWithActor } from "@/lib/actions/notifications";

export function NotificationsIndicator() {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const result = await getNotifications({ limit: 5 });
      if (result.success && result.data) {
        setNotifications(result.data);
        setUnreadCount(result.data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notification: NotificationWithActor) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        const result = await markNotificationAsRead({ notificationId: notification.id });
        if (result.success) {
          // Update local state
          setNotifications(prev => 
            prev.map(n => 
              n.id === notification.id ? { ...n, is_read: true } : n
            )
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to reference URL if available
    if (notification.reference_url) {
      router.push(notification.reference_url);
    }
  };

  const formatNotificationType = (type: string) => {
    switch (type) {
      case 'mention_in_comment':
        return 'mentioned you in a comment';
      default:
        return type.replace('_', ' ');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes > 0 ? `${minutes}m ago` : 'Just now';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`cursor-pointer p-3 ${!notification.is_read ? 'bg-muted/50' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex flex-col space-y-1 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {notification.actor.name || notification.actor.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(notification.created_at)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatNotificationType(notification.type)}
                </span>
                {!notification.is_read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto mt-1"></div>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}