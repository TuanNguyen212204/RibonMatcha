import { useState } from "react";
import { Button } from "./ui/button.tsx";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast.ts";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock_quantity: number;
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const { toast } = useToast();

  const handleAddToCart = () => {
    // Get cart from localStorage
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    
    // Check if product already in cart
    const existingItem = cart.find((item: any) => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1, toppings: [] });
    }
    
    localStorage.setItem("cart", JSON.stringify(cart));
    
    // Trigger custom event to update cart badge
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    
    toast({
      title: "Added to cart! 💕",
      description: `${product.name} has been added to your cart`,
    });
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites! 💖",
      description: isFavorite ? undefined : `${product.name} is now in your favorites`,
    });
  };

  return (
    <div className="group relative bg-card rounded-3xl shadow-cute hover:shadow-float transition-all duration-300 overflow-hidden">
      {/* Image Container */}
      <div className="relative h-64 overflow-hidden bg-gradient-to-br from-secondary/20 to-accent/20">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Heart className="h-24 w-24 text-primary/20" />
          </div>
        )}
        
        {/* Favorite Button */}
        <button
          onClick={toggleFavorite}
          className="absolute top-4 right-4 p-2 bg-white/90 rounded-full shadow-cute hover:scale-110 transition-transform"
        >
          <Heart
            className={`h-5 w-5 ${isFavorite ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        </button>

        {/* Stock Badge */}
        {product.stock_quantity === 0 && (
          <div className="absolute bottom-4 left-4 px-4 py-1 bg-destructive text-destructive-foreground rounded-full text-sm font-semibold">
            Out of Stock
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-xl font-semibold mb-1">{product.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Rating (placeholder - can be connected to reviews table) */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-primary text-primary" />
          ))}
          <span className="text-sm text-muted-foreground ml-2">(5.0)</span>
        </div>

        {/* Price & Add to Cart */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <p className="text-2xl font-bold text-primary">
              {product.price.toLocaleString('vi-VN')} VNĐ
            </p>
          </div>
          <Button
            onClick={handleAddToCart}
            disabled={product.stock_quantity === 0}
            variant="kawaii"
            size="sm"
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};
