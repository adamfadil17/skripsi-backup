"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function UserPresence() {
  const others = useOthers();
  const self = useSelf();

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-gray-600">
        {others.length + 1} user{others.length !== 0 ? "s" : ""} online
      </span>

      <div className="flex -space-x-2">
        {/* Current user */}
        {self && (
          <div className="relative">
            <Avatar className="h-8 w-8 border-2 border-white">
              <AvatarImage src={self.presence.user.image || ""} />
              <AvatarFallback>
                {self.presence.user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Badge
              variant="secondary"
              className="absolute -bottom-1 -right-1 text-xs px-1 py-0"
            >
              You
            </Badge>
          </div>
        )}

        {/* Other users */}
        {others.map(({ connectionId, presence }) => (
          <div key={connectionId} className="relative">
            <Avatar className="h-8 w-8 border-2 border-white">
              <AvatarImage src={presence.user.image || ""} />
              <AvatarFallback>
                {presence.user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: presence.cursor?.color || "#000" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
