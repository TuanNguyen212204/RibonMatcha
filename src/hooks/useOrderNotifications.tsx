import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client.ts';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useOrderNotifications = (userId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const statusEmojis: Record<string, string> = {
            Pending: '⏳',
            Preparing: '👨‍🍳',
            Shipping: '🚚',
            Delivered: '✅',
            Completed: '🎉',
            Failed: '❌',
          };

          toast.success(
            `Order Update ${statusEmojis[newStatus] || '📦'}`,
            {
              description: `Your order is now: ${newStatus}`,
            }
          );

          // Refresh orders data
          queryClient.invalidateQueries({ queryKey: ['user-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
};