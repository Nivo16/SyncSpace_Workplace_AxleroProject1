import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import "./UsersPanel.css"

function getUserId() {
try {
const token = window.localStorage.getItem("syncspace-token")


if (!token) return null

const payload = JSON.parse(atob(token.split(".")[1]))

return payload.userId || payload.id || payload._id || null


} catch {
return null
}
}

function UsersPanel({ workspace, onAddUser }) {
const [name, setName] = useState("")
const [onlineUsers, setOnlineUsers] = useState([])

const users = workspace?.collaboratorList || []

useEffect(() => {
if (!workspace?.workspaceId) return


const socket = io("http://localhost:5000", { auth: { token: window.localStorage.getItem("syncspace-token") } })
const currentUserId = getUserId()

const currentUser = users.find(
  user => String(user.id) === String(currentUserId)
)

socket.on("connect", () => {
  socket.emit("join-room", {
    roomId: String(workspace.workspaceId),
    userId: currentUserId || socket.id,
    name: currentUser?.name || "User"
  })
})

socket.on("presence-update", users => {
  setOnlineUsers(users)
})

return () => {
  socket.emit("leave-room")
  socket.disconnect()
}


}, [workspace?.workspaceId])

const handleAdd = event => {
event.preventDefault()


const trimmedName = name.trim()

if (!trimmedName) return

onAddUser({
  id: `local-${Date.now()}`,
  name: trimmedName,
  role: "Member",
  status: "offline"
})

setName("")


}

const isUserOnline = user => {
return onlineUsers.some(
onlineUser =>
String(onlineUser.userId) === String(user.id)
)
}

return ( <div className="users-panel"> <div className="users-header"> <h2>Users</h2> <span>{users.length} collaborators</span> </div>


  <form className="add-user-form" onSubmit={handleAdd}>
    <input
      value={name}
      onChange={event => setName(event.target.value)}
      placeholder="Add collaborator by name"
      aria-label="Collaborator name"
    />

    <button type="submit">
      Add user
    </button>
  </form>

  <div className="users-list">
    {users.map(user => {
      const online = isUserOnline(user)

      return (
        <div className="user-card" key={user.id}>
          <div className="user-avatar">
            {(user.name || "?").charAt(0).toUpperCase()}
          </div>

          <div className="user-info">
            <div className="user-name">
              {user.name || "Unknown User"}

              {user.role === "Owner" && (
                <span className="you-label">
                  You
                </span>
              )}
            </div>

            <div className="user-role">
              {user.role}
            </div>
          </div>

          <div className={`user-status ${online ? "online" : "offline"}`}>
            <span className="status-dot"></span>
            {online ? "Online" : "Offline"}
          </div>
        </div>
      )
    })}
  </div>
</div>


)
}

export default UsersPanel
