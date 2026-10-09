import { useAuth } from "../context/AuthContext";
import "./UsersPanel.css";

function UsersPanel({ workspace, canManage, onRoleChange, onRemoveUser }) {
  const { user: currentUser } = useAuth();
  const storedUsers = workspace.collaboratorList || [];
  const hasCreator = storedUsers.some((user) => String(user.id) === String(workspace.owner));
  const users = hasCreator || !workspace.ownerName
    ? storedUsers
    : [{ id: workspace.owner, name: workspace.ownerName, role: "owner" }, ...storedUsers];

  return (
    <div className="users-panel">
      <div className="users-header">
        <h2>Users</h2>
        <span>{users.length} collaborators</span>
      </div>

      <div className="users-list">
        {users.map((workspaceUser) => {
          const isCreator = String(workspaceUser.id) === String(workspace.owner);
          const isOwner = workspaceUser.role?.toLowerCase() === "owner";
          return (
            <div className="user-card" key={workspaceUser.id}>
            <div className="user-avatar">
              {workspaceUser.name.charAt(0)}
            </div>

            <div className="user-info">
              <div className="user-name">
                {workspaceUser.name}

                {(isCreator || isOwner) && (
                  <span className="you-label">
                    {isCreator ? "Creator" : "Owner"}
                  </span>
                )}
              </div>

              <div className="user-role">
                {isCreator ? "Creator" : isOwner ? "Owner" : "Member"}
              </div>
            </div>

            <div className="user-status online">
              <span className="status-dot"></span>

              {String(workspaceUser.id) === String(currentUser?.id || currentUser?._id) ? "You" : "Member"}
            </div>
            {canManage && !isCreator && (
              <div className="member-actions">
                <select
                  aria-label={`Role for ${workspaceUser.name}`}
                  value={isOwner ? "owner" : "member"}
                  onChange={(event) => onRoleChange(workspaceUser, event.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="owner">Owner access</option>
                </select>
                <button type="button" onClick={() => onRemoveUser(workspaceUser)} aria-label={`Remove ${workspaceUser.name}`}>
                  Remove
                </button>
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UsersPanel;