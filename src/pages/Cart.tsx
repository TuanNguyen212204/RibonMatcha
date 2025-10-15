import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Minus, Plus, Trash2, ShoppingBag, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useInventoryManagement } from "@/hooks/useInventoryManagement";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  toppings: string[];
}

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    address: "",
    phone: "",
    paymentMethod: "",
    notes: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { deductIngredients, isDeducting } = useInventoryManagement();

  // Validation function for Vietnamese phone numbers
  const isValidVietnamesePhone = (phone: string): boolean => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Vietnamese phone number patterns:
    // - 10 digits starting with 0 (mobile/landline) - Ưu tiên format này
    // - 11 digits starting with 84 (international format) - Chấp nhận nhưng không bắt buộc
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$|^(84[3|5|7|8|9])[0-9]{8}$/;
    
    return phoneRegex.test(cleanPhone);
  };

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCartItems(cart);
  };

  const updateQuantity = (id: string, change: number) => {
    const updatedCart = cartItems.map((item) => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    
    // Trigger custom event to update cart badge
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  };

  const removeItem = (id: string) => {
    const updatedCart = cartItems.filter((item) => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    
    // Trigger custom event to update cart badge
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    
    toast({
      title: "Removed from cart",
      description: "Item has been removed from your cart",
    });
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to place an order",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!checkoutData.address || !checkoutData.phone || !checkoutData.paymentMethod) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng điền đầy đủ các trường bắt buộc",
        variant: "destructive",
      });
      return;
    }

    if (!isValidVietnamesePhone(checkoutData.phone)) {
      toast({
        title: "Số điện thoại không hợp lệ",
        description: "Vui lòng nhập số điện thoại Việt Nam bắt đầu bằng 0",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          user_id: session.user.id,
          total_price: subtotal,
          address: checkoutData.address,
          phone: checkoutData.phone,
          payment_method: checkoutData.paymentMethod as "Cash" | "Card" | "Bank Transfer",
          notes: checkoutData.notes,
          status: "Pending" as const,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        toppings: item.toppings,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Automatically deduct ingredients from inventory using Edge Function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deduct-ingredients`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ order_id: order.id }),
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error);
        }

        toast({
          title: "Nguyên liệu đã được trừ tự động! 📦",
          description: "Kho nguyên liệu đã được cập nhật theo đơn hàng.",
        });
      } catch (inventoryError: unknown) {
        // Still show success for order, but warn about inventory
        toast({
          title: "Đơn hàng thành công nhưng có cảnh báo kho! ⚠️",
          description: `Đơn hàng đã được đặt nhưng không thể trừ nguyên liệu: ${inventoryError instanceof Error ? inventoryError.message : 'Lỗi không xác định'}`,
          variant: "destructive",
        });
      }

      // Clear cart
      localStorage.removeItem("cart");
      setCartItems([]);
      setShowCheckout(false);
      
      // Trigger custom event to update cart badge
      window.dispatchEvent(new CustomEvent('cartUpdated'));

      toast({
        title: "Order placed! 🎉",
        description: "Your order has been placed successfully!",
      });

      navigate("/profile");
    } catch (error: unknown) {
      toast({
        title: "Order failed",
        description: error instanceof Error ? error.message : 'Lỗi không xác định',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-display text-primary font-bold mb-8">
            Your Cart 🛒
          </h1>

          {cartItems.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground mb-4">Your cart is empty</p>
              <Button onClick={() => navigate("/menu")} variant="kawaii">
                Start Shopping
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-card rounded-2xl p-6 shadow-cute flex gap-4"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-24 h-24 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-secondary/20 flex items-center justify-center">
                        <Heart className="h-12 w-12 text-primary/20" />
                      </div>
                    )}

                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.price.toLocaleString('vi-VN')} VNĐ each
                      </p>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-secondary/20 rounded-full p-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">
                        {(item.price * item.quantity).toLocaleString('vi-VN')} VNĐ
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-2xl p-6 shadow-cute sticky top-24">
                  <h2 className="text-2xl font-display mb-6">Order Summary</h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">{subtotal.toLocaleString('vi-VN')} VNĐ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-semibold">Free 🎁</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-lg">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary">
                        {subtotal.toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    variant="kawaii"
                    size="lg"
                    onClick={() => setShowCheckout(true)}
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout 💕</DialogTitle>
            <DialogDescription>
              Enter your delivery details to complete your order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Delivery Address *</Label>
              <Textarea
                id="address"
                placeholder="123 Kawaii Street, Cute Town..."
                value={checkoutData.address}
                onChange={(e) =>
                  setCheckoutData({ ...checkoutData, address: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="phone">Số Điện Thoại *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0123 456 789 (Số Việt Nam)"
                value={checkoutData.phone}
                onChange={(e) =>
                  setCheckoutData({ ...checkoutData, phone: e.target.value })
                }
              />
              {checkoutData.phone && !isValidVietnamesePhone(checkoutData.phone) && (
                <p className="text-sm text-red-500 mt-1">
                  Vui lòng nhập số điện thoại Việt Nam hợp lệ (bắt đầu bằng 0)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="payment">Phương Thức Thanh Toán *</Label>
              <Select
                value={checkoutData.paymentMethod}
                onValueChange={(value) =>
                  setCheckoutData({ ...checkoutData, paymentMethod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phương thức thanh toán" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Thanh Toán Khi Nhận Hàng</SelectItem>
                  <SelectItem value="Bank Transfer">Chuyển Khoản Ngân Hàng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* QR Code for Bank Transfer */}
            {checkoutData.paymentMethod === "Bank Transfer" && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">📱 Quét QR Code để thanh toán</h4>
                <div className="text-center">
                  <img 
                    src={new URL('../assets/QRBank.jpg', import.meta.url).href} 
                    alt="QR Code Ngân Hàng" 
                    className="mx-auto mb-3 rounded-lg shadow-md max-w-48 h-48 object-cover"
                  />
                  <div className="text-sm text-blue-600 space-y-1">
                    <p><strong>Ngân hàng:</strong> BIDV (BIDV)</p>
                    <p><strong>STK:</strong> 8813722558</p>
                    <p><strong>Chủ TK:</strong> Ribon Matchalatte Shop</p>
                    <p><strong>Nội dung:</strong> {checkoutData.phone}</p>
                  </div>
                  <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-xs text-yellow-700">
                      ⚠️ Vui lòng chuyển khoản với nội dung là số điện thoại của bạn để chúng tôi dễ dàng xác nhận đơn hàng
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Order Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests?"
                value={checkoutData.notes}
                onChange={(e) =>
                  setCheckoutData({ ...checkoutData, notes: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Cancel
            </Button>
            <Button variant="kawaii" onClick={handleCheckout} disabled={loading || isDeducting}>
              {loading || isDeducting ? "Processing Order..." : `Place Order (${subtotal.toLocaleString('vi-VN')} VNĐ)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Cart;
