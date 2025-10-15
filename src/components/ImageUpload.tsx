import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  productId?: string;
  currentImageUrl?: string;
  onImageUploaded?: (imageUrl: string) => void;
  onImageRemoved?: () => void;
  className?: string;
}

export const ImageUpload = ({ 
  productId, 
  currentImageUrl, 
  onImageUploaded, 
  onImageRemoved,
  className = ""
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl || '');
  const [previewUrl, setPreviewUrl] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = productId ? `products/${productId}/${fileName}` : `uploads/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('matcha-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('matcha-images')
        .getPublicUrl(filePath);

      const finalImageUrl = urlData.publicUrl;
      setImageUrl(finalImageUrl);
      setPreviewUrl('');

      // Update database if productId provided
      if (productId) {
        const { error: dbError } = await supabase
          .from('products')
          .update({ image_url: finalImageUrl })
          .eq('id', productId);

        if (dbError) {
          console.error('DB update error:', dbError.message);
          toast.error('Image uploaded but failed to update database');
        } else {
          toast.success('Image uploaded and updated successfully! 📸');
        }
      } else {
        toast.success('Image uploaded successfully! 📸');
      }

      // Notify parent component
      onImageUploaded?.(finalImageUrl);

    } catch (error: any) {
      console.error('Upload error:', error.message);
      toast.error(`Upload failed: ${error.message}`);
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setPreviewUrl('');
    onImageRemoved?.();
    toast.success('Image removed');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleUpload(file);
      } else {
        toast.error('Please drop a valid image file');
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div 
        className="border-2 border-dashed border-kawaii-pink/30 rounded-2xl p-6 text-center hover:border-kawaii-pink/60 transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('image-upload')?.click()}
      >
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
        
        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kawaii-pink mx-auto"></div>
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 text-kawaii-pink mx-auto" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {imageUrl ? 'Change Image' : 'Upload Image'}
              </p>
              <p className="text-xs text-muted-foreground">
                Drag & drop or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG up to 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview */}
      {(imageUrl || previewUrl) && (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-xl">
            <img 
              src={previewUrl || imageUrl} 
              alt="Upload preview" 
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Button
                variant="destructive"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemoveImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {imageUrl && (
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {imageUrl.split('/').pop()}
            </p>
          )}
        </div>
      )}

      {/* Current Image Indicator */}
      {!imageUrl && !previewUrl && (
        <div className="flex items-center justify-center p-8 border border-dashed border-muted-foreground/30 rounded-xl">
          <div className="text-center space-y-2">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <p className="text-sm text-muted-foreground">No image selected</p>
          </div>
        </div>
      )}
    </div>
  );
};
