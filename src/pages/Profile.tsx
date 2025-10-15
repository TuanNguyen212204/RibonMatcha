import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { User, ShoppingBag } from "lucide-react";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
    setSession(session);
    setLoading(false);
  };

  // Enable real-time order notifications
  useOrderNotifications(session?.user?.id);

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ['user-orders', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name, image_url))')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: formData.get('username') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
      })
      .eq('id', session.user.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated! ✨");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: 'bg-yellow-100 text-yellow-700',
      Preparing: 'bg-blue-100 text-blue-700',
      Shipping: 'bg-purple-100 text-purple-700',
      Delivered: 'bg-green-100 text-green-700',
      Completed: 'bg-green-100 text-green-700',
      Failed: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-lg">Loading...</p></div>;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <Navbar />
      <div className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl font-display text-primary font-bold mb-8">My Profile 💕</h1>
          
          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="bg-white/50 backdrop-blur-sm p-2 rounded-3xl shadow-cute">
              <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-kawaii-pink data-[state=active]:text-white rounded-2xl">
                <ShoppingBag className="w-4 h-4" /> My Orders
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-matcha-medium data-[state=active]:text-white rounded-2xl">
                <User className="w-4 h-4" /> Profile Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              <div className="space-y-4">
                {orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <Card key={order.id} className="p-6 rounded-3xl shadow-cute">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-lg font-semibold">{order.total_price.toLocaleString('vi-VN')} VNĐ</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex gap-3">
                            <img src={item.products.image_url || '/placeholder.svg'} alt={item.products.name} className="w-12 h-12 rounded-xl object-cover" />
                            <div>
                              <p className="font-medium">{item.products.name}</p>
                              <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">{new Date(order.created_at).toLocaleDateString()}</p>
                    </Card>
                  ))
                ) : (
                  <Card className="p-12 text-center rounded-3xl shadow-cute">
                    <p className="text-lg text-muted-foreground">No orders yet! Start shopping 🛍️</p>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="profile">
              <Card className="p-8 rounded-3xl shadow-cute">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="text-sm font-medium">Username</label>
                    <Input name="username" defaultValue={profile?.username || ''} placeholder="Your username" className="mt-2" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input value={profile?.email || ''} disabled className="mt-2 bg-muted" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input name="phone" defaultValue={profile?.phone || ''} placeholder="Your phone number" className="mt-2" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Address</label>
                    <Input name="address" defaultValue={profile?.address || ''} placeholder="Your delivery address" className="mt-2" />
                  </div>
                  <Button type="submit" variant="matcha" className="w-full">
                    Save Changes
                  </Button>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
