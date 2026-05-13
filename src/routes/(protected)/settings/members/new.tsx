import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import type {
  MemberFormValues,
  RoleCode,
  UserOption,
} from "@/components/members/member-form";
import { MemberForm } from "@/components/members/member-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { orpc } from "@/rpc/client";

export const Route = createFileRoute("/(protected)/settings/members/new")({
  component: NewMemberPage,
});

function NewMemberPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: users } = useQuery(
    orpc.admin.listUsers.queryOptions({ input: {} }),
  );

  const userOptions: UserOption[] = (users ?? []).map((u) => ({
    email: u.email,
    id: u.id,
    name: u.name,
    role: u.role,
  }));

  const [formValues, setFormValues] = useState<MemberFormValues>({
    email: "",
    name: "",
    password: "",
    permissions: {},
    role: "tl",
    supervisorId: null,
  });

  const createMutation = useMutation({
    mutationFn: (input: {
      permissions?: Record<string, string[]> | null;
      email: string;
      name: string;
      password: string;
      role: RoleCode;
      supervisorId?: string | null;
    }) => orpc.admin.createUser.call(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      navigate({
        params: { memberId: data.id },
        to: "/settings/members/$memberId",
      });
    },
  });

  function handleSubmit() {
    createMutation.mutate({
      email: formValues.email,
      name: formValues.name,
      password: formValues.password,
      permissions: formValues.role === "custom" ? formValues.permissions : null,
      role: formValues.role,
      supervisorId: formValues.supervisorId,
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => navigate({ to: "/settings/members" })}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="font-semibold text-lg">Add Team Member</h2>
          <p className="text-muted-foreground text-sm">
            Create a new member account
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
          <CardDescription>
            Enter the details for the new team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberForm
            error={createMutation.error?.message}
            isPending={createMutation.isPending}
            mode="create"
            onChange={setFormValues}
            onSubmit={handleSubmit}
            users={userOptions}
            values={formValues}
          />
        </CardContent>
      </Card>
    </div>
  );
}
