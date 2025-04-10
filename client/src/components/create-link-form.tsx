import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link2Icon } from "lucide-react";
import { insertLinkSchema } from "@shared/schema";

// Form schema for create link form
const createLinkSchema = z.object({
  originalUrl: z.string()
    .url("Please enter a valid URL including http:// or https://")
    .min(1, "URL is required"),
  customAlias: z.string().optional(),
  expiresAt: z.string().optional(),
});

type CreateLinkFormValues = z.infer<typeof createLinkSchema>;

export default function CreateLinkForm() {
  const { toast } = useToast();
  const [customAliasAvailable, setCustomAliasAvailable] = useState<boolean | null>(null);

  const form = useForm<CreateLinkFormValues>({
    resolver: zodResolver(createLinkSchema),
    defaultValues: {
      originalUrl: "",
      customAlias: "",
      expiresAt: "",
    },
  });

  const createLinkMutation = useMutation({
    mutationFn: async (values: CreateLinkFormValues) => {
      const res = await apiRequest("POST", "/api/links", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Link created successfully",
        description: "Your shortened link is now ready to use.",
      });
      form.reset();
      setCustomAliasAvailable(null);
      
      // Invalidate queries to refresh the links list and stats
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: CreateLinkFormValues) => {
    createLinkMutation.mutate(values);
  };

  // Check if custom alias contains spaces or special chars
  const validateCustomAlias = (value: string) => {
    if (!value) {
      setCustomAliasAvailable(null);
      return true;
    }
    
    // Check for spaces and special characters except dash and underscore
    const isValid = /^[a-zA-Z0-9_-]+$/.test(value);
    setCustomAliasAvailable(isValid);
    return isValid || "Custom alias can only contain letters, numbers, dashes and underscores";
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Create New Short Link</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="originalUrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Long URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/your-long-url-goes-here" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customAlias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Alias (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="my-custom-name" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          validateCustomAlias(e.target.value);
                        }}
                      />
                    </FormControl>
                    {customAliasAvailable === false && (
                      <FormDescription className="text-destructive">
                        Only letters, numbers, dashes and underscores allowed
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={createLinkMutation.isPending || customAliasAvailable === false}
                className="flex items-center gap-2"
              >
                {createLinkMutation.isPending ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2Icon className="h-4 w-4" />
                    Create Short Link
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
