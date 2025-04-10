import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpIcon, LinkIcon, MousePointerClick, CheckIcon, Clock } from "lucide-react";

type DashboardStats = {
  totalLinks: number;
  totalClicks: number;
  activeLinks: number;
  expiringLinks: number;
};

export default function StatsGrid() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Links */}
      <Card>
        <CardContent className="pt-6 px-5">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Total Links</p>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <LinkIcon className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          {isLoading ? (
            <Skeleton className="h-8 w-16 mt-2" />
          ) : (
            <h3 className="text-2xl font-bold mt-2">{stats?.totalLinks || 0}</h3>
          )}
          
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>New opportunities</span>
          </p>
        </CardContent>
      </Card>

      {/* Total Clicks */}
      <Card>
        <CardContent className="pt-6 px-5">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Total Clicks</p>
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <MousePointerClick className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          
          {isLoading ? (
            <Skeleton className="h-8 w-16 mt-2" />
          ) : (
            <h3 className="text-2xl font-bold mt-2">{stats?.totalClicks || 0}</h3>
          )}
          
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>Expanding reach</span>
          </p>
        </CardContent>
      </Card>

      {/* Active Links */}
      <Card>
        <CardContent className="pt-6 px-5">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Active Links</p>
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          {isLoading ? (
            <Skeleton className="h-8 w-16 mt-2" />
          ) : (
            <h3 className="text-2xl font-bold mt-2">{stats?.activeLinks || 0}</h3>
          )}
          
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>Working links</span>
          </p>
        </CardContent>
      </Card>

      {/* Expiring Soon */}
      <Card>
        <CardContent className="pt-6 px-5">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Expiring Soon</p>
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          
          {isLoading ? (
            <Skeleton className="h-8 w-16 mt-2" />
          ) : (
            <h3 className="text-2xl font-bold mt-2">{stats?.expiringLinks || 0}</h3>
          )}
          
          <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center mt-1">
            <Clock className="h-4 w-4 mr-1" />
            <span>Within 7 days</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
