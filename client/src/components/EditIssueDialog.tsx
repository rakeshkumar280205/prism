import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIssueSchema } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";

const editIssueSchema = insertIssueSchema.partial().extend({
  image: z.any().optional(),
});

type EditIssueForm = z.infer<typeof editIssueSchema>;

interface EditIssueDialogProps {
  issue: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FormData) => void;
  isSaving: boolean;
}

export function EditIssueDialog({ issue, isOpen, onClose, onSave, isSaving }: EditIssueDialogProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { register, handleSubmit, formState: { errors }, watch } = useForm<EditIssueForm>({
    resolver: zodResolver(editIssueSchema),
    defaultValues: {
      title: issue?.title || "",
      description: issue?.description || "",
      category: issue?.category || "",
      ward: issue?.ward?.toString() || "",
      address: issue?.address || "",
    },
  });

  const category = watch("category");

  const onSubmit = (data: EditIssueForm) => {
    const formData = new FormData();
    if (data.title) formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    if (data.category) formData.append("category", data.category);
    if (data.ward) formData.append("ward", data.ward);
    if (data.address) formData.append("address", data.address);
    if (imageFile) formData.append("image", imageFile);
    
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Issue</DialogTitle>
          <DialogDescription>Update your issue details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Issue title"
              {...register("title")}
              data-testid="input-edit-title"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Detailed description"
              {...register("description")}
              data-testid="input-edit-description"
              className="resize-none"
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select defaultValue={category} onValueChange={(value) => register("category").onChange({ target: { value } })}>
              <SelectTrigger id="category" data-testid="select-edit-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Roads">Roads</SelectItem>
                <SelectItem value="Drainage">Drainage</SelectItem>
                <SelectItem value="Garbage">Garbage</SelectItem>
                <SelectItem value="Streetlights">Streetlights</SelectItem>
                <SelectItem value="Water Supply">Water Supply</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="ward">Ward Number (1-200)</Label>
            <Input
              id="ward"
              type="number"
              placeholder="Ward number"
              min="1"
              max="200"
              {...register("ward")}
              data-testid="input-edit-ward"
            />
            {errors.ward && <p className="text-xs text-red-500 mt-1">{errors.ward.message}</p>}
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Specific location"
              {...register("address")}
              data-testid="input-edit-address"
            />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
          </div>

          <div>
            <Label htmlFor="image">Image (optional)</Label>
            {issue?.image && (
              <div className="text-sm text-slate-600 mb-2">Current image: {issue.image}</div>
            )}
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              data-testid="input-edit-image"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} data-testid="button-save-edit">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
