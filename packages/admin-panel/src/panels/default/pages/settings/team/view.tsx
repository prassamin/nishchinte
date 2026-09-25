"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Spinner,
  Modal,
  Button,
  toast,
  Dropdown,
  Label,
  cn,
} from "@heroui/react";
import {
  UserPlus,
  Mail,
  AlertCircle,
  Trash2,
  MoreVertical,
  UserCheck,
  UserX,
} from "lucide-react";
import Content from "../../../components/content";
import { actions } from "@nishchinte/server/actions";
import { useRealtimeSubscription } from "@nishchinte/realtime/react";
import { useConfirm } from "@nishchinte/confirm";
import { useAdminAuth } from "@nishchinte/auth/react";
import { Select } from "../../../components/select";

const roleLabels: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  STAFF: "Staff Member",
};

type TeamSettingsViewProps = {
  initialUser?: {
    id: string;
    email: string;
    name: string;
    role: "OWNER" | "ADMIN" | "STAFF";
  } | null;
};

export function TeamSettingsView({ initialUser }: TeamSettingsViewProps = {}) {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const authState = useAdminAuth();
  const [toastId, setToastId] = useState("");

  // Auto-refreshes team member list on live database changes
  useRealtimeSubscription("InternalUser", "*", () => {
    queryClient.invalidateQueries({ queryKey: ["team-members"] });
  });

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STAFF" as "ADMIN" | "STAFF",
  });
  const [inviteError, setInviteError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await actions.admin.listUser();
      if (!res.ok) throw new Error(res.error || "Failed to load team members");
      return {
        members: res.members,
        currentUser: res.currentUser,
      };
    },
  });

  const members = data?.members || [];
  const currentUser = data?.currentUser || initialUser || authState.user;
  const currentRole = currentUser?.role || authState.role;

  const isCurrentOwner = currentRole === "OWNER";
  const isCurrentAdmin = currentRole === "ADMIN";
  const isCurrentStaff = currentRole === "STAFF";

  // Only STAFF cannot add members; OWNER and ADMIN CAN add members.
  const canAddMember = isCurrentStaff ? false : true;

  const createMutation = useMutation({
    mutationFn: async (data: typeof inviteForm) => {
      const res = await actions.admin.createUser(data);
      if (!res.ok) throw new Error(res.error || "Failed to add member");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      setInviteModalOpen(false);
      setInviteForm({ name: "", email: "", password: "", role: "STAFF" });
      toast("Success", {
        description: "Team member added successfully",
        variant: "success",
      });
    },
    onError: (error: any) => {
      setInviteError(error?.message || "Failed to add team member");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      id,
      role,
    }: {
      id: string;
      role: "OWNER" | "ADMIN" | "STAFF";
    }) => {
      setToastId(
        toast("Updating role...", {
          isLoading: true,
        }),
      );
      const res = await actions.admin.updateUser(id, { role });
      if (!res.ok) throw new Error(res.error || "Failed to update role");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.update(toastId, "Success", {
        description: "Role updated successfully",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast.update(toastId, "Error", {
        description: err?.message || "Failed to update role",
        variant: "danger",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      setToastId(
        toast("Updating status...", {
          isLoading: true,
        }),
      );
      const res = await actions.admin.updateUser(id, { isActive });

      if (!res.ok) {
        throw new Error(res.error || "Failed to update status");
      }
      return res;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.update(toastId, "Success", {
        description: `Account ${variables.isActive ? "activated" : "deactivated"} successfully`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast.update(toastId, "Error", {
        description: err?.message || "Failed to update status",
        variant: "danger",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await actions.admin.deleteUser(id);
      if (!res.ok) throw new Error(res.error || "Failed to delete member");
      return res;
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast("Success", {
        description:
          res?.message ||
          (res?.action === "deactivated"
            ? "Member deactivated successfully"
            : "Team member removed permanently"),
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast("Error", {
        description: err?.message || "Failed to delete team member",
        variant: "danger",
      });
    },
  });

  async function handleAddMember(e: React.SyntheticEvent) {
    e.preventDefault();
    setInviteError("");
    createMutation.mutate(inviteForm);
  }

  function handleUpdateRole(id: string, newRole: "ADMIN" | "STAFF") {
    updateRoleMutation.mutate({ id, role: newRole });
  }

  async function handleDeleteMember(id: string, name: string) {
    await confirm({
      title: "Remove Team Member",
      description: `Are you sure you want to remove ${name} from your team? They will no longer have access to the admin portal.`,
      isDanger: true,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(id);
      },
    });
  }

  return (
    <Content>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ap-foreground">
            Team & Staff
          </h1>
          <p className="text-sm text-ap-muted">
            Manage staff accounts and permissions
          </p>
        </div>
        {canAddMember && (
          <button
            onClick={() => {
              setInviteForm({
                name: "",
                email: "",
                password: "",
                role: "STAFF",
              });
              setInviteError("");
              setInviteModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-ap-accent px-4 py-2 text-sm font-semibold text-ap-accent-foreground transition hover:opacity-90 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Team Member
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="text-ap-accent" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-ap-border rounded-2xl">
          <div className="rounded-full bg-ap-surface p-4 mb-4">
            <Mail className="w-8 h-8 text-ap-muted" />
          </div>
          <h3 className="text-lg font-medium text-ap-foreground">
            No team members found
          </h3>
          <p className="text-sm text-ap-muted mt-1">
            Add members to grant admin portal access.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-ap-border/70 bg-ap-surface/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-ap-border/70 bg-ap-field-background/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ap-muted">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ap-muted">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ap-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ap-muted">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ap-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const displayName = member.name || member.email || "Unknown";
                  const avatarText = displayName.slice(0, 2).toUpperCase();
                  const isMemberOwner = member.role === "OWNER";
                  const isMemberAdmin = member.role === "ADMIN";
                  const isSelf = currentUser?.id === member.id;

                  // Only Owner can edit roles of non-owners
                  const canEditRole = isCurrentOwner && !isMemberOwner;

                  // Can this user perform actions on this member?
                  const canManageMember =
                    !isSelf &&
                    !isMemberOwner &&
                    !isCurrentStaff &&
                    (isCurrentOwner ||
                      (isCurrentAdmin && member.role === "STAFF"));

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-ap-border/50 last:border-0 hover:bg-ap-field-background/30 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={displayName}
                              className="h-9 w-9 rounded-full object-cover border border-ap-border"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ap-accent/15 text-sm font-bold text-ap-accent border border-ap-accent/20">
                              {avatarText}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-ap-foreground">
                              {member.name}
                            </span>
                            <span className="text-xs text-ap-muted">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {canEditRole ? (
                          <Dropdown>
                            <Dropdown.Trigger
                              className={cn(
                                "px-3 py-1.5 text-xs font-medium text-ap-foreground transition-colors outline-none cursor-pointer rounded-full",
                                member.role === "ADMIN"
                                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20",
                              )}
                            >
                              <span>
                                {roleLabels[member.role] || member.role}
                              </span>
                            </Dropdown.Trigger>
                            <Dropdown.Popover
                              placement="bottom start"
                              className="min-w-36 rounded-xl border border-ap-border bg-ap-surface shadow-xl p-0"
                            >
                              <Dropdown.Menu className="gap-0.5">
                                {(["ADMIN", "STAFF"] as const).map((r) => (
                                  <Dropdown.Item
                                    key={r}
                                    textValue={roleLabels[r]}
                                    onAction={() =>
                                      handleUpdateRole(member.id, r)
                                    }
                                    className={`rounded-lg data-hovered:bg-ap-accent/10 data-hovered:text-ap-accent transition-colors cursor-pointer ${
                                      member.role === r
                                        ? "bg-ap-accent/10 text-ap-accent font-semibold"
                                        : ""
                                    }`}
                                  >
                                    <Label className="text-xs font-medium cursor-pointer">
                                      {roleLabels[r]}
                                    </Label>
                                  </Dropdown.Item>
                                ))}
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown>
                        ) : isMemberOwner ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            Owner
                          </span>
                        ) : isMemberAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            Administrator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400">
                            Staff Member
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${member.isActive ? "bg-ap-success/10 text-ap-success" : "bg-ap-danger/10 text-ap-danger"}`}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-ap-muted">
                        {member.createdAt
                          ? new Date(member.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {canManageMember && (
                          <div className="inline-block text-left">
                            <Dropdown>
                              <Dropdown.Trigger
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ap-muted hover:bg-ap-field-background hover:text-ap-foreground transition-colors outline-none cursor-pointer"
                                aria-label="Member Options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Dropdown.Trigger>
                              <Dropdown.Popover
                                placement="bottom end"
                                className="min-w-48 rounded-xl border border-ap-border bg-ap-surface shadow-xl p-1.5"
                              >
                                <Dropdown.Menu className="gap-1 p-0">
                                  <Dropdown.Item
                                    key="toggle-status"
                                    textValue={
                                      member.isActive
                                        ? "Deactivate Account"
                                        : "Activate Account"
                                    }
                                    onAction={() => {
                                      toggleStatusMutation.mutate({
                                        id: member.id,
                                        isActive: !member.isActive,
                                      });
                                    }}
                                    className="rounded-lg data-hovered:bg-ap-accent/10 data-hovered:text-ap-accent transition-colors cursor-pointer"
                                  >
                                    <Label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                                      {member.isActive ? (
                                        <>
                                          <UserX className="w-4 h-4 text-ap-warning shrink-0" />
                                          <span>Deactivate Account</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-4 h-4 text-ap-success shrink-0" />
                                          <span>Activate Account</span>
                                        </>
                                      )}
                                    </Label>
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    key="delete"
                                    textValue="Delete Member"
                                    variant="danger"
                                    onAction={() => {
                                      handleDeleteMember(
                                        member.id,
                                        member.name,
                                      );
                                    }}
                                    className="rounded-lg text-ap-danger data-hovered:bg-ap-danger/10 transition-colors cursor-pointer"
                                  >
                                    <Label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer text-ap-danger">
                                      <Trash2 className="w-4 h-4 shrink-0" />
                                      <span>Delete Member</span>
                                    </Label>
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              </Dropdown.Popover>
                            </Dropdown>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="rounded-2xl bg-ap-surface border border-ap-border">
              <Modal.Header className="border-b border-ap-border pb-3">
                <Modal.Heading className="text-lg font-bold">
                  Add Team Member
                </Modal.Heading>
              </Modal.Header>
              <form onSubmit={handleAddMember} className="mt-4">
                <Modal.Body className="space-y-4">
                  {inviteError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-ap-danger/10 text-ap-danger text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {inviteError}
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ap-foreground">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteForm.name}
                      onChange={(e) =>
                        setInviteForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3.5 py-2.5 text-sm text-ap-foreground placeholder:text-ap-muted focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft outline-none transition"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ap-foreground">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteForm.email}
                      onChange={(e) =>
                        setInviteForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3.5 py-2.5 text-sm text-ap-foreground placeholder:text-ap-muted focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft outline-none transition"
                      placeholder="staff@example.com"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ap-foreground">
                      Initial Password{" "}
                      <span className="text-ap-muted font-normal">
                        (Default: prassword)
                      </span>
                    </label>
                    <input
                      type="password"
                      value={inviteForm.password}
                      onChange={(e) =>
                        setInviteForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-ap-border bg-ap-field-background px-3.5 py-2.5 text-sm text-ap-foreground placeholder:text-ap-muted focus:border-ap-accent focus:ring-2 focus:ring-ap-accent-soft outline-none transition"
                      placeholder="Enter a secure password"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-ap-foreground">
                      Role
                    </label>
                    <Select
                      options={[
                        { value: "STAFF", label: "Staff Member" },
                        {
                          value: "ADMIN",
                          label: "Administrator",
                          disabled: !isCurrentOwner,
                        },
                      ]}
                      value={inviteForm.role}
                      onChange={(value) =>
                        setInviteForm((prev) => ({
                          ...prev,
                          role: value,
                        }))
                      }
                      className="w-full rounded-xl bg-ap-field-background text-sm text-ap-foreground has-data-[pressed=true]:border has-data-[pressed=true]:border-ap-accent has-data-[pressed=true]:ring-2 has-data-[pressed=true]:ring-ap-accent-soft outline-none transition"
                    ></Select>
                  </div>
                </Modal.Body>
                <Modal.Footer className="border-t border-ap-border pt-4">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="rounded-xl border border-ap-border px-4 py-2 text-sm font-medium hover:bg-ap-field-background transition"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    isDisabled={createMutation.isPending}
                    isPending={createMutation.isPending}
                    className="rounded-xl bg-ap-accent px-4 py-2 text-sm font-semibold text-ap-accent-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {createMutation.isPending ? (
                      <Spinner color="current" size="sm" />
                    ) : (
                      "Create Member"
                    )}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </Content>
  );
}
