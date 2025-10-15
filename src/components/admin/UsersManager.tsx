import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { Pencil, Trash2, Save, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types.ts";

type AppRole = Database['public']['Enums']['app_role'];
type UserProfile = Database['public']['Tables']['users_profile']['Row'];

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  username?: string;
  user_role: AppRole;
}

export const UsersManager = () => {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [tempUsername, setTempUsername] = useState<string>("");

  const { data: users, error: usersError, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Fetch all users via RPC function
      const { data: authUsers, error: authError } = await supabase
        .rpc('get_all_users');
        
      if (authError) {
        throw authError;
      }
      
      if (!authUsers || authUsers.length === 0) {
        return [];
      }
      
      // Fetch user profiles with explicit column references
      const userIds = authUsers.map((u: { id: string }) => u.id);
      const { data: profiles, error: profilesError } = await supabase
        .from('users_profile')
        .select('id, username')
        .in('id', userIds);
        
      if (profilesError) {
        throw profilesError;
      }
      
      // Fetch user roles with explicit column references
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
        
      if (rolesError) {
        throw rolesError;
      }
      
      // Combine all data with explicit mapping
      const usersWithProfiles: UserWithProfile[] = authUsers.map((user: { id: string; email: string; created_at: string }) => {
        const profile = profiles?.find(p => p.id === user.id);
        const role = roles?.find(r => r.user_id === user.id);
        
        return {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          username: profile?.username || user.email,
          user_role: role?.role || 'user'
        };
      });
      
      return usersWithProfiles;
    },
    retry: 2,
  });

  const updateUsernameMutation = useMutation({
    mutationFn: async ({ userId, username }: { userId: string; username: string }) => {
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('users_profile')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('users_profile')
          .update({
            username: username,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('users_profile')
          .insert({
            id: userId,
            username: username,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("Username đã được cập nhật! ✨");
      setEditingUser(null);
      setTempUsername("");
    },
    onError: (error) => {
      toast.error(`Lỗi cập nhật username: ${error.message}`);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role: role
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("Vai trò người dùng đã được cập nhật! 👤");
    },
    onError: (error) => {
      toast.error(`Lỗi cập nhật vai trò: ${error.message}`);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .rpc('delete_user', { user_id: userId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("Người dùng đã được xóa! 🗑️");
    },
    onError: (error) => {
      toast.error(`Lỗi xóa người dùng: ${error.message}`);
    },
  });

  const handleEditUsername = (user: UserWithProfile) => {
    setEditingUser(user.id);
    setTempUsername(user.username || user.email);
  };

  const handleSaveUsername = (userId: string) => {
    if (tempUsername.trim()) {
      updateUsernameMutation.mutate({ userId, username: tempUsername.trim() });
    } else {
      setEditingUser(null);
      setTempUsername("");
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setTempUsername("");
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (confirm(`Bạn có chắc muốn xóa người dùng "${email}"? Hành động này không thể hoàn tác!`)) {
      deleteUserMutation.mutate(userId);
    }
  };


  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-display text-primary font-bold">Quản Lý Người Dùng</h2>
      
      {usersError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Lỗi khi tải danh sách người dùng: {usersError.message}</p>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-700">Tìm thấy {users?.length || 0} người dùng</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải danh sách người dùng...</p>
        </div>
      ) : users && users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Không tìm thấy người dùng nào.</p>
        </div>
      ) : (
        <div className="bg-card rounded-3xl shadow-cute overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Số Điện Thoại</TableHead>
                <TableHead>Vai Trò</TableHead>
                <TableHead>Tham Gia</TableHead>
                <TableHead>Hành Động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    {editingUser === user.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={tempUsername}
                          onChange={(e) => setTempUsername(e.target.value)}
                          className="w-32"
                          placeholder="Username"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveUsername(user.id)}
                          disabled={updateUsernameMutation.isPending}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{user.username}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditUsername(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>Chưa cập nhật</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.user_role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.user_role === 'admin' ? 'Quản Trị' : 'Người Dùng'}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Select
                        value={user.user_role}
                        onValueChange={(value) => updateRoleMutation.mutate({ userId: user.id, role: value as AppRole })}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Người Dùng</SelectItem>
                          <SelectItem value="admin">Quản Trị</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={deleteUserMutation.isPending}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};