import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, LinkWithAnalytics } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Copy,
  BarChart2,
  QrCode,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Download,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface LinksTableProps {
  links: LinkWithAnalytics[];
  isLoading: boolean;
  searchQuery: string;
  onQrCodeClick: (link: LinkWithAnalytics) => void;
}

export default function LinksTable({
  links,
  isLoading,
  searchQuery,
  onQrCodeClick,
}: LinksTableProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [linkToDelete, setLinkToDelete] = useState<LinkWithAnalytics | null>(null);
  const itemsPerPage = 5;

  // Delete link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: number) => {
      await apiRequest("DELETE", `/api/links/${linkId}`);
    },
    onSuccess: () => {
      toast({
        title: "Link deleted",
        description: "The link has been successfully deleted.",
      });
      
      // Invalidate queries to refresh the links list and stats
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Close dialog
      setLinkToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter links based on filter and search query
  const filteredLinks = links
    .filter((link) => {
      if (filter === "active") {
        return !link.isExpired;
      } else if (filter === "expired") {
        return link.isExpired;
      } else if (filter === "expiring") {
        return link.isExpiringSoon;
      }
      return true;
    })
    .filter((link) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        link.originalUrl.toLowerCase().includes(query) ||
        link.shortCode.toLowerCase().includes(query) ||
        (link.customAlias && link.customAlias.toLowerCase().includes(query))
      );
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);
  const paginatedLinks = filteredLinks.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Copy link to clipboard
  const copyToClipboard = (shortCode: string) => {
    const fullUrl = `${window.location.origin}/r/${shortCode}`;
    navigator.clipboard.writeText(fullUrl).then(
      () => {
        toast({
          title: "Copied to clipboard",
          description: "Link has been copied to your clipboard.",
        });
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast({
          title: "Failed to copy",
          description: "Could not copy link to clipboard.",
          variant: "destructive",
        });
      }
    );
  };

  // Format date
  const formatDate = (dateString: Date | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Get status badge for link
  const getStatusBadge = (link: LinkWithAnalytics) => {
    if (link.isExpired) {
      return (
        <Badge variant="destructive">Expired</Badge>
      );
    } else if (link.isExpiringSoon) {
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-400">
          Expires Soon
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-400">
          Active
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <CardTitle>Recent Links</CardTitle>
        <div className="flex items-center space-x-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter links" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All links</SelectItem>
              <SelectItem value="active">Active links</SelectItem>
              <SelectItem value="expired">Expired links</SelectItem>
              <SelectItem value="expiring">Expiring soon</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Link details</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-5 w-36" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              ) : paginatedLinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery
                      ? "No links found matching your search query"
                      : "No links created yet. Create your first short link above!"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <a
                          href={`/r/${link.shortCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary font-medium text-sm hover:underline truncate max-w-xs"
                          title={`${window.location.origin}/r/${link.shortCode}`}
                        >
                          {window.location.host}/r/{link.shortCode}
                        </a>
                        <span
                          className="text-muted-foreground text-xs truncate max-w-xs"
                          title={link.originalUrl}
                        >
                          {link.originalUrl.length > 50
                            ? `${link.originalUrl.substring(0, 50)}...`
                            : link.originalUrl}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(link.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{link.clickCount}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(link)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(link.shortCode)}
                              >
                                <Copy className="h-4 w-4" />
                                <span className="sr-only">Copy link</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy link</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <BarChart2 className="h-4 w-4" />
                                <span className="sr-only">View analytics</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View analytics</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onQrCodeClick(link)}
                              >
                                <QrCode className="h-4 w-4" />
                                <span className="sr-only">Generate QR code</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Generate QR code</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <AlertDialog
                          open={linkToDelete?.id === link.id}
                          onOpenChange={(open) => {
                            if (!open) setLinkToDelete(null);
                          }}
                        >
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setLinkToDelete(link)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete link</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this link? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  if (linkToDelete) {
                                    deleteLinkMutation.mutate(linkToDelete.id);
                                  }
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteLinkMutation.isPending ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex items-center justify-between px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * itemsPerPage + 1, filteredLinks.length)} to{" "}
            {Math.min(page * itemsPerPage, filteredLinks.length)} of {filteredLinks.length} results
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-disabled={page === 1 ? "true" : "false"}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Calculate page numbers to show based on current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={page === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              {totalPages > 5 && page < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-disabled={page === totalPages ? "true" : "false"}
                  className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardFooter>
      )}
    </Card>
  );
}
