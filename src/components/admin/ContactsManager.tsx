import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { Eye, Mail, Archive } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types.ts";

type Contact = Tables<"contacts">;

export const ContactsManager = () => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: contacts } = useQuery({
    queryKey: ['admin-contacts', statusFilter],
    queryFn: async () => {
      let query = supabase.from('contacts').select('*').order('created_at', { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('contacts').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contacts'] });
      toast.success("Trạng thái đã được cập nhật! ✨");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'read': return 'bg-yellow-100 text-yellow-700';
      case 'replied': return 'bg-green-100 text-green-700';
      case 'archived': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Mới';
      case 'read': return 'Đã đọc';
      case 'replied': return 'Đã trả lời';
      case 'archived': return 'Đã lưu trữ';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-display text-primary font-bold">Quản Lý Liên Hệ</h2>
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="new">Mới</SelectItem>
              <SelectItem value="read">Đã đọc</SelectItem>
              <SelectItem value="replied">Đã trả lời</SelectItem>
              <SelectItem value="archived">Đã lưu trữ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-3xl shadow-cute overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tin nhắn</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày gửi</TableHead>
              <TableHead>Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts?.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">{contact.name}</TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell className="max-w-xs truncate">{contact.message}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(contact.status)}`}>
                    {getStatusText(contact.status)}
                  </span>
                </TableCell>
                <TableCell>{new Date(contact.created_at).toLocaleDateString('vi-VN')}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setSelectedContact(contact)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="font-display text-2xl text-primary font-bold">
                            Chi Tiết Liên Hệ
                          </DialogTitle>
                        </DialogHeader>
                        {selectedContact && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Tên</label>
                              <p className="text-lg font-semibold">{selectedContact.name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Email</label>
                              <p className="text-lg">{selectedContact.email}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Tin nhắn</label>
                              <p className="text-lg whitespace-pre-wrap bg-secondary/20 p-4 rounded-lg">
                                {selectedContact.message}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Ngày gửi</label>
                              <p className="text-lg">{new Date(selectedContact.created_at).toLocaleString('vi-VN')}</p>
                            </div>
                            <div className="flex gap-2 pt-4">
                              <Select 
                                value={selectedContact.status} 
                                onValueChange={(value) => updateStatusMutation.mutate({ id: selectedContact.id, status: value })}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">Mới</SelectItem>
                                  <SelectItem value="read">Đã đọc</SelectItem>
                                  <SelectItem value="replied">Đã trả lời</SelectItem>
                                  <SelectItem value="archived">Đã lưu trữ</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button 
                                variant="outline" 
                                onClick={() => window.open(`mailto:${selectedContact.email}`, '_blank')}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Trả lời
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {contacts?.length === 0 && (
        <div className="text-center py-12">
          <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Chưa có tin nhắn liên hệ nào</p>
        </div>
      )}
    </div>
  );
};
