import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types.ts";

type Product = Tables<"products">;

export const ProductsManager = () => {
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newProduct: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('products').insert([newProduct]).select();
      if (error) throw error;
      
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-ingredients'] });
      toast.success("Sản phẩm đã được tạo! 🎉");
      
      // Reset form and close modal
      setOpen(false);
      setUploadedImageUrl("");
      setEditingProduct(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const { data, error } = await supabase.from('products').update(updates).eq('id', id).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success("Product updated! ✨");
      setOpen(false);
      setEditingProduct(null);
      setUploadedImageUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success("Product deleted! 🗑️");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const productData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      image_url: uploadedImageUrl || formData.get('image_url') as string,
      category_id: formData.get('category_id') as string,
      stock_quantity: parseInt(formData.get('stock_quantity') as string),
      is_active: formData.get('is_active') === 'true',
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, updates: productData });
    } else {
      createMutation.mutate(productData);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-display text-primary font-bold">Quản Lý Sản Phẩm</h2>
          <div className="flex gap-3">
            <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) {
            // Reset form when closing
            setEditingProduct(null);
            setUploadedImageUrl("");
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="kawaii" className="gap-2" onClick={() => setEditingProduct(null)}>
              <Plus className="w-4 h-4" /> Thêm Sản Phẩm
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-primary font-bold">
                {editingProduct ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input name="name" placeholder="Tên Sản Phẩm" defaultValue={editingProduct?.name} required />
              <Textarea name="description" placeholder="Mô tả sản phẩm" defaultValue={editingProduct?.description || ''} />
              <Input name="price" type="number" step="1000" placeholder="Giá (VNĐ)" defaultValue={editingProduct?.price} required />
              
              <div>
                <label className="text-sm font-medium mb-2 block">Hình Ảnh Sản Phẩm</label>
                <ImageUpload 
                  productId={editingProduct?.id}
                  currentImageUrl={editingProduct?.image_url || ''}
                  onImageUploaded={setUploadedImageUrl}
                  className="mb-2"
                />
                <Input name="image_url" placeholder="Hoặc nhập URL hình ảnh thủ công" defaultValue={editingProduct?.image_url || ''} />
              </div>
              
              <Select name="category_id" defaultValue={editingProduct?.category_id || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn Danh Mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Input name="stock_quantity" type="number" placeholder="Số Lượng Cốc Có Sẵn" defaultValue={editingProduct?.stock_quantity} required />
              
              <Select name="is_active" defaultValue={editingProduct?.is_active ? 'true' : 'false'}>
                <SelectTrigger>
                  <SelectValue placeholder="Trạng Thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Hoạt Động</SelectItem>
                  <SelectItem value="false">Ngừng Bán</SelectItem>
                </SelectContent>
              </Select>
              
              <Button type="submit" variant="matcha" className="w-full">
                {editingProduct ? 'Cập Nhật' : 'Tạo'} Sản Phẩm
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
              <TableHead>Hình Ảnh</TableHead>
              <TableHead>Tên Sản Phẩm</TableHead>
              <TableHead>Danh Mục</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Số Lượng Cốc</TableHead>
              <TableHead>Trạng Thái</TableHead>
              <TableHead>Hành Động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <img src={product.image_url || '/placeholder.svg'} alt={product.name} className="w-12 h-12 object-cover rounded-xl" />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.categories?.name}</TableCell>
                <TableCell>{product.price.toLocaleString('vi-VN')} VNĐ</TableCell>
                <TableCell>{product.stock_quantity}</TableCell>
                       <TableCell>
                         <span className={`px-2 py-1 rounded-full text-xs ${product.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {product.is_active ? 'Hoạt Động' : 'Ngừng Bán'}
                         </span>
                       </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingProduct(product); setOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(product.id)}>
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