import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Users, Clock, ChevronRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { fadeIn, fadeInFast, hoverCard } from "@/lib/animations";
// Add these imports
import { useEffect, useState } from "react";
import { Meeting, meetingsService } from "@/services/meetings";
import { Skeleton } from "@/components/ui/skeleton";

function UpcomingMeeting({ title, time, participants, delay = 0 }: { 
  title: string; 
  time: string; 
  participants: number;
  delay?: number;
}) {
  return (
    <Card className={cn(
      "mb-4 transition-all duration-200 cursor-pointer",
      hoverCard,
      fadeInFast,
      `delay-[${delay}ms]`
    )}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-medium text-foreground text-lg">{title}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Clock className="h-4 w-4" />
              <span>{time}</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="hover:scale-105 active:scale-95 transition-transform">
            Join
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{participants} participants</span>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentRecording({ title, date, duration, id, delay = 0 }: {
  title: string;
  date: string;
  duration: string;
  id: number;  // Add id parameter
  delay?: number;
}) {
  const navigate = useNavigate();

  return (
    <Card 
      className={cn(
        "mb-4 cursor-pointer",
        hoverCard,
        fadeInFast,
        `delay-[${delay}ms]`
      )}
      onClick={() => navigate(`/meetings/${id}`)}  // Use the actual meeting ID
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{date}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{duration}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 transition-transform group"
          >
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const data = await meetingsService.listMeetings(0, 1000);
        setMeetings(data);
      } catch (error) {
        console.error('Failed to fetch meetings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  return (
    <div className="space-y-8">
      <div className={cn("flex justify-between items-center", fadeIn)}>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, John</h1>
          <p className="text-muted-foreground text-lg">Here's what's happening with your meetings</p>
        </div>
        <Button 
          className={cn(
            "bg-indigo-500 hover:bg-indigo-600 text-white px-6",
            "hover:scale-105 active:scale-95 transition-all duration-200",
            "shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30"
          )}
          onClick={() => navigate('/new-meeting')}
        >
          <Plus className="h-5 w-5 mr-2" /> New Meeting
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        {/* <Card className={cn(fadeIn, "delay-100")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Upcoming Meetings</CardTitle>
            <CardDescription>Your scheduled meetings for today</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <UpcomingMeeting 
                title="Weekly Team Sync"
                time="Today at 2:00 PM"
                participants={5}
                delay={200}
              />
              <UpcomingMeeting 
                title="Product Review"
                time="Today at 4:00 PM"
                participants={8}
                delay={300}
              />
              <UpcomingMeeting 
                title="Client Presentation"
                time="Tomorrow at 10:00 AM"
                participants={12}
                delay={400}
              />
            </ScrollArea>
          </CardContent>
        </Card> */}

        <Card className={cn(fadeIn, "delay-200")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Recent Recordings</CardTitle>
            <CardDescription>Access your past meeting recordings</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {loading ? (
                // Loading skeleton
                [...Array(3)].map((_, i) => (
                  <Card key={i} className="mb-4">
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-2/3 mb-4" />
                      <Skeleton className="h-4 w-1/3" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                meetings.map((meeting) => (
                  <RecentRecording
                    key={meeting.id}
                    id={meeting.id}  // Pass the id
                    title={meeting.title}
                    date={meeting.date}
                    duration={meeting.duration}
                  />
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}