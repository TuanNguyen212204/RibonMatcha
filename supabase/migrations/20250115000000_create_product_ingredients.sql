-- Tạo bảng liên kết sản phẩm và nguyên liệu
CREATE TABLE product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0), -- Số lượng nguyên liệu cần cho 1 sản phẩm (ví dụ: 10.00 gram)
  unit TEXT NOT NULL DEFAULT 'gram', -- Đơn vị (gram, ml, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Đảm bảo không trùng lặp combination
  UNIQUE(product_id, ingredient_id)
);

-- Tạo indexes cho performance
CREATE INDEX idx_product_ingredients_product_id ON product_ingredients(product_id);
CREATE INDEX idx_product_ingredients_ingredient_id ON product_ingredients(ingredient_id);

-- Bật Row Level Security
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;

-- Policies cho admin quản lý
CREATE POLICY "Admins can manage product_ingredients" ON product_ingredients FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Policy cho public đọc (để xem nguyên liệu của sản phẩm)
CREATE POLICY "Public can read product_ingredients" ON product_ingredients FOR SELECT
  USING (true);

-- Tạo trigger để cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_ingredients_updated_at 
  BEFORE UPDATE ON product_ingredients
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Thêm comment cho bảng
COMMENT ON TABLE product_ingredients IS 'Bảng liên kết sản phẩm và nguyên liệu, lưu số lượng cần thiết cho mỗi sản phẩm';
COMMENT ON COLUMN product_ingredients.quantity IS 'Số lượng nguyên liệu cần cho 1 sản phẩm (ví dụ: 10.00 gram)';
COMMENT ON COLUMN product_ingredients.unit IS 'Đơn vị đo lường (gram, ml, cốc, thìa, v.v.)';
