import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import StatsGrid from "@/components/stats-grid";
import ClicksChart from "@/components/charts/clicks-chart";
import DevicesChart from "@/components/charts/devices-chart";
import CreateLinkForm from "@/components/create-link-form";
import LinksTable from "@/components/links-table";
import QrCodeModal from "@/components/qr-code-modal";
import { useQuery } from "@tanstack/react-query";
import { LinkWithAnalytics } from "@shared/schema";
import { Button } from "@/components/ui/button";

// Dashboard section component
function DashboardSection() {
  return (
    <>
      {/* Stats Grid */}
      <StatsGrid />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ClicksChart className="lg:col-span-2" />
        <DevicesChart />
      </div>
    </>
  );
}

// Links section component
function LinksSection({ 
  links = [] as LinkWithAnalytics[], 
  isLoading = false, 
  searchQuery = "",
  onQrCodeClick = (link: LinkWithAnalytics) => {}
}: {
  links?: LinkWithAnalytics[];
  isLoading?: boolean;
  searchQuery?: string;
  onQrCodeClick?: (link: LinkWithAnalytics) => void;
}) {
  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Your Links</h2>
            <p className="text-muted-foreground">Manage and track all your shortened links</p>
          </div>
          <Link href="/create">
            <Button>Create New Link</Button>
          </Link>
        </div>
      </div>
      
      <LinksTable 
        links={links} 
        isLoading={isLoading}
        searchQuery={searchQuery}
        onQrCodeClick={onQrCodeClick}
      />
    </>
  );
}

// Create Link section component
function CreateSection() {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Create New Link</h2>
        <p className="text-muted-foreground">Create a new shortened link with optional settings</p>
      </div>
      
      <CreateLinkForm />
    </>
  );
}

// QR Codes section component
function QrCodesSection({ 
  links = [] as LinkWithAnalytics[], 
  isLoading = false,
  onQrCodeClick = (link: LinkWithAnalytics) => {}
}: {
  links?: LinkWithAnalytics[];
  isLoading?: boolean;
  onQrCodeClick?: (link: LinkWithAnalytics) => void;
}) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">QR Codes</h2>
        <p className="text-muted-foreground">Generate and download QR codes for your links</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p>Loading QR codes...</p>
        ) : links.length === 0 ? (
          <p>No links found. Create some links to generate QR codes.</p>
        ) : (
          links.map(link => (
            <div key={link.id} className="bg-card rounded-lg p-4 border">
              <div className="mb-2 font-medium truncate">{link.originalUrl}</div>
              <div className="text-sm text-muted-foreground mb-3">/{link.shortCode}</div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onQrCodeClick(link)}
              >
                View QR Code
              </Button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// Settings section component
function SettingsSection() {
  const { user } = useAuth();
  
  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>
      
      <div className="bg-card rounded-lg p-6 border">
        <h3 className="text-lg font-medium mb-4">Account Information</h3>
        <div className="space-y-2">
          <div>
            <div className="text-sm text-muted-foreground">Username</div>
            <div>{user?.username}</div>
          </div>
          {user?.email && (
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div>{user.email}</div>
            </div>
          )}
          <div>
            <div className="text-sm text-muted-foreground">Member since</div>
            <div>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkWithAnalytics | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch links for the logged-in user
  const { data: links, isLoading: isLoadingLinks } = useQuery<LinkWithAnalytics[]>({
    queryKey: ["/api/links"],
  });

  // Handle QR code generation
  const handleQrCodeClick = (link: LinkWithAnalytics) => {
    setSelectedLink(link);
    setQrModalOpen(true);
  };
  
  // Determine page title and content based on route
  let pageTitle = "Dashboard";
  let pageDescription = "Overview of your link analytics";
  
  if (location === "/links") {
    pageTitle = "Your Links";
    pageDescription = "Manage and track all your shortened links";
  } else if (location === "/create") {
    pageTitle = "Create Link";
    pageDescription = "Create a new shortened link";
  } else if (location === "/qr-codes") {
    pageTitle = "QR Codes";
    pageDescription = "Generate and download QR codes";
  } else if (location === "/settings") {
    pageTitle = "Settings";
    pageDescription = "Manage your account settings";
  }

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageDescription}</p>
          </div>

          {/* Render different sections based on route */}
          {location === "/" && (
            <DashboardSection />
          )}
          
          {(location === "/" || location === "/links") && (
            <LinksSection 
              links={links || []}
              isLoading={isLoadingLinks}
              searchQuery={searchQuery}
              onQrCodeClick={handleQrCodeClick}
            />
          )}
          
          {location === "/create" && (
            <CreateSection />
          )}
          
          {location === "/qr-codes" && (
            <QrCodesSection 
              links={links || []}
              isLoading={isLoadingLinks}
              onQrCodeClick={handleQrCodeClick}
            />
          )}
          
          {location === "/settings" && (
            <SettingsSection />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto px-4 py-4 text-sm text-muted-foreground text-center border-t border-gray-200 dark:border-gray-800">
          &copy; {new Date().getFullYear()} LinkInsight. All rights reserved.
        </footer>
      </div>

      {/* QR Code Modal */}
      <QrCodeModal 
        open={qrModalOpen} 
        onClose={() => setQrModalOpen(false)} 
        link={selectedLink}
      />
    </div>
  );
}
