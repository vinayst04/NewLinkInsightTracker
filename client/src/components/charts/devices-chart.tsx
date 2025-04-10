import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LinkWithAnalytics, DeviceStat } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useState } from "react";

export default function DevicesChart() {
  const [selectedView, setSelectedView] = useState("all");
  
  // Fetch links with device stats
  const { data: links, isLoading } = useQuery<LinkWithAnalytics[]>({
    queryKey: ["/api/links"],
  });
  
  // Prepare data for chart
  const prepareChartData = () => {
    if (!links || links.length === 0) return [];
    
    // Combine all device stats
    const deviceCounts: Record<string, number> = {};
    
    links.forEach(link => {
      // Skip links without device stats
      if (!link.deviceStats) return;
      
      link.deviceStats.forEach(stat => {
        deviceCounts[stat.device] = (deviceCounts[stat.device] || 0) + stat.count;
      });
    });
    
    // Convert to array for pie chart
    const chartData = Object.entries(deviceCounts).map(([device, count]) => ({
      device,
      count
    }));
    
    // Calculate percentages
    const total = chartData.reduce((sum, item) => sum + item.count, 0);
    
    return chartData.map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
    }));
  };
  
  const deviceData = prepareChartData();
  
  // Colors for the pie chart
  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))'
  ];
  
  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-2 rounded shadow-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-primary">{payload[0].value} clicks ({payload[0].payload.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Devices</CardTitle>
        <Select
          value={selectedView}
          onValueChange={setSelectedView}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All links" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All links</SelectItem>
            <SelectItem value="popular">Popular links</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[260px] flex items-center justify-center">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
          </div>
        ) : deviceData.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center">
            <p className="text-muted-foreground">No device data available yet</p>
          </div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="device"
                  label={({ device, percentage }) => `${percentage}%`}
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-2 mt-4">
          {deviceData.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              ></span>
              <span className="text-sm">{item.device}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
