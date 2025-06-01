import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Settings() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground text-lg">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations">
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Profile Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    defaultValue="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    defaultValue="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  defaultValue="john@example.com"
                />
              </div>

              <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your meetings
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Meeting Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified before scheduled meetings
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Action Item Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications about assigned action items
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Connected Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted border">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-medium text-foreground">Zoom</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your Zoom account for seamless meeting integration
                    </p>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted border">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-medium text-foreground">Google Calendar</h3>
                    <p className="text-sm text-muted-foreground">
                      Sync your meetings with Google Calendar
                    </p>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted border">
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-medium text-foreground">Slack</h3>
                    <p className="text-sm text-muted-foreground">
                      Share meeting summaries directly to Slack
                    </p>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}