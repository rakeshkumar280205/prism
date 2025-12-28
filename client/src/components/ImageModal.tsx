import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn } from "lucide-react";

interface ImageModalProps {
  src: string | null;
  alt: string;
  children?: React.ReactNode;
}

export function ImageModal({ src, alt, children }: ImageModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) return children || null;

  return (
    <>
      <div
        className="relative cursor-pointer group"
        onClick={() => setIsOpen(true)}
        data-testid="image-maximizer-trigger"
      >
        {children}
        {/* Hover overlay with zoom icon */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg">
            <ZoomIn className="h-5 w-5 text-slate-900" />
          </div>
        </div>
      </div>

      {/* Full-screen image modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl w-full p-0 border-0 bg-black/95 backdrop-blur-sm">
          <div className="relative flex items-center justify-center min-h-screen md:min-h-96">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
              data-testid="image-modal-content"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-image-modal"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
