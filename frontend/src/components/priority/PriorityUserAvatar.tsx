import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function PriorityUserAvatar({
  name,
  size = "default",
  className,
}: {
  name: string
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  return (
    <Avatar
      size={size}
      className={cn(
        "bg-[linear-gradient(135deg,_rgba(11,31,59,0.9),_rgba(128,0,32,0.9))] shadow-[0_18px_40px_-28px_rgba(3,10,24,0.55)]",
        className
      )}
    >
      <AvatarFallback className="bg-transparent font-semibold text-white">
        {initialsFromName(name) || "U"}
      </AvatarFallback>
    </Avatar>
  )
}
