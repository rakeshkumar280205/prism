import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MapPin, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useVoteIssue } from "@/hooks/use-issues";
import { useToast } from "@/hooks/use-toast";
import { type IssueWithVoteCount } from "@shared/schema";
import { motion } from "framer-motion";

interface IssueCardProps {
  issue: IssueWithVoteCount;
  isAdmin?: boolean;
  onStatusChange?: (id: number, status: string) => void;
}

const statusColors = {
  Pending: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200",
  "In Progress": "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
  Resolved: "bg-green-100 text-green-700 hover:bg-green-100 border-green-200",
};

export function IssueCard({ issue, isAdmin, onStatusChange }: IssueCardProps) {
  const voteMutation = useVoteIssue();
  const { toast } = useToast();

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
    >
      <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow group h-full flex flex-col">
        {/* Image Section */}
        <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
          {issue.image ? (
            <img 
              src={`/uploads/${issue.image}`} 
              alt={issue.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <AlertCircle className="h-10 w-10 mb-2 opacity-20" />
              <span className="text-sm font-medium opacity-40">No image provided</span>
            </div>
          )}
          <div className="absolute top-3 right-3">
            <Badge 
              variant="outline" 
              className={`${statusColors[issue.status as keyof typeof statusColors] || "bg-slate-100"} backdrop-blur-sm shadow-sm font-semibold`}
            >
              {issue.status}
            </Badge>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 text-white text-xs font-medium flex items-center gap-1">
             <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-md hover:bg-white/30">
               {issue.category}
             </Badge>
          </div>
        </div>

        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-display font-semibold text-lg leading-tight text-slate-900 line-clamp-2">
              {issue.title}
            </h3>
          </div>
          <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(issue.createdAt || Date.now()), { addSuffix: true })}</span>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 flex-1">
          <p className="text-slate-600 text-sm line-clamp-3 mb-4">
            {issue.description}
          </p>
          
          <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
            <div>
              <span className="font-semibold text-slate-700 block mb-0.5">Ward: {issue.ward}</span>
              <span className="line-clamp-1">{issue.address}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center mt-auto">
          {!isAdmin ? (
            <Button 
              variant={issue.userHasVoted ? "default" : "outline"} 
              size="sm" 
              onClick={handleVote}
              className={`gap-2 transition-all ${issue.userHasVoted ? "bg-primary hover:bg-primary/90" : "hover:border-primary/50 hover:text-primary"}`}
              disabled={voteMutation.isPending}
            >
              <ThumbsUp className={`h-4 w-4 ${issue.userHasVoted ? "fill-current" : ""}`} />
              <span>{issue.voteCount} Votes</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <ThumbsUp className="h-4 w-4 text-primary" />
              {issue.voteCount} Citizen Votes
            </div>
          )}

          {isAdmin && onStatusChange && (
            <select
              className="text-xs border rounded px-2 py-1 bg-white focus:ring-2 ring-primary/20 outline-none"
              value={issue.status}
              onChange={(e) => onStatusChange(issue.id, e.target.value)}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
