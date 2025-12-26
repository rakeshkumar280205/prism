import { useState, useRef } from "react";
import { useCreateIssue } from "@/hooks/use-issues";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, MapPin } from "lucide-react";

export default function ReportIssue() {
  const createIssue = useCreateIssue();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    ward: "",
    address: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max size is 5MB", variant: "destructive" });
        return;
      }
      setImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeImage = () => {
    setImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => data.append(key, value));
    if (image) data.append("image", image);

    try {
      await createIssue.mutateAsync(data);
      toast({
        title: "Issue Reported",
        description: "Your issue has been submitted successfully.",
      });
      setLocation("/home");
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">Report an Issue</h1>
        <p className="text-slate-500 mt-2">Provide details about the problem to help us resolve it faster.</p>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base">Issue Title <span className="text-red-500">*</span></Label>
              <Input 
                id="title" 
                placeholder="e.g. Large pothole on Main Street" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                className="h-12"
              />
            </div>

            {/* Category & Ward */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                  required
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Roads">Roads & Potholes</SelectItem>
                    <SelectItem value="Drainage">Drainage & Sewage</SelectItem>
                    <SelectItem value="Garbage">Garbage Collection</SelectItem>
                    <SelectItem value="Streetlights">Streetlights</SelectItem>
                    <SelectItem value="Water Supply">Water Supply</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ward">Ward Number <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.ward} 
                  onValueChange={(v) => setFormData({...formData, ward: v})}
                  required
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>Ward {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="address">Location / Address <span className="text-red-500">*</span></Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="address" 
                  placeholder="Enter precise location or landmark" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  required
                  className="pl-9 h-11"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description <span className="text-red-500">*</span></Label>
              <Textarea 
                id="description" 
                placeholder="Describe the issue in detail..." 
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
                className="resize-none"
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Attach Photo (Optional)</Label>
              
              {!previewUrl ? (
                <div 
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-blue-50 p-3 rounded-full mb-3">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-medium text-slate-700">Click to upload image</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video group">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="destructive" size="sm" onClick={removeImage}>
                      <X className="h-4 w-4 mr-2" /> Remove Photo
                    </Button>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageChange} 
              />
            </div>

            <div className="pt-4 flex gap-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setLocation("/home")}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createIssue.isPending}>
                {createIssue.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
