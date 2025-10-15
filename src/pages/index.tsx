import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
// import heroMatcha from "@/assets/hero-matcha.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
}

const Index = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .limit(3);

    if (!error && data) {
      setFeaturedProducts(data);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-rainbow py-20 md:py-32">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 animate-float">
            <Heart className="h-16 w-16 text-primary" />
          </div>
          <div className="absolute top-32 right-20 animate-float" style={{ animationDelay: "1s" }}>
            <Sparkles className="h-12 w-12 text-accent" />
          </div>
          <div className="absolute bottom-20 left-1/4 animate-float" style={{ animationDelay: "2s" }}>
            <Heart className="h-20 w-20 text-secondary" />
          </div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-center md:text-left">
              <h1 className="text-5xl md:text-7xl font-display text-white drop-shadow-lg">
                Welcome to Kawaii Matcha! 🍵💕
              </h1>
              <p className="text-xl md:text-2xl text-white/90">
                Every sip is filled with love and happiness!
              </p>
              <div className="flex gap-4 justify-center md:justify-start flex-wrap">
                <Link to="/menu">
                  <Button variant="kawaii" size="lg" className="animate-bounce-soft">
                    <ShoppingBag className="mr-2" />
                    Shop Now
                  </Button>
                </Link>
                <Link to="/about">
                  <Button variant="outline" size="lg" className="bg-white/90 border-white hover:bg-white">
                    Our Story
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="relative z-10 w-full max-w-md mx-auto drop-shadow-2xl animate-float flex items-center justify-center h-96 bg-gradient-to-br from-secondary/20 to-accent/20 rounded-3xl">
                <img 
                  src={new URL('../assets/logo.jpg', import.meta.url).href} 
                  alt="Ribon Matchalatte Logo" 
                  className="h-48 w-48 object-cover rounded-full shadow-2xl animate-bounce-soft border-4 border-white/50"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display text-primary font-bold mb-4">
              Featured Drinks ✨
            </h2>
            <p className="text-lg text-muted-foreground">
              Our most loved Matcha creations!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredProducts.length > 0 ? (
              featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-muted-foreground">No products available yet. Check back soon! 💕</p>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <Link to="/menu">
              <Button variant="matcha" size="lg">
                View Full Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-display text-center text-primary font-bold mb-12">
            Why We're Special 💖
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-card rounded-3xl shadow-cute hover:shadow-float transition-all hover:scale-105">
              <div className="w-16 h-16 gradient-matcha rounded-full mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Quality</h3>
              <p className="text-muted-foreground">
                Only the finest Matcha powder from Japan
              </p>
            </div>

            <div className="text-center p-8 bg-card rounded-3xl shadow-cute hover:shadow-float transition-all hover:scale-105">
              <div className="w-16 h-16 gradient-pink rounded-full mx-auto mb-4 flex items-center justify-center">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Made with Love</h3>
              <p className="text-muted-foreground">
                Every drink is crafted with care and happiness
              </p>
            </div>

            <div className="text-center p-8 bg-card rounded-3xl shadow-cute hover:shadow-float transition-all hover:scale-105">
              <div className="w-16 h-16 gradient-rainbow rounded-full mx-auto mb-4 flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
              <p className="text-muted-foreground">
                Get your Matcha fix delivered quickly!
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
