// Script to reset all products to active status
// Run this in your browser console on your Supabase project

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetAllProducts() {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ 
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('is_active', false)

    if (error) {
      console.error('Error resetting products:', error)
    } else {
      console.log('Successfully reset all products to active status!')
      console.log('Affected rows:', data)
    }
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

// Run the function
resetAllProducts()
