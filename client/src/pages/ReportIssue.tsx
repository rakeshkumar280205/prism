import { useState, useRef, useEffect } from "react";
import { useCreateIssue } from "@/hooks/use-issues";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, MapPin, AlertCircle, ThumbsUp } from "lucide-react";
import { ImageModal } from "@/components/ImageModal";
import { apiRequest } from "@/lib/queryClient";
import { IssueWithVoteCount } from "@shared/schema";
import { useI18n } from "@/lib/i18n";

export default function ReportIssue() {
  const { language, t } = useI18n();
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
  const [duplicates, setDuplicates] = useState<IssueWithVoteCount[]>([]);

  useEffect(() => {
    const checkDuplicates = async () => {
      if (formData.title.length > 3 && formData.category && formData.ward) {
        try {
          const res = await apiRequest("POST", "/api/issues/check-duplicates", {
            title: formData.title,
            category: formData.category,
            ward: formData.ward
          });
          const data = await res.json();
          setDuplicates(data);
        } catch (err) {
          console.error("Failed to check duplicates", err);
        }
      } else {
        setDuplicates([]);
      }
    };

    const timer = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timer);
  }, [formData.title, formData.category, formData.ward]);

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
        title: t("report.success"),
        description: t("report.success_desc"),
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
    <div className={`max-w-2xl mx-auto py-8 ${language === 'kn' ? 'font-kannada' : ''}`}>
      <div className="mb-8">
        <h1 className={`font-display font-bold text-slate-900 ${language === 'kn' ? 'text-2xl' : 'text-3xl'}`}>{t("report.title")}</h1>
        <p className={`text-slate-500 mt-2 ${language === 'kn' ? 'text-sm' : 'text-base'}`}>{t("report.subtitle")}</p>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className={language === 'kn' ? 'text-sm' : 'text-base'}>{t("report.issue_title")} <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="category" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("report.category")} <span className="text-red-500">*</span></Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({...formData, category: v})}
                  required
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={t("report.category")} />
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
                <Label htmlFor="ward" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("report.ward")} <span className="text-red-500">*</span></Label>
                <Input 
                  id="ward" 
                  required 
                  type="number"
                  min="1"
                  max="200"
                  value={formData.ward}
                  onChange={(e) => {
                    const value = e.target.value;
                    const num = value ? parseInt(value) : "";
                    if (num === "" || (num >= 1 && num <= 200)) {
                      setFormData({...formData, ward: String(num === "" ? "" : num)});
                    }
                  }}
                  placeholder="Enter ward number (1-200)"
                  className="h-11"
                  data-testid="input-ward"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="address" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("report.address")} <span className="text-red-500">*</span></Label>
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
              <Label htmlFor="description" className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("report.description")} <span className="text-red-500">*</span></Label>
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
              <Label className={language === 'kn' ? 'text-xs' : 'text-sm'}>{t("report.image")}</Label>
              
              {!previewUrl ? (
                <div 
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-blue-50 p-3 rounded-full mb-3">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className={`font-medium text-slate-700 ${language === 'kn' ? 'text-sm' : ''}`}>{t("report.upload_click")}</p>
                  <p className="text-xs text-slate-400 mt-1">{t("report.upload_help")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImageModal 
                    src={previewUrl}
                    alt="Preview"
                  >
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video group cursor-pointer">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  </ImageModal>
                  <Button 
                    type="button"
                    variant="destructive" 
                    size="sm" 
                    onClick={removeImage}
                    className={`w-full ${language === 'kn' ? 'text-xs' : ''}`}
                  >
                    <X className="h-4 w-4 mr-2" /> {t("report.remove_photo")}
                  </Button>
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

            {/* Duplicate Warning */}
            {duplicates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className={`font-bold text-amber-800 ${language === 'kn' ? 'text-sm' : ''}`}>Possible Similar Issues Found</h4>
                    <p className={`text-amber-700 ${language === 'kn' ? 'text-[10px]' : 'text-sm'}`}>These issues in Ward {formData.ward} might be the same as yours. Consider upvoting them instead of creating a new report.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {duplicates.map((issue) => (
                    <div key={issue.id} className="bg-white border border-amber-100 rounded-lg p-3 flex justify-between items-center group hover:border-amber-300 transition-colors">
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="font-medium text-slate-900 truncate">{issue.title}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {issue.address}
                        </p>
                      </div>
                      <Link href={`/home`}>
                        <Button type="button" size="sm" variant="outline" className="h-8 border-amber-200 hover:bg-amber-50 text-amber-700">
                          <ThumbsUp className="h-3 w-3 mr-1" /> {issue.voteCount}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-4">
              <Button type="button" variant="outline" className={`flex-1 ${language === 'kn' ? 'text-xs' : ''}`} onClick={() => setLocation("/home")}>
                {t("report.cancel")}
              </Button>
              <Button type="submit" className={`flex-1 ${language === 'kn' ? 'text-xs' : ''}`} disabled={createIssue.isPending}>
                {createIssue.isPending ? t("report.submitting") : t("report.submit")}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
