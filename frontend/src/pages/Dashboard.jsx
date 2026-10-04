import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { WelcomeSection } from "../components/dashboard/WelcomeSection";
import { StatsCard } from "../components/dashboard/StatsCard";
import { WorkspaceGrid } from "../components/dashboard/WorkspaceGrid";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { CreateWorkspaceModal } from "../components/modals/CreateWorkspaceModal";
import { JoinWorkspaceModal } from "../components/modals/JoinWorkspaceModal";
import { EditWorkspaceModal } from "../components/modals/EditWorkspaceModal";
import { initialActivities } from "../data/mockData";
import { getWorkspaceStore, saveActivity, saveWorkspace, subscribeToWorkspaceStore } from "../data/workspaceStore";
import { getWorkspacePath } from "../types/workspace";
import { apiClient } from "../api/client";

export const Dashboard = ({ readOnly = false }) => {
  const navigate = useNavigate();
  const [store, setStore] = useState(() => getWorkspaceStore());
  const [workspaces, setWorkspaces] = useState([]);
  const [activities, setActivities] = useState(() => {
    const saved = getWorkspaceStore().activities;
    return saved.length > 0 ? saved : initialActivities;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState(null);
  const [loading, setLoading] = useState(!readOnly);
  const [error, setError] = useState("");

  const loadWorkspaces = async () => {
    if (readOnly) {
      setLoading(false);
      return;
    }

    try {
      setError("");
      const data = await apiClient.getWorkspaces();
      setWorkspaces(data.workspaces || []);
    } catch (err) {
      console.error("Failed to load workspaces:", err);
      setError(err.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, [readOnly]);

  useEffect(() => subscribeToWorkspaceStore(() => {
    const next = getWorkspaceStore();
    setStore(next);
    setActivities(next.activities);
  }), []);

  const handleCreateWorkspace = async (newWsData) => {
    try {
      setError("");

      const data = await apiClient.createWorkspace({
        name: newWsData.name,
        description: newWsData.description || "",
        type: newWsData.type || "Code + Whiteboard",
        kind: newWsData.kind || "general"
      });

      const newWs = data.workspace;

      setWorkspaces((prev) => [newWs, ...prev]);

      saveWorkspace(newWs);

      const newActivity = {
        id: Date.now(),
        message: `You created ${newWs.name}`,
        user: "You",
        time: "Just now",
        type: "create",
        workspaceName: newWs.name
      };

      setActivities((prev) => [newActivity, ...prev]);
      saveActivity(newActivity);

      setCreateModalOpen(false);

      if (!readOnly) {
        navigate(getWorkspacePath(newWs));
      }
    } catch (err) {
      console.error("Create workspace error:", err);
      setError(err.message || "Failed to create workspace");
    }
  };

  const handleJoinWorkspace = async (code) => {
    try {
      setError("");

      const data = await apiClient.joinWorkspace(code);

      const joinedWorkspace = data.workspace;

      setWorkspaces((prev) => {
        const exists = prev.some((workspace) => workspace.id === joinedWorkspace.id);

        if (exists) {
          return prev.map((workspace) =>
            workspace.id === joinedWorkspace.id ? joinedWorkspace : workspace
          );
        }

        return [joinedWorkspace, ...prev];
      });

      saveWorkspace(joinedWorkspace);

      const newActivity = {
        id: Date.now(),
        message: `You joined workspace ${joinedWorkspace.name}`,
        user: "You",
        time: "Just now",
        type: "join",
        workspaceName: joinedWorkspace.name
      };

      setActivities((prev) => [newActivity, ...prev]);
      saveActivity(newActivity);

      setJoinModalOpen(false);

      navigate(getWorkspacePath(joinedWorkspace));

      return true;
    } catch (err) {
      console.error("Join workspace error:", err);
      setError(err.message || "Failed to join workspace");
      return false;
    }
  };

  const handleUpdateWorkspace = async (updatedWorkspace) => {
    try {
      setError("");

      const data = await apiClient.updateWorkspace(
        updatedWorkspace.id,
        updatedWorkspace
      );

      const savedWorkspace = data.workspace;

      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === savedWorkspace.id ? savedWorkspace : workspace
        )
      );

      saveWorkspace(savedWorkspace);

      const newActivity = {
        id: Date.now(),
        message: `You updated ${savedWorkspace.name}`,
        user: "You",
        time: "Just now",
        type: "edit",
        workspaceName: savedWorkspace.name
      };

      setActivities((prev) => [newActivity, ...prev]);
      saveActivity(newActivity);

      setWorkspaceToEdit(null);
    } catch (err) {
      console.error("Update workspace error:", err);
      setError(err.message || "Failed to update workspace");
    }
  };

  const activeWorkspaces = workspaces.filter(
    (workspace) => workspace.status === "Active"
  ).length;

  const activeSessions = store.sessions.filter(
    (session) => !session.endedAt
  ).length;

  const dashboardStats = [
    {
      id: "active-workspaces",
      label: "Active Workspaces",
      value: activeWorkspaces,
      change: `${workspaces.length} stored`,
      changeType: "positive",
      iconName: "FolderKanban"
    },
    {
      id: "total-collaborators",
      label: "Collaborators",
      value: workspaces.reduce(
        (total, workspace) => total + (workspace.collaborators || 0),
        0
      ),
      change: `${activities.length} recorded events`,
      changeType: "positive",
      iconName: "Users"
    },
    {
      id: "recent-sessions",
      label: "Recent Sessions",
      value: store.sessions.length,
      change: `${activities.length} activity records`,
      changeType: "neutral",
      iconName: "Clock"
    },
    {
      id: "active-now",
      label: "Active Now",
      value: activeSessions,
      change: activeSessions > 0 ? "Live session stored" : "No open sessions",
      changeType: activeSessions > 0 ? "positive" : "neutral",
      iconName: "Zap"
    }
  ];

  return (
    <DashboardLayout
      title="Dashboard"
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    >
      <WelcomeSection
        onCreateWorkspace={() => setCreateModalOpen(true)}
        onJoinWorkspace={() => setJoinModalOpen(true)}
        readOnly={readOnly}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat) => (
          <StatsCard key={stat.id} stat={stat} />
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center">
          Loading workspaces...
        </div>
      ) : (
        <WorkspaceGrid
          workspaces={workspaces}
          onCreateWorkspace={() => setCreateModalOpen(true)}
          onEditWorkspace={setWorkspaceToEdit}
          searchQuery={searchQuery}
          readOnly={readOnly}
        />
      )}

      <RecentActivity activities={activities} />

      {!readOnly && (
        <>
          <CreateWorkspaceModal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            onCreate={handleCreateWorkspace}
          />

          <JoinWorkspaceModal
            isOpen={joinModalOpen}
            onClose={() => setJoinModalOpen(false)}
            onJoin={handleJoinWorkspace}
          />

          <EditWorkspaceModal
            workspace={workspaceToEdit}
            onClose={() => setWorkspaceToEdit(null)}
            onSave={handleUpdateWorkspace}
          />
        </>
      )}
    </DashboardLayout>
  );
};