import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LinkWithAnalytics, ClickStat } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ClicksChartProps {
  className?: string;
}

export default function ClicksChart({ className }: ClicksChartProps) {
  const [timeRange, setTimeRange] = useState("7");
  
  // Fetch links with click stats
  const { data: links, isLoading } = useQuery<LinkWithAnalytics[]>({
    queryKey: ["/api/links"],
  });

  // Prepare data for chart
  const prepareChartData = () => {
    if (!links || links.length === 0) return [];
    
    // Combine all link click stats
    const allClicksData: ClickStat[] = [];
    
    links.forEach(link => {
      // Skip links without click stats
      if (!link.clickStats) return;
      
      link.clickStats.forEach(stat => {
        const existingIndex = allClicksData.findIndex(s => s.date === stat.date);
        if (existingIndex >= 0) {
          // Add to existing date
          allClicksData[existingIndex].count += stat.count;
        } else {
          // Add new date entry
          allClicksData.push({ ...stat });
        }
      });
    });
    
    // Sort by date
    return allClicksData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  const chartData = prepareChartData();
  
  // Format date for x-axis
  const formatXAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-2 rounded shadow-sm">
          <p className="font-medium">{new Date(label).toLocaleDateString()}</p>
          <p className="text-primary">Clicks: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Clicks Over Time</CardTitle>
        <Select
          value={timeRange}
          onValueChange={setTimeRange}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-[250px] w-full" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No click data available yet</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'var(--muted-foreground)' }} 
                  tickFormatter={formatXAxis}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis 
                  tick={{ fill: 'var(--muted-foreground)' }} 
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Clicks"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
