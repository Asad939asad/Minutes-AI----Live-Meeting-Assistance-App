import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Calendar, 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Plus,
  Users,
  Clock,
  ChevronRight,
  Mic
} from "lucide-react";
import { cn } from '@/lib/utils';
import { Dashboard } from '@/pages/Dashboard';
import { MeetingsList } from '@/pages/MeetingsList';
import { NewMeeting } from '@/pages/NewMeeting';
import { MeetingDetails } from '@/pages/MeetingDetails';
import { Settings as SettingsPage } from '@/pages/Settings';
import { AIManager } from './pages/AIManager';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-screen w-72 bg-background border-r border-border p-6 flex flex-col fixed">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <Mic className="h-7 w-7 text-indigo-400" />
          <h1 className="text-2xl font-semibold text-foreground">Minutes.ai</h1>
        </div>
        <ThemeToggle />
      </div>
      
      <nav className="space-y-2">

        <Button 
          variant={isActive('/') ? "secondary" : "ghost"} 
          className="w-full justify-start gap-3 text-base font-medium"
          onClick={() => navigate('/')}
        >
          <LayoutDashboard className="h-5 w-5" /> Dashboard
        </Button>
        <Button 
          variant={isActive('/meetings') ? "secondary" : "ghost"} 
          className="w-full justify-start gap-3 text-base font-medium"
          onClick={() => navigate('/ai-manager')}
        >
          <Calendar className="h-5 w-5" /> AI Manager
        </Button>
        <Button 
          variant={isActive('/meetings') ? "secondary" : "ghost"} 
          className="w-full justify-start gap-3 text-base font-medium"
          onClick={() => navigate('/meetings')}
        >
          <Calendar className="h-5 w-5" /> Meetings
        </Button>
        <Button 
          variant={isActive('/templates') ? "secondary" : "ghost"} 
          className="w-full justify-start gap-3 text-base font-medium"
          onClick={() => navigate('/templates')}
        >
          <FileText className="h-5 w-5" /> Templates
        </Button>
        <Button 
          variant={isActive('/settings') ? "secondary" : "ghost"} 
          className="w-full justify-start gap-3 text-base font-medium"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-5 w-5" /> Settings
        </Button>
      </nav>
      
      <div className="mt-auto">
        <Separator className="my-6" />
        <div className="flex items-center gap-4 px-2">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            JD
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">John Doe</p>
            <p className="text-xs text-muted-foreground">john@example.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 pl-72">
        <div className="container mx-auto py-8 px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/meetings" element={<MeetingsList />} />
          <Route path="/meetings/:id" element={<MeetingDetails />} />
          <Route path="/new-meeting" element={<NewMeeting />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/ai-manager" element={<AIManager />} />
        </Routes>
      </Layout>
    </Router>
  );
}