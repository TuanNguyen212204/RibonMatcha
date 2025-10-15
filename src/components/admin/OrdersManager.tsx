import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types.ts";

type OrderStatus = Database['public']['Enums']['order_status'];

export const OrdersManager = () => {
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch user info separately
      const ordersWithProfiles = await Promise.all(
        (data || []).map(async (order) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, email')
            .eq('id', order.user_id)
            .single();
          return { ...order, profile };
        })
      );
      
      return ordersWithProfiles;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      
      // If order is completed, deduct ingredients from inventory
      if (status === 'Completed') {
        try {
          // Get order items with product ingredients
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('quantity, product_id')
            .eq('order_id', orderId);
          
          if (orderItems && orderItems.length > 0) {
            // Get product ingredients
            const productIds = orderItems.map(item => item.product_id);
            const { data: productIngredients } = await supabase
              .from('product_ingredients')
              .select('*')
              .in('product_id', productIds);
            
            if (productIngredients) {
              // Calculate total ingredients needed
              const ingredientUsage: Record<string, number> = {};
              
              orderItems.forEach(orderItem => {
                const requiredIngredients = productIngredients.filter(
                  pi => pi.product_id === orderItem.product_id
                );
                
                requiredIngredients.forEach(pi => {
                  const totalNeeded = pi.quantity * orderItem.quantity;
                  ingredientUsage[pi.ingredient_id] = (ingredientUsage[pi.ingredient_id] || 0) + totalNeeded;
                });
              });
              
              // Update ingredient stock
              for (const [ingredientId, quantityUsed] of Object.entries(ingredientUsage)) {
                const { data: ingredient } = await supabase
                  .from('ingredients')
                  .select('stock_quantity')
                  .eq('id', ingredientId)
                  .single();
                
                if (ingredient) {
                  await supabase
                    .from('ingredients')
                    .update({ stock_quantity: ingredient.stock_quantity - quantityUsed })
                    .eq('id', ingredientId);
                }
              }
            }
          }
        } catch (ingredientError) {
          // Don't throw error, just log it
        }
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      
      if (status === 'Completed') {
        toast.success("Đơn hàng hoàn thành và nguyên liệu đã được trừ! ✅");
      } else {
        toast.success("Trạng thái đơn hàng đã được cập nhật! 📦");
      }
    },
  });

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      Pending: 'bg-yellow-100 text-yellow-700',
      Preparing: 'bg-blue-100 text-blue-700',
      Shipping: 'bg-purple-100 text-purple-700',
      Delivered: 'bg-green-100 text-green-700',
      Failed: 'bg-red-100 text-red-700',
      Completed: 'bg-green-100 text-green-700',
    };
    return colors[status];
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-display text-primary font-bold">Quản Lý Đơn Hàng</h2>

      <div className="bg-card rounded-3xl shadow-cute overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã Đơn Hàng</TableHead>
              <TableHead>Khách Hàng</TableHead>
              <TableHead>Tổng Tiền</TableHead>
              <TableHead>Thanh Toán</TableHead>
              <TableHead>Trạng Thái</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Hành Động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.profile?.username || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">{order.profile?.email}</div>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">{order.total_price.toLocaleString('vi-VN')} VNĐ</TableCell>
                <TableCell>{order.payment_method}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(value) => updateStatusMutation.mutate({ orderId: order.id, status: value as OrderStatus })}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Preparing">Preparing</SelectItem>
                      <SelectItem value="Shipping">Shipping</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
