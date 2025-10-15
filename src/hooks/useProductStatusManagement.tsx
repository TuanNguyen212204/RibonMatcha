import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { toast } from "sonner";

export const useProductStatusManagement = () => {
  const queryClient = useQueryClient();

  // Function to check and update product status based on ingredient availability
  const checkAndUpdateProductStatus = useMutation({
    mutationFn: async () => {
      // Get all products with their ingredients
      const { data: products } = await supabase
        .from('products')
        .select('id, name, is_active');

      if (!products) return;

      for (const product of products) {
        // Get product ingredients
        const { data: productIngredients } = await supabase
          .from('product_ingredients')
          .select(`
            quantity,
            ingredients!inner(
              id,
              name,
              stock_quantity
            )
          `)
          .eq('product_id', product.id);

        if (productIngredients && productIngredients.length > 0) {
          // Check if any required ingredient is out of stock
          const hasInsufficientStock = productIngredients.some(pi => 
            pi.ingredients.stock_quantity < pi.quantity
          );

          // Update product status
          const newStatus = hasInsufficientStock ? false : true;
          
          // Only update if status changed
          if (product.is_active !== newStatus) {
            await supabase
              .from('products')
              .update({ is_active: newStatus })
              .eq('id', product.id);

          }
        } else {
          // If product has no ingredients configured, deactivate it
          if (product.is_active) {
            await supabase
              .from('products')
              .update({ is_active: false })
              .eq('id', product.id);

          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Bỏ thông báo tự động để không làm phiền admin
    },
    onError: (error) => {
      toast.error("Không thể cập nhật trạng thái sản phẩm");
    },
  });

  return {
    checkAndUpdateProductStatus: checkAndUpdateProductStatus.mutate,
    isChecking: checkAndUpdateProductStatus.isPending,
  };
};
