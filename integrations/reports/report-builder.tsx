import { IconBraces, IconSettings } from "@tabler/icons-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ReportBuilderProps = {
  reportId: string;
};

export function ReportBuilder({ reportId: _reportId }: ReportBuilderProps) {
  return (
    <div className="space-y-6">
      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconSettings className="h-4 w-4" />
              Configuration
            </CardTitle>
            <CardDescription>
              Define data sources, filters, and layout for this report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed bg-muted/30">
              <div className="text-center">
                <IconBraces className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground text-sm">
                  Report builder coming soon
                </p>
                <p className="mt-1 text-muted-foreground/70 text-xs">
                  Drag-and-drop report composition will be available here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
