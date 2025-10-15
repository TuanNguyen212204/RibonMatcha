import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { Eye, MapPin, Phone, Calendar, Clock, Package, User, Truck, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Database, Tables } from "@/integrations/supabase/types.ts";

type OrderStatus = Database['public']['Enums']['order_status'];
type Order = Tables<'orders'> & {
  order_items: Array<{
    id: string;
    quantity: number;
    products: {
      id: string;
      name: string;
      price: number;
      image_url: string;
    };
  }>;
};

export const OrdersManager = () => {
  const queryClient = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);

  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            products (
              id,
              name,
              price,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      return data;
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

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Xóa order_items trước (do foreign key constraint)
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Sau đó xóa order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success("Order deleted! 🗑️");
    },
  });

  const deleteMultipleOrdersMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      // Xóa order_items trước
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Sau đó xóa orders
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrders([]);
      toast.success(`${selectedOrders.length} orders deleted! 🗑️`);
    },
  });

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders?.map(order => order.id) || []);
    } else {
      setSelectedOrders([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    deleteMultipleOrdersMutation.mutate(selectedOrders);
  };


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

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-display text-primary font-bold">Quản Lý Đơn Hàng</h2>
        
        <div className="flex gap-3">
          {selectedOrders.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={deleteMultipleOrdersMutation.isPending}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Xóa {selectedOrders.length} đơn đã chọn
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-3xl shadow-cute overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedOrders.length === orders?.length && orders.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300"
                />
              </TableHead>
              <TableHead>Mã Đơn Hàng</TableHead>
              <TableHead>Khách Hàng</TableHead>
              <TableHead>Tổng Tiền</TableHead>
              <TableHead>Thanh Toán</TableHead>
              <TableHead>Trạng Thái</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Xem Chi Tiết</TableHead>
              <TableHead>Hành Động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.customer_identifier || 'Guest'}</div>
                    <div className="text-xs text-muted-foreground">{order.phone}</div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewOrderDetails(order)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Chi Tiết
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
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
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteOrderMutation.mutate(order.id)}
                      disabled={deleteOrderMutation.isPending}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Xóa đơn hàng"
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

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-primary font-bold flex items-center gap-2">
              <Eye className="w-6 h-6" />
              Chi Tiết Đơn Hàng #{selectedOrder?.id?.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Khách Hàng</span>
                  </div>
                  <p className="font-semibold">{selectedOrder.customer_identifier || 'Guest'}</p>
                  <p className="text-sm text-blue-600">{selectedOrder.phone}</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Tổng Tiền</span>
                  </div>
                  <p className="font-bold text-base">{selectedOrder.total_price.toLocaleString('vi-VN')} VNĐ</p>
                  <p className="text-sm text-green-600">{selectedOrder.payment_method}</p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-800">Trạng Thái</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Sản Phẩm Đã Đặt
                </h3>
                <div className="space-y-3">
                  {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                    selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                      <img 
                        src={item.products?.image_url || '/placeholder.svg'} 
                        alt={item.products?.name || 'Sản phẩm'} 
                        className="w-20 h-20 rounded-xl object-cover" 
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{item.products?.name || 'Sản phẩm không xác định'}</h4>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-gray-600">Số lượng:</span>
                            <span className="font-medium ml-2">{item.quantity}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Đơn giá:</span>
                            <span className="font-medium ml-2">{item.products?.price?.toLocaleString('vi-VN')} VNĐ</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-gray-600">Thành tiền:</span>
                          <span className="font-bold text-green-600 ml-2">
                            {((item.products?.price || 0) * item.quantity).toLocaleString('vi-VN')} VNĐ
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Không có sản phẩm nào trong đơn hàng này
                    </div>
                  )}
                </div>
              </div>

              {/* Order Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Thông Tin Đơn Hàng
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">Ngày đặt hàng</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {new Date(selectedOrder.created_at).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">Giờ đặt hàng</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {new Date(selectedOrder.created_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Thông Tin Giao Hàng
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <span className="font-medium text-orange-800">Địa chỉ giao hàng:</span>
                      <p className="text-orange-700 mt-1">{selectedOrder.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <div>
                      <span className="font-medium text-blue-800">Số điện thoại:</span>
                      <p className="text-blue-700 mt-1">{selectedOrder.phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
