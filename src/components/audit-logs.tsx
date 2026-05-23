import { format } from "date-fns";
import { Clock, MessageSquare, Phone } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime, stripPlus } from "@/lib/utils";

export type AuditLogEntry = {
  changedAt: Date | null;
  changedBy: string | null;
  changedByEmail: string | null;
  changedByImage: string | null;
  changedByName: string | null;
  changedByPhone: string | null;
  field: string;
  id: number;
  newValue: string | null;
  oldValue: string | null;
};

type AuditLogsProps = {
  domainName?: string;
  entries: AuditLogEntry[];
};

function PersonHoverCard({ entry }: { entry: AuditLogEntry }) {
  if (!entry.changedByName) return null;

  const phoneStripped = stripPlus(entry.changedByPhone);

  return (
    <Popover>
      <PopoverTrigger
        className="cursor-default font-medium"
        closeDelay={150}
        delay={200}
        openOnHover
        render={(props) => <span {...props}>{entry.changedByName}</span>}
      />
      <PopoverContent align="start" className="w-64" side="top">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={entry.changedByImage ?? undefined} />
            <AvatarFallback>
              {entry.changedByName[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">
              {entry.changedByName}
            </p>
            {entry.changedByEmail && (
              <p className="truncate text-muted-foreground text-xs">
                {entry.changedByEmail}
              </p>
            )}
            {entry.changedByPhone && (
              <p className="text-muted-foreground text-xs">
                {entry.changedByPhone}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          {entry.changedByPhone && (
            <a
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={`tel:${phoneStripped}`}
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
          )}
          {phoneStripped && (
            <a
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={`https://wa.me/${phoneStripped}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Message
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AuditLogs({ entries }: AuditLogsProps) {
  if (entries.length === 0) return null;
  return (
    <TooltipProvider delay={200}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Clock className="h-4 w-4" />
          Audit Logs
        </div>
        <div className="space-y-3">
          {entries.map((entry) => (
            <div className="flex items-start gap-3" key={entry.id}>
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-neutral-400" />
              <div className="min-w-0 flex-1 text-sm">
                <PersonHoverCard entry={entry} />
                <span className="text-muted-foreground"> changed </span>
                <span className="font-medium">{entry.field}</span>
                {entry.oldValue && (
                  <span className="text-muted-foreground">
                    {" "}
                    from &ldquo;{entry.oldValue}&rdquo;
                  </span>
                )}
                {entry.newValue && (
                  <span className="text-muted-foreground">
                    {" "}
                    to &ldquo;{entry.newValue}&rdquo;
                  </span>
                )}
                <span> &middot; </span>
                {entry.changedAt && (
                  <Tooltip>
                    <TooltipTrigger className="cursor-default text-muted-foreground">
                      {formatRelativeTime(entry.changedAt)}
                    </TooltipTrigger>
                    <TooltipContent>
                      {format(new Date(entry.changedAt), "MMM d, yyyy h:mm a")}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
