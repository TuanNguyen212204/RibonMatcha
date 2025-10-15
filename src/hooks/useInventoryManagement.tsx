import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { toast } from "sonner";

// Interface for product ingredients
interface ProductIngredient {
  product_id: string;
  ingredient_id: string;
  quantity: number; // Changed from quantity_used to quantity
}

// Hook to manage inventory automatically
export const useInventoryManagement = () => {
  const queryClient = useQueryClient();

  // Function to automatically deduct ingredients when order is placed
  const deductIngredientsMutation = useMutation({
    mutationFn: async (orderItems: any[]) => {
      // Get all products and their required ingredients
      const productIds = orderItems.map(item => item.product_id);
      
      const { data: productIngredients, error } = await supabase
        .from('product_ingredients')
        .select('*')
        .in('product_id', productIds);

      if (error) throw error;

      // Calculate total ingredients needed
      const ingredientUsage: Record<string, number> = {};
      
      orderItems.forEach(orderItem => {
        const requiredIngredients = productIngredients?.filter(
          pi => pi.product_id === orderItem.product_id
        ) || [];
        
        requiredIngredients.forEach(pi => {
          const totalNeeded = pi.quantity * orderItem.quantity;
          ingredientUsage[pi.ingredient_id] = (ingredientUsage[pi.ingredient_id] || 0) + totalNeeded;
        });
      });

      // Check if we have enough stock
      const ingredientIds = Object.keys(ingredientUsage);
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('id, name, stock_quantity')
        .in('id', ingredientIds);

      if (ingredientsError) throw ingredientsError;

      const insufficientStock = ingredients?.filter(
        ing => ing.stock_quantity < ingredientUsage[ing.id]
      ) || [];

      if (insufficientStock.length > 0) {
        const names = insufficientStock.map(ing => ing.name).join(', ');
        throw new Error(`Insufficient stock for: ${names}`);
      }

      // Deduct ingredients from stock
      const updatePromises = Object.entries(ingredientUsage).map(([ingredientId, quantityUsed]) => {
        const ingredient = ingredients?.find(ing => ing.id === ingredientId);
        if (!ingredient) return Promise.resolve();

        return supabase
          .from('ingredients')
          .update({ 
            stock_quantity: ingredient.stock_quantity - quantityUsed 
          })
          .eq('id', ingredientId);
      });

      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      toast.success("Inventory updated automatically! 📦");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update inventory");
    },
  });

  return {
    deductIngredients: deductIngredientsMutation.mutate,
    isDeducting: deductIngredientsMutation.isPending,
  };
};
