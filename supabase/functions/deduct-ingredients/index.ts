import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { order_id } = await req.json()

    if (!order_id) {
      throw new Error('order_id is required')
    }

    console.log('Processing order:', order_id)

    // Get order items
    const { data: orderItems, error: itemsError } = await supabaseClient
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', order_id)

    if (itemsError) {
      console.error('Error fetching order items:', itemsError)
      throw itemsError
    }

    if (!orderItems || orderItems.length === 0) {
      throw new Error('No order items found')
    }

    console.log('Order items:', orderItems)

    // Get all product ingredients for the ordered products
    const productIds = orderItems.map(item => item.product_id)
    const { data: productIngredients, error: piError } = await supabaseClient
      .from('product_ingredients')
      .select('product_id, ingredient_id, quantity, unit')
      .in('product_id', productIds)

    if (piError) {
      console.error('Error fetching product ingredients:', piError)
      throw piError
    }

    console.log('Product ingredients:', productIngredients)

    // Calculate total ingredients needed
    const ingredientUsage: Record<string, number> = {}
    
    orderItems.forEach(orderItem => {
      const requiredIngredients = productIngredients?.filter(
        pi => pi.product_id === orderItem.product_id
      ) || []
      
      requiredIngredients.forEach(pi => {
        const totalNeeded = pi.quantity * orderItem.quantity
        ingredientUsage[pi.ingredient_id] = (ingredientUsage[pi.ingredient_id] || 0) + totalNeeded
      })
    })

    console.log('Total ingredient usage:', ingredientUsage)

    // Check current stock levels
    const ingredientIds = Object.keys(ingredientUsage)
    const { data: ingredients, error: ingredientsError } = await supabaseClient
      .from('ingredients')
      .select('id, name, stock_quantity')
      .in('id', ingredientIds)

    if (ingredientsError) {
      console.error('Error fetching ingredients:', ingredientsError)
      throw ingredientsError
    }

    console.log('Current ingredients stock:', ingredients)

    // Check if we have enough stock
    const insufficientStock = ingredients?.filter(
      ing => ing.stock_quantity < ingredientUsage[ing.id]
    ) || []

    if (insufficientStock.length > 0) {
      const names = insufficientStock.map(ing => `${ing.name} (cần: ${ingredientUsage[ing.id]}, có: ${ing.stock_quantity})`).join(', ')
      throw new Error(`Không đủ nguyên liệu: ${names}`)
    }

    // Deduct ingredients from stock
    const updatePromises = Object.entries(ingredientUsage).map(([ingredientId, quantityUsed]) => {
      const ingredient = ingredients?.find(ing => ing.id === ingredientId)
      if (!ingredient) return Promise.resolve()

      console.log(`Deducting ${quantityUsed} from ${ingredient.name} (current: ${ingredient.stock_quantity})`)

      return supabaseClient
        .from('ingredients')
        .update({ 
          stock_quantity: ingredient.stock_quantity - quantityUsed 
        })
        .eq('id', ingredientId)
    })

    await Promise.all(updatePromises)

    console.log('Successfully deducted ingredients')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Ingredients deducted successfully',
        deducted: ingredientUsage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in deduct-ingredients function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
