import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdminGuard } from "@/components/AdminGuard";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { UsersManager } from "@/components/admin/UsersManager";
import { ContactsManager } from "@/components/admin/ContactsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { LayoutDashboard, Package, ShoppingCart, Users, Mail } from "lucide-react";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <AdminGuard>
      <div className="min-h-screen flex flex-col bg-gradient-subtle">
        <Navbar />
        <div className="flex-1 py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl font-display text-primary font-bold mb-8">Bảng Điều Khiển Quản Trị 👑</h1>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-white/50 backdrop-blur-sm p-2 rounded-3xl shadow-cute">
                <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-kawaii-pink data-[state=active]:text-white rounded-2xl">
                  <LayoutDashboard className="w-4 h-4" /> Tổng Quan
                </TabsTrigger>
                <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-matcha-medium data-[state=active]:text-white rounded-2xl">
                  <Package className="w-4 h-4" /> Sản Phẩm
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-kawaii-purple data-[state=active]:text-white rounded-2xl">
                  <ShoppingCart className="w-4 h-4" /> Đơn Hàng
                </TabsTrigger>
                <TabsTrigger value="contacts" className="gap-2 data-[state=active]:bg-kawaii-purple data-[state=active]:text-white rounded-2xl">
                  <Mail className="w-4 h-4" /> Liên Hệ
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-kawaii-yellow data-[state=active]:text-white rounded-2xl">
                  <Users className="w-4 h-4" /> Người Dùng
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <DashboardStats />
              </TabsContent>

              <TabsContent value="products">
                <ProductsManager />
              </TabsContent>

              <TabsContent value="orders">
                <OrdersManager />
              </TabsContent>

              <TabsContent value="contacts">
                <ContactsManager />
              </TabsContent>

              <TabsContent value="users">
                <UsersManager />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <Footer />
      </div>
    </AdminGuard>
  );
};

export default Admin;
