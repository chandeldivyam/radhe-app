// ./apps/frontend/src/features/users/pages/UserListPage.tsx
import { useZero } from "@/features/sync/use-zero";
import { useQuery } from "@rocicorp/zero/react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreateUserForm } from "../components/CreateUserForm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function UserListPage() {
  const z = useZero();
  const usersQueryResult = useQuery(z?.query.user);
  const users = usersQueryResult[0];
  const [open, setOpen] = useState(false);

  const handleToggleActive = (userId: string, currentStatus: boolean) => {
    z.mutate.user.update({
      userId,
      isActive: !currentStatus
    });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Team Members</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Invite User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <CreateUserForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">User</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.userId} className="hover:bg-muted/50 transition-colors">
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                        {user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs",
                      user.isActive
                        ? "bg-primary/10 text-primary" // Use primary color with low opacity for background
                        : "bg-muted text-muted-foreground"
                    )}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={(checked: boolean) => handleToggleActive(user.userId, !checked)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default UserListPage;
