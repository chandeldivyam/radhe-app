// frontend/src/features/users/pages/UserListPage.tsx
import { useZero } from "@/features/sync/use-zero";
import { useQuery } from "@rocicorp/zero/react";
import { Button } from "@/components/ui/button";

function UserListPage() {
  const z = useZero();
  const usersQueryResult = useQuery(z.query.user);
  
  if (!Array.isArray(usersQueryResult)) {
    return <div>Loading users...</div>;
  }
  
  const users = usersQueryResult[0];
  
  const handleToggleActive = (userId: string, currentStatus: boolean) => {
    z.mutate.user.update({
      userId,
      isActive: !currentStatus
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Users</h1>
      {users.map(user => (
        <div key={user.userId} style={{ marginBottom: 20, padding: 15, border: '1px solid #ddd', borderRadius: 5 }}>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <div>
            <strong>User ID:</strong> {user.userId}
          </div>
          <div>
            <strong>Organization ID:</strong> {user.organizationId}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 10 }}>
            <strong>Status:</strong> 
            <span style={{ marginLeft: 5 }}>{user.isActive ? 'Active' : 'Inactive'}</span>
            <Button onClick={() => handleToggleActive(user.userId, user.isActive)}>
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <button 
              onClick={() => handleToggleActive(user.userId, user.isActive)}
              style={{ 
                marginLeft: 10, 
                backgroundColor: user.isActive ? '#f44336' : '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              {user.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default UserListPage;