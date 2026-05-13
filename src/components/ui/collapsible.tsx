import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { ChevronDownIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils.ts";

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  className,
  children,
  ...props
}: CollapsiblePrimitive.Trigger.Props & {
  children?: React.ReactNode;
}) {
  return (
    <CollapsiblePrimitive.Trigger
      className={cn(
        "flex w-full items-center gap-2 rounded-md font-medium text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&[data-panel-open]>svg]:rotate-180",
        className,
      )}
      data-slot="collapsible-trigger"
      {...props}
    >
      {children}
      <ChevronDownIcon className="ml-auto h-4 w-4 shrink-0 transition-transform duration-150" />
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsiblePanel({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      className={cn(
        "grid overflow-hidden transition-all duration-150 data-closed:grid-rows-[0fr] data-open:grid-rows-[1fr] data-closed:opacity-0 data-open:opacity-100",
        className,
      )}
      data-slot="collapsible-panel"
      {...props}
    >
      <div className="overflow-hidden">{props.children}</div>
    </CollapsiblePrimitive.Panel>
  );
}

export { Collapsible, CollapsiblePanel, CollapsibleTrigger };
