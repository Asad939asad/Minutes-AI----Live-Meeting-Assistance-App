import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Calendar,
  Users,
  Clock,
  MoreVertical,
  Download,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
// Add these imports
import { useEffect, useState } from "react";
import { Meeting, meetingsService } from "@/services/meetings";
import { Skeleton } from "@/components/ui/skeleton";

export function MeetingsList() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const data = await meetingsService.listMeetings();
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Meetings</h1>
          <p className="text-muted-foreground text-lg">View and manage your meeting recordings</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search meetings..." 
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" /> Filter by date
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                  </TableRow>
                ))
              ) : (
                meetings.map((meeting) => (
                  <TableRow 
                    key={meeting.id} 
                    className="cursor-pointer"
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                  >
                    <TableCell className="font-medium">{meeting.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {meeting.date}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {meeting.duration}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {meeting.participants}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                        Completed
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}