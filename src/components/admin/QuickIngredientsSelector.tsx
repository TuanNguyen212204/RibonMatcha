import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Plus, Trash2 } from "lucide-react";

interface IngredientSelection {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
}

interface QuickIngredientsSelectorProps {
  onIngredientsChange: (ingredients: IngredientSelection[]) => void;
  initialIngredients?: IngredientSelection[];
}

export const QuickIngredientsSelector = ({ 
  onIngredientsChange, 
  initialIngredients = [] 
}: QuickIngredientsSelectorProps) => {
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientSelection[]>(initialIngredients);
  const [newIngredient, setNewIngredient] = useState({
    ingredientId: "",
    quantity: 0,
    unit: "gram"
  });

  const { data: ingredients } = useQuery({
    queryKey: ['all-ingredients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ingredients').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const units = [
    { value: "gram", label: "Gram (g) - Mặc định" },
    { value: "ml", label: "Mililiter (ml)" },
    { value: "cups", label: "Cốc" },
    { value: "tablespoon", label: "Thìa canh" },
    { value: "teaspoon", label: "Thìa cà phê" },
    { value: "pieces", label: "Miếng/Cái" },
  ];

  const handleAddIngredient = () => {
    if (!newIngredient.ingredientId || newIngredient.quantity <= 0) return;

    const ingredient = ingredients?.find(ing => ing.id === newIngredient.ingredientId);
    if (!ingredient) return;

    const ingredientSelection: IngredientSelection = {
      id: ingredient.id,
      name: ingredient.name,
      type: ingredient.type,
      quantity: newIngredient.quantity,
      unit: newIngredient.unit
    };

    const updatedIngredients = [...selectedIngredients, ingredientSelection];
    setSelectedIngredients(updatedIngredients);
    onIngredientsChange(updatedIngredients);

    // Reset form
    setNewIngredient({
      ingredientId: "",
      quantity: 0,
      unit: "gram"
    });
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    const updatedIngredients = selectedIngredients.filter(ing => ing.id !== ingredientId);
    setSelectedIngredients(updatedIngredients);
    onIngredientsChange(updatedIngredients);
  };

  useEffect(() => {
    setSelectedIngredients(initialIngredients);
  }, [initialIngredients]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Nguyên Liệu Cần Thiết 🥤</h3>
        <span className="text-sm text-muted-foreground">
          {selectedIngredients.length} nguyên liệu đã chọn
        </span>
      </div>

      {/* Add new ingredient form */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Nguyên Liệu</label>
            <Select 
              value={newIngredient.ingredientId} 
              onValueChange={(value) => setNewIngredient({...newIngredient, ingredientId: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn nguyên liệu..." />
              </SelectTrigger>
              <SelectContent>
                  {ingredients?.filter(ing => !selectedIngredients.some(si => si.id === ing.id)).map((ingredient) => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({ingredient.type}) - {ingredient.stock_quantity}g có sẵn
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Số Lượng (Gram)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="Nhập số gram cần dùng"
              value={newIngredient.quantity || ''}
              onChange={(e) => setNewIngredient({...newIngredient, quantity: Number(e.target.value)})}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1 block">Đơn Vị</label>
            <Select 
              value={newIngredient.unit} 
              onValueChange={(value) => setNewIngredient({...newIngredient, unit: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button 
              variant="kawaii" 
              onClick={handleAddIngredient}
              disabled={!newIngredient.ingredientId || newIngredient.quantity <= 0}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm
            </Button>
          </div>
        </div>
      </Card>

      {/* Selected ingredients list */}
      {selectedIngredients.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Danh sách nguyên liệu đã chọn:</h4>
          {selectedIngredients.map((ingredient) => (
            <Card key={ingredient.id} className="p-3 bg-white border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="font-medium">{ingredient.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">({ingredient.type})</span>
                  <span className="ml-4 font-semibold text-primary">
                    {ingredient.quantity} {ingredient.unit}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveIngredient(ingredient.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-2xl mb-2">🥤</div>
          <p className="text-gray-600">Chưa có nguyên liệu nào được chọn</p>
          <p className="text-sm text-gray-500">Hãy thêm nguyên liệu cần thiết cho sản phẩm này</p>
        </div>
      )}
    </div>
  );
};
