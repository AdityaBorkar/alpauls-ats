import type { Action, Resource } from "@/lib/auth/access-control";

interface ForbiddenMessageProps {
  resource?: Resource;
  action?: Action;
}

export function ForbiddenMessage({ resource, action }: ForbiddenMessageProps) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <h1 className="font-bold text-6xl text-red-600">403</h1>
        <p className="mt-4 text-gray-700 text-xl">Forbidden</p>
        {resource && action && (
          <p className="mt-2 text-gray-500">
            Required permission: {resource}.{action}
          </p>
        )}
        <p className="mt-6 text-gray-400 text-sm">
          Contact your administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
}
