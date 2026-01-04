import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MapPin, Clock, AlertCircle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useVoteIssue } from "@/hooks/use-issues";
import { useToast } from "@/hooks/use-toast";
import { type IssueWithVoteCount } from "@shared/schema";
import { motion } from "framer-motion";
import { ImageModal } from "@/components/ImageModal";
import { useI18n } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface IssueCardProps {
  issue: IssueWithVoteCount;
  isAdmin?: boolean;
  onStatusChange?: (id: number, status: string) => void;
  onDelete?: (id: number) => void;
}

const statusColors = {
  Pending: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200",
  "In Progress": "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
  Resolved: "bg-green-100 text-green-700 hover:bg-green-100 border-green-200",
};

export function IssueCard({ issue, isAdmin, onStatusChange, onDelete }: IssueCardProps) {
  const voteMutation = useVoteIssue();
  const { toast } = useToast();
  const { language, t } = useI18n();

  const handleVote = () => {
    if (isAdmin) return;
    voteMutation.mutate(issue.id, {
      onError: (err) => {
        toast({
          title: "Error voting",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={language === 'kn' ? 'font-kannada' : ''}
    >
      <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow group h-full flex flex-col">
        {/* Image Section */}
        <ImageModal 
          src={issue.image ? `/uploads/${issue.image}` : null}
          alt={issue.title}
        >
          <div className="relative h-48 w-full bg-slate-100 overflow-hidden cursor-pointer">
            {issue.image ? (
              <img 
                src={`/uploads/${issue.image}`} 
                alt={issue.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
                <span className="text-sm font-medium opacity-40">{language === 'kn' ? 'ಯಾವುದೇ ಚಿತ್ರವಿಲ್ಲ' : 'No image provided'}</span>
              </div>
            )}
            <div className="absolute top-3 right-3">
              <Badge 
                variant="outline" 
                className={`${statusColors[issue.status as keyof typeof statusColors] || "bg-slate-100"} backdrop-blur-sm shadow-sm font-semibold ${language === 'kn' ? 'text-[10px]' : ''}`}
              >
                {issue.status === 'Pending' ? t("analytics.pending") : 
                 issue.status === 'In Progress' ? t("analytics.progress") : 
                 issue.status === 'Resolved' ? t("analytics.resolved") : issue.status}
              </Badge>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-3 text-white text-xs font-medium flex items-center gap-1">
               <Badge variant="secondary" className={`bg-white/20 text-white border-white/30 backdrop-blur-md hover:bg-white/30 ${language === 'kn' ? 'text-[10px]' : ''}`}>
                 {issue.category}
               </Badge>
            </div>
          </div>
        </ImageModal>

        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className={`font-display font-semibold text-lg leading-tight text-slate-900 line-clamp-2 ${language === 'kn' ? 'text-base' : ''}`}>
              {issue.title}
            </h3>
          </div>
          <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(issue.createdAt || Date.now()), { addSuffix: true })}</span>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 flex-1">
          <p className={`text-slate-600 text-sm line-clamp-3 mb-4 ${language === 'kn' ? 'text-xs' : ''}`}>
            {issue.description}
          </p>
          
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">{t("common.ward")}: {issue.ward}</span>
              <span className="line-clamp-1">{issue.address}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-2 mt-auto flex-wrap">
          {!isAdmin ? (
            <Button 
              variant={issue.userHasVoted ? "default" : "outline"} 
              size="sm" 
              onClick={handleVote}
              className={`gap-2 transition-all ${issue.userHasVoted ? "bg-primary hover:bg-primary/90" : "hover:border-primary/50 hover:text-primary"} ${language === 'kn' ? 'text-[10px]' : ''}`}
              disabled={voteMutation.isPending}
            >
              <ThumbsUp className={`h-4 w-4 ${issue.userHasVoted ? "fill-current" : ""}`} />
              <span>{issue.voteCount} {language === 'kn' ? 'ಮತಗಳು' : 'Votes'}</span>
            </Button>
          ) : (
            <div className={`flex items-center gap-2 text-sm font-medium text-slate-600 ${language === 'kn' ? 'text-xs' : ''}`}>
              <ThumbsUp className="h-4 w-4 text-primary" />
              {issue.voteCount} {language === 'kn' ? 'ನಾಗರಿಕ ಮತಗಳು' : 'Citizen Votes'}
            </div>
          )}

          {isAdmin && onStatusChange && (
            <div className="flex gap-2 items-center ml-auto">
              <select
                className={`text-xs border rounded px-2 py-1 bg-white focus:ring-2 ring-primary/20 outline-none ${language === 'kn' ? 'text-[10px]' : ''}`}
                value={issue.status}
                onChange={(e) => onStatusChange(issue.id, e.target.value)}
                data-testid={`select-status-${issue.id}`}
              >
                <option value="Pending">{t("analytics.pending")}</option>
                <option value="In Progress">{t("analytics.progress")}</option>
                <option value="Resolved">{t("analytics.resolved")}</option>
              </select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    data-testid={`button-delete-issue-${issue.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{language === 'kn' ? 'ನೀವು ಖಚಿತವಾಗಿದ್ದೀರಾ?' : 'Are you absolutely sure?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {language === 'kn' ? 'ಈ ಕ್ರಮವನ್ನು ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.' : 'This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("report.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete?.(issue.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {language === 'kn' ? 'ಅಳಿಸಿ' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
