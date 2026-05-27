import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export default function NavLayout({
  children,
  baseUrl,
  label,
  leftItems,
  rightItems,
}: {
  children: React.ReactNode;
  baseUrl: string;
  label: string;
  leftItems?: React.ReactNode;
  rightItems?: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="flex h-12 flex-row items-center gap-1 border-neutral-300 border-b px-8">
        <Link to={baseUrl}>{label}</Link>
        <ChevronRight className="mx-1 size-4.5" />
        {leftItems}
        <div className="grow" />
        {rightItems}
      </div>
      <div className="px-8 py-4">{children}</div>
    </div>
  );
}
