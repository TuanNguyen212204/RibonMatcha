import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Card } from "@/components/ui/card.tsx";
import { Package, Users, ShoppingCart, TrendingUp, DollarSign, BarChart3, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export const DashboardStats = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [products, users, orders, ingredients, orderItems] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('total_price, status, created_at'),
        supabase.from('ingredients').select('*', { count: 'exact', head: true }),
        supabase.from('order_items').select('quantity, products(name)'),
      ]);

      const totalRevenue = orders.data?.reduce((sum, order) => sum + Number(order.total_price), 0) || 0;
      const totalCupsSold = orderItems.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const lowStockIngredients = ingredients.data?.filter(ing => ing.stock_quantity < 100).length || 0;

      // Calculate growth for users only, reset others to 0
      const calculateUserGrowth = async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .lt('created_at', thirtyDaysAgo.toISOString());
        
        const previousCount = count || 0;
        const currentCount = users.count || 0;
        
        if (previousCount === 0) return currentCount > 0 ? 100 : 0;
        return ((currentCount - previousCount) / previousCount) * 100;
      };

      // Reset weekly sales data - clean start
      const generateWeeklySales = () => {
        const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        return days.map(day => ({ day, orders: 0, revenue: 0 }));
      };

      // Reset category distribution data - clean start
      const generateCategoryData = async () => {
        return []; // Empty array for clean start
      };

      const weeklySales = generateWeeklySales();
      const categoryData = await generateCategoryData();

      // Reset growth percentages - clean start (except users)
      const userGrowth = await calculateUserGrowth();
      const growthData = [
        0, // Products growth reset
        userGrowth, // Users growth dynamic
        0, // Orders growth reset
        0  // Revenue growth reset
      ];

      return {
        products: 0, // Reset to 0
        users: users.count || 0, // Keep dynamic
        orders: 0, // Reset to 0
        revenue: 0, // Reset to 0
        ingredients: 0, // Reset to 0
        cupsSold: 0, // Reset to 0
        lowStockIngredients: 0, // Reset to 0
        weeklySales,
        categoryData,
        growth: {
          products: growthData[0],
          users: growthData[1],
          orders: growthData[2],
          revenue: growthData[3],
        }
      };
    },
  });

  const statCards = [
    { 
      label: "Tổng Sản Phẩm", 
      value: stats?.products || 0, 
      icon: Package, 
      color: "text-kawaii-pink",
      description: "Sản phẩm đang hoạt động",
      growth: stats?.growth?.products || 0
    },
    { 
      label: "Tổng Người Dùng", 
      value: stats?.users || 0, 
      icon: Users, 
      color: "text-matcha-medium",
      description: "Khách hàng đã đăng ký",
      growth: stats?.growth?.users || 0
    },
    { 
      label: "Tổng Đơn Hàng", 
      value: stats?.orders || 0, 
      icon: ShoppingCart, 
      color: "text-kawaii-purple",
      description: "Đơn hàng đã đặt",
      growth: stats?.growth?.orders || 0
    },
    { 
      label: "Doanh Thu", 
      value: `${(stats?.revenue || 0).toLocaleString('vi-VN')} VNĐ`, 
      icon: DollarSign, 
      color: "text-kawaii-yellow",
      description: "Tổng thu nhập",
      growth: stats?.growth?.revenue || 0
    },
    { 
      label: "Nguyên Liệu", 
      value: stats?.ingredients || 0, 
      icon: BarChart3, 
      color: "text-matcha-dark",
      description: "Tổng nguyên liệu"
    },
    { 
      label: "Cốc Đã Bán", 
      value: stats?.cupsSold || 0, 
      icon: Activity, 
      color: "text-accent",
      description: "Tổng cốc đã bán"
    },
    { 
      label: "Sắp Hết Hàng", 
      value: stats?.lowStockIngredients || 0, 
      icon: TrendingUp, 
      color: "text-destructive",
      description: "Nguyên liệu cần nhập thêm"
    },
  ];

  return (
    <div className="space-y-8">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.slice(0, 4).map((stat) => (
          <Card key={stat.label} className="p-6 bg-white border-2 border-kawaii-pink/20 rounded-3xl shadow-cute hover:shadow-float transition-all">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground font-body">{stat.label}</p>
                  {stat.growth !== undefined && (
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      stat.growth >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {stat.growth >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {Math.abs(stat.growth).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-3xl font-bold text-foreground mt-2 relative z-10">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </div>
              <stat.icon className={`w-12 h-12 ${stat.color} ml-4`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.slice(4).map((stat) => (
          <Card key={stat.label} className="p-6 bg-white border-2 border-kawaii-pink/20 rounded-3xl shadow-cute hover:shadow-float transition-all">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground font-body">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-2 relative z-10">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </div>
              <stat.icon className={`w-10 h-10 ${stat.color} ml-4`} />
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Sales Chart */}
        <Card className="p-6 bg-white border-2 border-kawaii-pink/20 rounded-3xl shadow-cute">
          <h3 className="text-xl font-display text-primary font-bold mb-4">Doanh Thu Tuần 📈</h3>
          {stats?.weeklySales && stats.weeklySales.some(day => day.orders > 0 || day.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.weeklySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `${Number(value).toLocaleString('vi-VN')} VNĐ` : value,
                    name === 'revenue' ? 'Doanh Thu' : 'Đơn Hàng'
                  ]}
                  labelStyle={{ color: '#333' }}
                />
                <Bar dataKey="orders" fill="#EC4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <p className="text-muted-foreground">Chưa có dữ liệu đơn hàng</p>
                <p className="text-sm text-muted-foreground">Dữ liệu sẽ hiển thị khi có đơn hàng</p>
              </div>
            </div>
          )}
        </Card>

        {/* Category Distribution */}
        <Card className="p-6 bg-white border-2 border-kawaii-pink/20 rounded-3xl shadow-cute">
          <h3 className="text-xl font-display text-primary font-bold mb-4">Phân Bố Sản Phẩm 🥤</h3>
          {stats?.categoryData && stats.categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">🥤</div>
                <p className="text-muted-foreground">Chưa có dữ liệu bán hàng</p>
                <p className="text-sm text-muted-foreground">Dữ liệu sẽ hiển thị khi có đơn hàng</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card className="p-6 bg-white border-2 border-kawaii-pink/20 rounded-3xl shadow-cute">
        <h3 className="text-xl font-display text-primary font-bold mb-4">Xu Hướng Doanh Thu 💰</h3>
        {stats?.weeklySales && stats.weeklySales.some(day => day.revenue > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.weeklySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                formatter={(value) => [`${Number(value).toLocaleString('vi-VN')} VNĐ`, 'Doanh Thu']}
                labelStyle={{ color: '#333' }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">💰</div>
              <p className="text-muted-foreground">Chưa có doanh thu</p>
              <p className="text-sm text-muted-foreground">Biểu đồ sẽ hiển thị khi có đơn hàng</p>
            </div>
          </div>
        )}
      </Card>

    </div>
  );
};
