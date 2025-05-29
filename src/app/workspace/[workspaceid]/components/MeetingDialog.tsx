"use client";

import { useState, useEffect } from "react";
import {
  Video,
  Copy,
  ExternalLink,
  Calendar,
  Users,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSession, signIn } from "next-auth/react";

interface MeetingDialogProps {
  workspaceId: string;
  workspaceName: string;
  currentUserEmail: string;
  googleMeetUrl?: string | null;
}

interface MeetingData {
  meetLink: string;
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface GoogleAuthStatus {
  hasGoogleAuth: boolean;
  hasCalendarScope: boolean;
  isTokenExpired: boolean;
  hasRefreshToken: boolean;
}

interface SessionMeeting {
  id: string;
  title: string;
  description?: string;
  meetLink: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export default function MeetingDialog({
  workspaceId,
  workspaceName,
  currentUserEmail,
  googleMeetUrl: initialGoogleMeetUrl,
}: MeetingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [meetingTitle, setMeetingTitle] = useState(
    `${workspaceName} Team Meeting`
  );
  const [meetingDescription, setMeetingDescription] = useState("");
  const [duration, setDuration] = useState(60); // minutes
  const [googleMeetUrl, setGoogleMeetUrl] = useState(initialGoogleMeetUrl);
  const [googleAuthStatus, setGoogleAuthStatus] =
    useState<GoogleAuthStatus | null>(null);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"permanent" | "oneSession">(
    "permanent"
  );
  const [sessionMeetings, setSessionMeetings] = useState<SessionMeeting[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);

  // Check Google auth status when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkGoogleAuthStatus();
    }
  }, [isOpen]);

  // If there's a permanent Google Meet URL, use it
  useEffect(() => {
    if (googleMeetUrl && isOpen) {
      setMeetingData({
        meetLink: googleMeetUrl,
        eventId: "permanent",
        title: `${workspaceName} Permanent Meeting Room`,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      });
    }
  }, [googleMeetUrl, isOpen, workspaceName]);

  const checkGoogleAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/check-google-auth");
      if (response.ok) {
        const data = await response.json();
        setGoogleAuthStatus(data);
      }
    } catch (error) {
      console.error("Error checking Google auth status:", error);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", {
      callbackUrl: window.location.href,
      scope: "openid email profile https://www.googleapis.com/auth/calendar",
    });
  };

  const generatePermanentMeetLink = async () => {
    if (
      !googleAuthStatus?.hasGoogleAuth ||
      !googleAuthStatus?.hasCalendarScope
    ) {
      toast({
        title: "Authentication Required",
        description: "Please sign in with Google and grant calendar access.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/workspace/${workspaceId}/meetings/generate-permanent`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate permanent meeting link"
        );
      }

      const data = await response.json();

      if (data.googleMeetUrl) {
        setGoogleMeetUrl(data.googleMeetUrl);
        setMeetingData({
          meetLink: data.googleMeetUrl,
          eventId: "permanent",
          title: `${workspaceName} Permanent Meeting Room`,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });

        toast({
          title: "Success",
          description:
            data.message || "Permanent meeting link generated successfully.",
        });
      } else {
        throw new Error("No meeting link was generated");
      }
    } catch (error) {
      console.error("Error generating permanent meeting link:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate permanent meeting link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createMeeting = async () => {
    if (
      !googleAuthStatus?.hasGoogleAuth ||
      !googleAuthStatus?.hasCalendarScope
    ) {
      toast({
        title: "Authentication Required",
        description: "Please sign in with Google and grant calendar access.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use different endpoints based on whether we're creating a session meeting or permanent meeting
      const endpoint =
        activeTab === "oneSession" && isCreatingSession
          ? `/api/workspace/${workspaceId}/meetings/session-meetings`
          : `/api/workspace/${workspaceId}/meetings/create`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: meetingTitle,
          description: meetingDescription,
          duration,
          organizerEmail: currentUserEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create meeting");
      }

      const data = await response.json();

      // Store the new meeting data
      setMeetingData(data);

      // If we're creating a session meeting, refresh the list and go back to list view
      if (activeTab === "oneSession" && isCreatingSession) {
        setIsCreatingSession(false);
        fetchSessionMeetings();
        toast({
          title: "Session Meeting Created",
          description: "New session meeting has been created successfully.",
        });
      } else {
        // For permanent tab, switch to showing the new meeting
        setActiveTab("permanent");
        toast({
          title: "Meeting Created",
          description: "Google Meet link has been generated successfully.",
        });
      }
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyMeetLink = async () => {
    if (meetingData?.meetLink) {
      try {
        await navigator.clipboard.writeText(meetingData.meetLink);
        toast({
          title: "Copied!",
          description: "Meeting link copied to clipboard.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy link.",
          variant: "destructive",
        });
      }
    }
  };

  const joinMeeting = () => {
    if (meetingData?.meetLink) {
      window.open(meetingData.meetLink, "_blank");
    }
  };

  const regenerateMeetLink = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/workspace/${workspaceId}/meetings/regenerate`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to regenerate meeting link");
      }

      const data = await response.json();

      if (data.googleMeetUrl) {
        setGoogleMeetUrl(data.googleMeetUrl);
        setMeetingData({
          meetLink: data.googleMeetUrl,
          eventId: "permanent-regenerated",
          title: `${workspaceName} Permanent Meeting Room`,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });

        toast({
          title: "Link Regenerated",
          description: "Permanent meeting link has been updated.",
        });
      } else {
        throw new Error("No meeting link was generated");
      }
    } catch (error) {
      console.error("Error regenerating meeting link:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to regenerate meeting link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const fetchSessionMeetings = async () => {
    setIsLoadingMeetings(true);
    try {
      const response = await fetch(
        `/api/workspace/${workspaceId}/meetings/session-meetings`
      );
      if (response.ok) {
        const data = await response.json();
        setSessionMeetings(data);
      } else {
        throw new Error("Failed to fetch session meetings");
      }
    } catch (error) {
      console.error("Error fetching session meetings:", error);
      toast({
        title: "Error",
        description: "Failed to load session meetings",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  // Show authentication warning if needed - Fixed boolean typing
  const showAuthWarning = Boolean(
    googleAuthStatus &&
      (!googleAuthStatus.hasGoogleAuth ||
        !googleAuthStatus.hasCalendarScope ||
        googleAuthStatus.isTokenExpired)
  );

  // Helper function to check if user can create meetings
  const canCreateMeetings = Boolean(
    googleAuthStatus?.hasGoogleAuth &&
      googleAuthStatus?.hasCalendarScope &&
      !googleAuthStatus?.isTokenExpired
  );

  useEffect(() => {
    if (isOpen && activeTab === "oneSession" && !isCreatingSession) {
      fetchSessionMeetings();
    }
  }, [isOpen, activeTab, isCreatingSession]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Video className="h-5 w-5" />
          <span className="sr-only">Meeting Room</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Meeting Room
          </DialogTitle>
          <DialogDescription>
            {googleMeetUrl
              ? "Join your workspace's permanent meeting room or create a new session."
              : "Generate a permanent meeting room for your workspace or create a one-time meeting."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Authentication Warning */}
          {showAuthWarning && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {!googleAuthStatus?.hasGoogleAuth &&
                  "You need to sign in with Google to create meetings."}
                {googleAuthStatus?.hasGoogleAuth &&
                  !googleAuthStatus?.hasCalendarScope &&
                  "Calendar access is required to create meetings."}
                {googleAuthStatus?.hasGoogleAuth &&
                  googleAuthStatus?.hasCalendarScope &&
                  googleAuthStatus?.isTokenExpired &&
                  "Your Google access has expired. Please sign in again."}
                <Button
                  variant="link"
                  className="p-0 h-auto ml-2"
                  onClick={handleGoogleSignIn}
                >
                  Sign in with Google
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!googleMeetUrl && !meetingData ? (
            // No permanent meeting link exists
            <div className="space-y-4">
              <div className="text-center py-6">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Permanent Meeting Room
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate a permanent meeting room for this workspace that all
                  members can use anytime.
                </p>
                <Button
                  onClick={generatePermanentMeetLink}
                  disabled={isLoading || !canCreateMeetings}
                  className="w-full"
                >
                  {isLoading
                    ? "Generating..."
                    : "Generate Permanent Meeting Room"}
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Or create a one-time meeting:</h4>
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Enter meeting title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={meetingDescription}
                    onChange={(e) => setMeetingDescription(e.target.value)}
                    placeholder="Meeting agenda or description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={15}
                    max={480}
                  />
                </div>

                <Button
                  onClick={createMeeting}
                  disabled={
                    isLoading || !meetingTitle.trim() || !canCreateMeetings
                  }
                  className="w-full"
                >
                  {isLoading
                    ? "Creating Meeting..."
                    : "Create One-Time Meeting"}
                </Button>
              </div>
            </div>
          ) : !meetingData ? (
            // Has permanent meeting link but not currently displayed
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title</Label>
                <Input
                  id="title"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Enter meeting title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  placeholder="Meeting agenda or description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={15}
                  max={480}
                />
              </div>

              <Button
                onClick={createMeeting}
                disabled={
                  isLoading || !meetingTitle.trim() || !canCreateMeetings
                }
                className="w-full"
              >
                {isLoading ? "Creating Meeting..." : "Create Google Meet"}
              </Button>
            </div>
          ) : (
            // Meeting Details or Create New Meeting
            <div className="space-y-4">
              {/* Tab Navigation */}
              <div className="flex border-b">
                <button
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === "permanent"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("permanent")}
                >
                  Permanent Room
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm ${
                    activeTab === "oneSession"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setActiveTab("oneSession")}
                >
                  One Session
                </button>
              </div>

              {activeTab === "oneSession" ? (
                // One Session Tab Content
                <div className="space-y-4">
                  {isCreatingSession ? (
                    // Create Session Form
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Meeting Title</Label>
                        <Input
                          id="title"
                          value={meetingTitle}
                          onChange={(e) => setMeetingTitle(e.target.value)}
                          placeholder="Enter meeting title"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">
                          Description (Optional)
                        </Label>
                        <Textarea
                          id="description"
                          value={meetingDescription}
                          onChange={(e) =>
                            setMeetingDescription(e.target.value)
                          }
                          placeholder="Meeting agenda or description"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          min={15}
                          max={480}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setIsCreatingSession(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            await createMeeting();
                            setIsCreatingSession(false);
                          }}
                          disabled={
                            isLoading ||
                            !meetingTitle.trim() ||
                            !canCreateMeetings
                          }
                          className="flex-1"
                        >
                          {isLoading
                            ? "Creating Meeting..."
                            : "Create Session Meeting"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Session Meetings List
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Session Meetings</h4>
                        <Button
                          onClick={() => setIsCreatingSession(true)}
                          disabled={!canCreateMeetings}
                          size="sm"
                        >
                          Create Session Meeting
                        </Button>
                      </div>

                      {isLoadingMeetings ? (
                        <div className="flex justify-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : sessionMeetings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-2" />
                          <p>No session meetings found</p>
                          <p className="text-sm">
                            Create a new session meeting to get started
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sessionMeetings.map((meeting) => (
                            <div
                              key={meeting.id}
                              className="rounded-lg border p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold">
                                    {meeting.title}
                                  </h3>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      {new Date(
                                        meeting.startTime
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className="flex items-center gap-1"
                                >
                                  <Users className="h-3 w-3" />
                                  Session
                                </Badge>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    if (meeting.meetLink) {
                                      navigator.clipboard.writeText(
                                        meeting.meetLink
                                      );
                                      toast({
                                        title: "Copied!",
                                        description:
                                          "Meeting link copied to clipboard.",
                                      });
                                    }
                                  }}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => {
                                    if (meeting.meetLink) {
                                      window.open(meeting.meetLink, "_blank");
                                    }
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Join
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Permanent Meeting Details - Keep this part unchanged
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{meetingData.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-4 w-4" />
                          <span>Permanent Meeting Room</span>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" />
                        Permanent
                      </Badge>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Google Meet Link
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={meetingData.meetLink}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copyMeetLink}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={joinMeeting} className="flex-1">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Meeting
                    </Button>
                    <Button
                      variant="outline"
                      onClick={regenerateMeetLink}
                      disabled={isLoading}
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${
                          isLoading ? "animate-spin" : ""
                        }`}
                      />
                      Regenerate Link
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
