import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  UserMinus,
  Shield,
  ShieldOff,
  Edit2,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badge";
import { UserSearchModal } from "@/components/ui/UserSearchModal";
import { useAuth } from "@/hooks/useAuth";
import { useList } from "@/hooks/useList";
import { ROUTES } from "@/config/routes";
import type { UserProfile } from "@/types/user.types";

export function ListDetailView() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    list,
    members,
    isLoading,
    error,
    isOwner,
    canManage,
    addMember,
    removeMember,
    addAdmin,
    removeAdmin,
    updateList,
    deleteList,
  } = useList(listId, user?.uid);

  // Modal states
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(
    null,
  );
  const [showPromoteAdminConfirm, setShowPromoteAdminConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Form states
  const [editName, setEditName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAddMember = async (selectedUser: UserProfile) => {
    setActionError(null);
    try {
      await addMember(selectedUser.id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to add member",
      );
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setActionError(null);
    try {
      await removeMember(userId);
      setShowRemoveConfirm(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to remove member",
      );
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    setActionError(null);
    try {
      await addAdmin(userId);
      setShowPromoteAdminConfirm(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to promote to admin",
      );
    }
  };

  const handleDemoteAdmin = async (userId: string) => {
    setActionError(null);
    try {
      await removeAdmin(userId);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to remove admin status",
      );
    }
  };

  const handleUpdateName = async () => {
    if (!editName.trim()) return;

    setIsUpdating(true);
    setActionError(null);
    try {
      await updateList(editName.trim());
      setShowEditName(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update list name",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteList();
      navigate(ROUTES.LISTS, { replace: true });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete list",
      );
      setIsDeleting(false);
    }
  };

  const openEditName = () => {
    setEditName(list?.name || "");
    setShowEditName(true);
  };

  // Get member IDs for exclusion in search
  const existingMemberIds = members.map((m) => m.id);

  if (isLoading) {
    return (
      <PageLayout showBack showBottomNav={false}>
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </PageLayout>
    );
  }

  if (error || !list) {
    return (
      <PageLayout showBack showBottomNav={false}>
        <div className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">
            {error?.message || "List not found"}
          </p>
          <Button onClick={() => navigate(ROUTES.LISTS)} className="mt-4">
            Back to Lists
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={list.name} showBack showBottomNav={false}>
      <div className="space-y-6">
        {/* Error display */}
        {actionError && (
          <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              {actionError}
            </p>
          </div>
        )}

        {/* List Info Card */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {list.name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={openEditName}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Edit name"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                  title="Delete list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* Members Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-slate-900 dark:text-slate-100">
              Members
            </h3>
            {canManage && (
              <Button onClick={() => setShowAddMember(true)} size="small">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            )}
          </div>

          {members.length > 0 ? (
            <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0">
              {members.map((member) => {
                const isMemberAdmin = list.adminIds.includes(member.id);

                return (
                  <div key={member.id} className="flex items-center gap-3 p-4">
                    <Avatar
                      src={member.photoUrl}
                      userId={member.id}
                      displayName={member.displayName}
                      alt={member.displayName}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium text-slate-900 dark:text-slate-100 truncate">
                          {member.displayName}
                        </span>
                        {member.id === list.ownerId ? (
                          <RoleBadge role="owner" />
                        ) : isMemberAdmin ? (
                          <RoleBadge role="admin" />
                        ) : null}
                      </div>
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-1">
                        {/* Toggle admin (owner only, and not for the owner themselves) */}
                        {isOwner && member.id !== list.ownerId && (
                          <button
                            onClick={() => {
                              if (isMemberAdmin) {
                                handleDemoteAdmin(member.id);
                              } else {
                                setShowPromoteAdminConfirm({
                                  id: member.id,
                                  name: member.displayName,
                                });
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              isMemberAdmin
                                ? "text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                            title={
                              isMemberAdmin ? "Remove admin" : "Make admin"
                            }
                          >
                            {isMemberAdmin ? (
                              <ShieldOff className="w-4 h-4" />
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {/* Remove member (not for the owner themselves) */}
                        {member.id !== list.ownerId && (
                          <button
                            onClick={() => setShowRemoveConfirm(member.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                            title="Remove member"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          ) : (
            <EmptyState
              title="No members yet"
              description="Add members to this list to quickly invite them to events"
              action={
                canManage
                  ? {
                      label: "Add Member",
                      onClick: () => setShowAddMember(true),
                    }
                  : undefined
              }
            />
          )}
        </section>
      </div>

      {/* Add Member Modal */}
      <UserSearchModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        onSelect={handleAddMember}
        title="Add Member"
        excludeUserIds={existingMemberIds}
      />

      {/* Edit Name Modal */}
      <Modal
        isOpen={showEditName}
        onClose={() => setShowEditName(false)}
        title="Edit List Name"
      >
        <div className="space-y-4">
          <Input
            label="List Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Enter list name"
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowEditName(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateName}
              loading={isUpdating}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete List"
        message={`Are you sure you want to delete "${list.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      />

      {/* Remove Member Confirmation Modal */}
      <ConfirmModal
        isOpen={!!showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(null)}
        onConfirm={() =>
          showRemoveConfirm && handleRemoveMember(showRemoveConfirm)
        }
        title="Remove Member"
        message="Are you sure you want to remove this member from the list?"
        confirmLabel="Remove"
        variant="danger"
      />

      {/* Promote to Admin Confirmation Modal */}
      <ConfirmModal
        isOpen={!!showPromoteAdminConfirm}
        onClose={() => setShowPromoteAdminConfirm(null)}
        onConfirm={() =>
          showPromoteAdminConfirm &&
          handlePromoteToAdmin(showPromoteAdminConfirm.id)
        }
        title="Make Admin"
        message={`Are you sure you want to make ${showPromoteAdminConfirm?.name || "this member"} an admin? They will be able to view the list and add or remove members.`}
        confirmLabel="Make Admin"
        variant="default"
      />
    </PageLayout>
  );
}
