import { useState } from "react";
import { LinkWithAnalytics } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

interface QrCodeModalProps {
  open: boolean;
  onClose: () => void;
  link: LinkWithAnalytics | null;
}

export default function QrCodeModal({ open, onClose, link }: QrCodeModalProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  if (!link) return null;
  
  const shortUrl = `${window.location.origin}/r/${link.shortCode}`;
  
  const handleDownload = () => {
    setIsDownloading(true);
    
    try {
      const canvas = document.querySelector('#qr-code-canvas canvas');
      if (!canvas) {
        throw new Error("QR code canvas not found");
      }
      
      const dataUrl = (canvas as HTMLCanvasElement).toDataURL("image/png");
      const downloadLink = document.createElement("a");
      
      downloadLink.href = dataUrl;
      downloadLink.download = `qrcode-${link.shortCode}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast({
        title: "QR Code downloaded",
        description: "Your QR code has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was an error downloading the QR code.",
        variant: "destructive",
      });
      console.error("QR code download error:", error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleShare = async () => {
    setIsSharing(true);
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Shared QR Code",
          text: `Check out this link: ${shortUrl}`,
          url: shortUrl,
        });
        
        toast({
          title: "Link shared",
          description: "Your link has been shared successfully.",
        });
      } else {
        // Fallback for browsers that don't support navigator.share
        navigator.clipboard.writeText(shortUrl);
        
        toast({
          title: "Link copied",
          description: "Link copied to clipboard for sharing.",
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Share failed",
          description: "There was an error sharing the QR code.",
          variant: "destructive",
        });
        console.error("QR code share error:", error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription>
            Scan this QR code to access your shortened URL
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center p-4">
          <div className="bg-white p-4 rounded-lg mb-4" id="qr-code-canvas">
            <QRCodeCanvas
              value={shortUrl}
              size={200}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "https://raw.githubusercontent.com/Achraf-haddar/bitly-clone/main/client/src/assets/logo.png",
                height: 24,
                width: 24,
                excavate: true,
              }}
            />
          </div>
          
          <p className="text-sm text-muted-foreground mb-4 text-center break-all">
            <span>Scan to access:</span>{" "}
            <strong className="text-primary font-medium">
              {shortUrl}
            </strong>
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              className="flex items-center gap-2"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleShare}
              disabled={isSharing}
            >
              {isSharing ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              <span>Share</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
