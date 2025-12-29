import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactSchema } from "@shared/schema";
import { z } from "zod";
import { cn } from "@/lib/utils";

type ContactFormData = z.infer<typeof insertContactSchema>;

interface ContactFormProps {
  candidateId?: string;
  clientId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ContactForm({ candidateId, clientId, onSuccess, onCancel }: ContactFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fixed recruiter ID for demo
  const DEMO_RECRUITER_ID = "c63b07a5-7323-4ae3-b3d5-e871d13526f0";

  const createContactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create contact');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      if (candidateId) {
        queryClient.invalidateQueries({ queryKey: ['/api/candidates', candidateId, 'contacts'] });
      }
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId, 'contacts'] });
      }
      reset();
      onSuccess?.();
      toast({ title: "Success", description: "Contact logged successfully!" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      recruiterId: DEMO_RECRUITER_ID,
      candidateId,
      clientId,
    }
  });

  const onSubmit = (data: ContactFormData) => {
    createContactMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Contact Type *</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger data-testid="select-contact-type">
                  <SelectValue placeholder="Select contact type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="video_call">Video Call</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && (
            <p className="text-sm text-destructive">{errors.type.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            {...register("subject")}
            data-testid="input-subject"
            placeholder="e.g., Initial screening call"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes *</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          data-testid="input-notes"
          placeholder="Describe the conversation, key points discussed, next steps..."
          rows={4}
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      <div>
        <Label>Follow-up Date (Optional)</Label>
        <Controller
          name="followUpDate"
          control={control}
          render={({ field }) => (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                  data-testid="button-follow-up-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(field.value, "PPP") : "Select follow-up date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={(date) => {
                    field.onChange(date);
                    setIsOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createContactMutation.isPending}
          data-testid="button-submit"
        >
          {createContactMutation.isPending ? "Logging..." : "Log Contact"}
        </Button>
      </div>
    </form>
  );
}