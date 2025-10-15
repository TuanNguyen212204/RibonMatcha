import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Package, MapPin, Phone, Calendar, Clock, User, Truck, CheckCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type OrderStatus = "Pending" | "Preparing" | "Shipping" | "Delivered" | "Failed" | "Completed";

interface Order {
  id: string;
  customer_identifier: string;
  total_price: number;
  address: string;
  phone: string;
  payment_method: string;
  notes: string | null;
  status: OrderStatus;
  created_at: string;
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
}

const getStatusColor = (status: OrderStatus) => {
  const colors = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Preparing: 'bg-blue-100 text-blue-700',
    Shipping: 'bg-purple-100 text-purple-700',
    Delivered: 'bg-green-100 text-green-700',
    Failed: 'bg-red-100 text-red-700',
    Completed: 'bg-emerald-100 text-emerald-700',
  };
  return colors[status];
};

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case 'Pending': return <Clock className="w-4 h-4" />;
    case 'Preparing': return <Package className="w-4 h-4" />;
    case 'Shipping': return <Truck className="w-4 h-4" />;
    case 'Delivered': return <CheckCircle className="w-4 h-4" />;
    case 'Completed': return <CheckCircle className="w-4 h-4" />;
    case 'Failed': return <Clock className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export const GuestOrderTracking = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [phoneNumber, setPhoneNumber] = useState(searchParams.get('phone') || '');
  const [isSearching, setIsSearching] = useState(false);

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['guest-orders', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber.trim()) return [];
      
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
        .eq('phone', phoneNumber)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: phoneNumber.trim().length > 0, // Tự động query khi có phone number
  });

  const handleSearch = async () => {
    if (!phoneNumber.trim()) return;
    
    setIsSearching(true);
    setSearchParams({ phone: phoneNumber });
    
    try {
      await refetch();
    } finally {
      setIsSearching(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-display text-primary font-bold mb-4">
              Theo Dõi Đơn Hàng 🚚
            </h1>
            <p className="text-lg text-muted-foreground">
              {phoneNumber ? 
                `Đang tìm kiếm đơn hàng với số: ${phoneNumber}` :
                "Nhập số điện thoại để xem trạng thái đơn hàng của bạn"
              }
            </p>
          </div>

          {/* Search Form */}
          <Card className="mb-8 shadow-cute">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Tìm Kiếm Đơn Hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Nhập số điện thoại đã đặt hàng"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={!phoneNumber.trim() || isSearching}
                  className="px-8"
                >
                  {isSearching ? 'Đang tìm...' : 'Tìm Kiếm'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Đang tìm kiếm đơn hàng...</p>
            </div>
          )}

          {error && (
            <Card className="mb-8 shadow-cute">
              <CardContent className="pt-6">
                <div className="text-center text-red-600">
                  <p>Không thể tìm kiếm đơn hàng. Vui lòng thử lại!</p>
                </div>
              </CardContent>
            </Card>
          )}

          {orders && orders.length === 0 && phoneNumber && !isLoading && (
            <Card className="mb-8 shadow-cute">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Không tìm thấy đơn hàng nào với số điện thoại này</p>
                  <p className="text-sm mt-2">Vui lòng kiểm tra lại số điện thoại</p>
                </div>
              </CardContent>
            </Card>
          )}

          {orders && orders.length > 0 && (
            <div className="space-y-6">
              {/* Success Message */}
              <Card className="bg-green-50 border-green-200 shadow-cute">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">Tìm thấy {orders.length} đơn hàng!</h3>
                      <p className="text-sm text-green-700">
                        Bạn có thể theo dõi trạng thái đơn hàng của mình bên dưới
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <h2 className="text-2xl font-display text-primary font-bold">
                Đơn Hàng Của Bạn ({orders.length})
              </h2>
              
              {orders.map((order) => (
                <Card key={order.id} className="shadow-cute overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Đơn Hàng #{order.id.slice(0, 8)}...
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Đặt ngày: {formatDate(order.created_at)}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
                        {getStatusIcon(order.status)}
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    {/* Order Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Khách hàng: {order.customer_identifier || 'Guest'}</p>
                            <p className="text-sm text-muted-foreground">{order.phone}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-orange-600 mt-0.5" />
                          <div>
                            <p className="font-medium">Địa chỉ giao hàng:</p>
                            <p className="text-sm">{order.address}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="font-medium">Thanh toán:</p>
                            <p className="text-sm">{order.payment_method}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-xl">
                          <p className="font-medium text-green-800">Tổng tiền:</p>
                          <p className="text-2xl font-bold text-green-600">
                            {order.total_price.toLocaleString('vi-VN')} VNĐ
                          </p>
                        </div>
                        
                        {order.notes && (
                          <div className="p-4 bg-blue-50 rounded-xl">
                            <p className="font-medium text-blue-800">Ghi chú:</p>
                            <p className="text-sm text-blue-700">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Sản Phẩm Đã Đặt
                      </h3>
                      <div className="space-y-3">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                            <img 
                              src={item.products?.image_url || '/placeholder.svg'} 
                              alt={item.products?.name || 'Sản phẩm'} 
                              className="w-16 h-16 rounded-xl object-cover" 
                            />
                            <div className="flex-1">
                              <h4 className="font-semibold">{item.products?.name || 'Sản phẩm không xác định'}</h4>
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
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        </div>
      </div>
      
      <Footer />
    </div>
  );
};