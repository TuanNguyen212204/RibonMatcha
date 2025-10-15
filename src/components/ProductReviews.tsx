import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client.ts";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { Star } from "lucide-react";
import { toast } from "sonner";

export const ProductReviews = ({ productId }: { productId: string }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch usernames separately
      const reviewsWithProfiles = await Promise.all(
        (data || []).map(async (review) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', review.user_id)
            .single();
          return { ...review, profile };
        })
      );
      
      return reviewsWithProfiles;
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error('Must be logged in');
      const { error } = await supabase.from('reviews').insert({
        product_id: productId,
        user_id: session.user.id,
        rating,
        comment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      toast.success("Review added! 💕");
      setOpen(false);
      setComment("");
      setRating(5);
    },
  });

  const avgRating = reviews?.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-display text-primary font-bold">Customer Reviews</h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={`w-5 h-5 ${parseFloat(avgRating) >= star ? 'fill-kawaii-yellow text-kawaii-yellow' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="text-lg font-semibold">{avgRating}</span>
            <span className="text-muted-foreground">({reviews?.length || 0} reviews)</span>
          </div>
        </div>
        {session && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="kawaii">Write a Review</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl text-primary font-bold">Share Your Experience</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Rating</label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setRating(star)}>
                        <Star className={`w-8 h-8 cursor-pointer transition-all ${rating >= star ? 'fill-kawaii-yellow text-kawaii-yellow' : 'text-gray-300 hover:text-kawaii-yellow'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Comment</label>
                  <Textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us what you think..."
                    className="mt-2"
                  />
                </div>
                <Button variant="matcha" className="w-full" onClick={() => createReviewMutation.mutate()}>
                  Submit Review
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {reviews?.map((review) => (
          <div key={review.id} className="bg-card p-6 rounded-3xl shadow-cute">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{review.profile?.username || 'Anonymous'}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-4 h-4 ${review.rating >= star ? 'fill-kawaii-yellow text-kawaii-yellow' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            {review.comment && <p className="mt-3 text-foreground">{review.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
