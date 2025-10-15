import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface ProductIngredient {
  id?: string;
  product_id: string;
  ingredient_id: string;
  quantity: number; // Changed from quantity_used to quantity
  unit: string;
  ingredient?: {
    name: string;
    type: string;
  };
}

interface ProductIngredientsProps {
  productId: string;
  productName: string;
}

export const ProductIngredients = ({ productId, productName }: ProductIngredientsProps) => {
  const [open, setOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState<string>("gram");
  const queryClient = useQueryClient();

  const { data: ingredients } = useQuery({
    queryKey: ['all-ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ingredients').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: productIngredients } = useQuery({
    queryKey: ['product-ingredients', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_ingredients')
        .select('*, ingredients(name, type)')
        .eq('product_id', productId);
      if (error) throw error;
      return data;
    },
  });

  const addIngredientMutation = useMutation({
    mutationFn: async (newIngredient: Omit<ProductIngredient, 'id'>) => {
      const { error } = await supabase
        .from('product_ingredients')
        .insert([newIngredient]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-ingredients', productId] });
      toast.success("Đã thêm nguyên liệu! 🌿");
      setOpen(false);
      setSelectedIngredient("");
      setQuantity(0);
      setUnit("gram");
    },
  });

  const removeIngredientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_ingredients')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-ingredients', productId] });
      toast.success("Đã xóa nguyên liệu! 🗑️");
    },
  });

  const handleAddIngredient = () => {
    if (!selectedIngredient || quantity <= 0) {
      toast.error("Vui lòng chọn nguyên liệu và nhập số lượng!");
      return;
    }

    addIngredientMutation.mutate({
      product_id: productId,
      ingredient_id: selectedIngredient,
      quantity: quantity, // Changed from quantity_used to quantity
      unit: unit,
    });
  };

  const units = [
    { value: "gram", label: "Gram (g) - Mặc định" },
    { value: "ml", label: "Mililiter (ml)" },
    { value: "cups", label: "Cốc" },
    { value: "tablespoon", label: "Thìa canh" },
    { value: "teaspoon", label: "Thìa cà phê" },
    { value: "pieces", label: "Miếng/Cái" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Nguyên Liệu cho {productName}</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="kawaii" size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Thêm Nguyên Liệu
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm Nguyên Liệu</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nguyên Liệu</label>
                <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn nguyên liệu..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ingredients?.map((ingredient) => (
                      <SelectItem key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({ingredient.stock_quantity}g {ingredient.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Số Lượng (Gram)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Nhập số gram"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Đơn Vị</label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unitOption) => (
                        <SelectItem key={unitOption.value} value={unitOption.value}>
                          {unitOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                variant="matcha" 
                className="w-full" 
                onClick={handleAddIngredient}
                disabled={!selectedIngredient || quantity <= 0}
              >
                Thêm Nguyên Liệu
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl shadow-cute overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nguyên Liệu</TableHead>
              <TableHead>Số Lượng (Gram)</TableHead>
              <TableHead>Đơn Vị</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Hành Động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productIngredients?.map((ingredient) => (
              <TableRow key={ingredient.id}>
                <TableCell className="font-medium">
                  {ingredient.ingredients?.name || 'Unknown'}
                </TableCell>
                <TableCell>{ingredient.quantity}g</TableCell>
                <TableCell>{ingredient.unit}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {ingredient.ingredients?.type || 'Unknown'}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeIngredientMutation.mutate(ingredient.id!)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {(!productIngredients || productIngredients.length === 0) && (
          <div className="p-8 text-center">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
              <div className="text-4xl mb-4">🥤</div>
              <p className="text-lg font-semibold text-blue-800 mb-2">Chưa có nguyên liệu nào</p>
              <p className="text-blue-600 mb-4">Để tạo một món đồ uống hoàn chỉnh, hãy thêm các nguyên liệu cần thiết</p>
                     <div className="text-sm text-blue-500 space-y-1">
                       <p>💡 Ví dụ: Matcha Latte cần:</p>
                       <p>• Bột Matcha: 10g (Gram)</p>
                       <p>• Đường: 5g (Gram)</p>
                       <p>• Sữa: 150ml (Mililiter)</p>
                     </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
