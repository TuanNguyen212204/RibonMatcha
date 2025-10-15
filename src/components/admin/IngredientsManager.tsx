import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, TrendingUp } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types.ts";
import { useProductStatusManagement } from "@/hooks/useProductStatusManagement.tsx";

type Ingredient = Tables<"ingredients">;

export const IngredientsManager = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(0);
  const queryClient = useQueryClient();
  const { checkAndUpdateProductStatus } = useProductStatusManagement();

  const { data: ingredients } = useQuery({
    queryKey: ['admin-ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ingredients').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Auto-check product status when ingredients are loaded (silently)
  useEffect(() => {
    if (ingredients) {
      checkAndUpdateProductStatus();
    }
  }, [ingredients, checkAndUpdateProductStatus]);

  const createMutation = useMutation({
    mutationFn: async (newIngredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('ingredients').insert([newIngredient]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      toast.success("Ingredient added! 🌿");
      setOpen(false);
      // Check product status after adding ingredient
      checkAndUpdateProductStatus();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Ingredient> }) => {
      const { error } = await supabase.from('ingredients').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      toast.success("Ingredient updated! ✨");
      setOpen(false);
      setEditing(null);
      // Check product status after updating ingredient
      checkAndUpdateProductStatus();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ingredients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      toast.success("Ingredient deleted! 🗑️");
      // Check product status after deleting ingredient
      checkAndUpdateProductStatus();
    },
  });

  const restockMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data: ingredient, error: fetchError } = await supabase
        .from('ingredients')
        .select('stock_quantity')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('ingredients')
        .update({ stock_quantity: (ingredient.stock_quantity + amount) })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      toast.success("Ingredient restocked! 📦");
      setRestockOpen(false);
      setRestockAmount(0);
      setSelectedIngredient(null);
      // Check product status after restocking
      checkAndUpdateProductStatus();
    },
  });

  const handleRestock = () => {
    if (selectedIngredient && restockAmount > 0) {
      restockMutation.mutate({ id: selectedIngredient.id, amount: restockAmount });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const ingredientData = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      stock_quantity: parseInt(formData.get('stock_quantity') as string),
      price_per_unit: parseFloat(formData.get('price_per_unit') as string),
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, updates: ingredientData });
    } else {
      createMutation.mutate(ingredientData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-display text-primary font-bold">Quản Lý Nguyên Liệu</h2>
        <div className="flex gap-3">
          {/* <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => checkAndUpdateProductStatus()}
          >
            <TrendingUp className="w-4 h-4" />
            Kiểm Tra Trạng Thái Sản Phẩm
          </Button> */}
          <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
            <DialogTrigger asChild>
              <Button variant="matcha" className="gap-2">
                <Package className="w-4 h-4" /> Nhập Hàng
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary font-bold">
                Nhập Thêm Nguyên Liệu
              </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Chọn Nguyên Liệu</label>
                  <select 
                    className="w-full p-2 border rounded-lg mt-2"
                    onChange={(e) => {
                      const ingredient = ingredients?.find(ing => ing.id === e.target.value);
                      setSelectedIngredient(ingredient || null);
                    }}
                  >
                    <option value="">Chọn nguyên liệu...</option>
                    {ingredients?.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} (Hiện tại: {ingredient.stock_quantity}g)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Số Lượng Thêm (Gram)</label>
                  <Input 
                    type="number" 
                    placeholder="Nhập số gram cần thêm"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(Number(e.target.value))}
                  />
                </div>
                <Button 
                  variant="matcha" 
                  className="w-full" 
                  onClick={handleRestock}
                  disabled={!selectedIngredient || restockAmount <= 0}
                >
                  Thêm Vào Kho
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="kawaii" className="gap-2" onClick={() => setEditing(null)}>
                <Plus className="w-4 h-4" /> Thêm Nguyên Liệu
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary font-bold">
                {editing ? 'Sửa Nguyên Liệu' : 'Thêm Nguyên Liệu Mới'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input name="name" placeholder="Tên Nguyên Liệu" defaultValue={editing?.name} required />
              <Input name="type" placeholder="Loại (VD: Bột, Topping)" defaultValue={editing?.type} required />
              <Input name="stock_quantity" type="number" placeholder="Số Lượng Kho (Gram)" defaultValue={editing?.stock_quantity} required />
              <Input name="price_per_unit" type="number" step="1000" placeholder="Giá Mỗi Gram (VNĐ)" defaultValue={editing?.price_per_unit} required />
              <Button type="submit" variant="matcha" className="w-full">
                {editing ? 'Cập Nhật' : 'Tạo'} Nguyên Liệu
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-3xl shadow-cute overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Kho (Gram)</TableHead>
              <TableHead>Giá/Gram</TableHead>
              <TableHead>Trạng Thái</TableHead>
              <TableHead>Hành Động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients?.map((ingredient) => (
              <TableRow key={ingredient.id}>
                <TableCell className="font-medium">{ingredient.name}</TableCell>
                <TableCell>{ingredient.type}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={ingredient.stock_quantity < 100 ? 'text-red-500 font-semibold' : ''}>
                      {ingredient.stock_quantity}g
                    </span>
                    {ingredient.stock_quantity < 100 && (
                      <TrendingUp className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>{ingredient.price_per_unit.toLocaleString('vi-VN')} VNĐ/g</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    ingredient.stock_quantity < 50 
                      ? 'bg-red-100 text-red-700' 
                      : ingredient.stock_quantity < 100 
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                  }`}>
                    {ingredient.stock_quantity < 50 
                      ? 'Nghiêm Trọng' 
                      : ingredient.stock_quantity < 100 
                        ? 'Thấp'
                        : 'Tốt'
                    }
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(ingredient); setOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(ingredient.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
