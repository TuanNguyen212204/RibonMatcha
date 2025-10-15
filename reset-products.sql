-- Reset all products to active status
-- This script will set all products back to is_active = true
-- Run this in your Supabase SQL editor

UPDATE products 
SET is_active = true, 
    updated_at = NOW()
WHERE is_active = false;
