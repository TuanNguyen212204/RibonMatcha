import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Lưu thông tin liên hệ vào database
      const { error } = await supabase
        .from('contacts')
        .insert([{
          name: formData.name,
          email: formData.email,
          message: formData.message,
          status: 'new'
        }]);

      if (error) {
        throw error;
      }

      toast({ 
        title: "Tin nhắn đã được gửi! 💌", 
        description: "Chúng tôi sẽ liên hệ lại với bạn sớm nhất có thể!" 
      });
      
      // Reset form
      setFormData({ name: "", email: "", message: "" });
      
    } catch (error: unknown) {
      toast({
        title: "Có lỗi xảy ra",
        description: error instanceof Error ? error.message : "Không thể gửi tin nhắn. Vui lòng thử lại.",
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
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-5xl font-display text-primary font-bold mb-8 text-center">
            Contact Us 💌
          </h1>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="bg-card rounded-3xl shadow-cute p-8">
              <h2 className="text-2xl font-display text-primary font-bold mb-6">
                Thông Tin Liên Hệ 📞
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-kawaii-pink rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">📱</span>
                  </div>
                  <div>
                    <p className="font-semibold">Điện thoại</p>
                    <p className="text-muted-foreground">0866626905</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-kawaii-purple rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">📧</span>
                  </div>
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-muted-foreground">trangdinhhuyen269@gmail.com</p>
                  </div>
                </div>
              
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-kawaii-yellow rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🕒</span>
                  </div>
                  <div>
                    <p className="font-semibold">Giờ mở cửa</p>
                    <p className="text-muted-foreground">8:00 AM - 10:00 PM (Hàng ngày)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-card rounded-3xl shadow-cute p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" rows={5} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} required />
              </div>
              <Button type="submit" variant="kawaii" size="lg" className="w-full" disabled={loading}>
                {loading ? "Đang gửi..." : "Gửi Tin Nhắn"}
              </Button>
            </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Contact;
