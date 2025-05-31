"use client";

import { useState, useEffect } from "react";
import axios from "axios";
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

interface PermanentMeetingData {
  meetLink: string;
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface SessionMeetingData {
  id: string;
  title: string;
  description?: string;
  meetLink: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}

interface GoogleAuthStatus {
  hasGoogleAuth: boolean;
  hasCalendarScope: boolean;
  isTokenExpired: boolean;
  hasRefreshToken: boolean;
}

interface SessionMeetingForm {
  title: string;
  description: string;
  duration: number;
}

// Create axios instance with default config
const api = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default function MeetingDialog({
  workspaceId,
  workspaceName,
  currentUserEmail,
  googleMeetUrl: initialGoogleMeetUrl,
}: MeetingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Separate states for permanent and session meetings
  const [permanentMeetingData, setPermanentMeetingData] =
    useState<PermanentMeetingData | null>(null);
  const [googleMeetUrl, setGoogleMeetUrl] = useState(initialGoogleMeetUrl);

  // Session meeting states
  const [sessionMeetings, setSessionMeetings] = useState<SessionMeetingData[]>(
    []
  );
  const [sessionMeetingForm, setSessionMeetingForm] =
    useState<SessionMeetingForm>({
      title: `${workspaceName} Team Meeting`,
      description: "",
      duration: 60,
    });
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);

  // Track if we have created at least one session meeting
  const [hasSessionMeetings, setHasSessionMeetings] = useState(false);

  const [googleAuthStatus, setGoogleAuthStatus] =
    useState<GoogleAuthStatus | null>(null);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"permanent" | "oneSession">(
    "permanent"
  );

  // Check Google auth status when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkGoogleAuthStatus();
      // Check if we have any session meetings
      fetchSessionMeetings().then((meetings) => {
        if (meetings && meetings.length > 0) {
          setHasSessionMeetings(true);
        }
      });
    }
  }, [isOpen]);

  // If there's a permanent Google Meet URL, use it
  useEffect(() => {
    if (googleMeetUrl && isOpen) {
      setPermanentMeetingData({
        meetLink: googleMeetUrl,
        eventId: "permanent",
        title: `${workspaceName} Permanent Meeting Room`,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    }
  }, [googleMeetUrl, isOpen, workspaceName]);

  const checkGoogleAuthStatus = async () => {
    try {
      const response = await api.get("/api/auth/check-google-auth");
      setGoogleAuthStatus(response.data);
      return response.data;
    } catch (error) {
      console.error("Error checking Google auth status:", error);
      return null;
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
      const response = await api.post(
        `/api/workspace/${workspaceId}/meetings/generate-permanent`
      );

      if (response.data.googleMeetUrl) {
        setGoogleMeetUrl(response.data.googleMeetUrl);
        setPermanentMeetingData({
          meetLink: response.data.googleMeetUrl,
          eventId: "permanent",
          title: `${workspaceName} Permanent Meeting Room`,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });

        toast({
          title: "Success",
          description:
            response.data.message ||
            "Permanent meeting link generated successfully.",
        });
      } else {
        throw new Error("No meeting link was generated");
      }
    } catch (error) {
      console.error("Error generating permanent meeting link:", error);

      if (axios.isAxiosError(error) && error.response?.data?.authRequired) {
        handleGoogleSignIn();
        return;
      }

      toast({
        title: "Error",
        description: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Failed to generate permanent meeting link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSessionMeeting = async () => {
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

    if (!sessionMeetingForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Meeting title is required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(
        `/api/workspace/${workspaceId}/meetings/session-meetings`,
        {
          title: sessionMeetingForm.title,
          description: sessionMeetingForm.description,
          duration: sessionMeetingForm.duration,
          organizerEmail: currentUserEmail,
        }
      );

      // Add the new session meeting to the list
      setSessionMeetings((prev) => [response.data, ...prev]);

      // Reset form
      setSessionMeetingForm({
        title: `${workspaceName} Team Meeting`,
        description: "",
        duration: 60,
      });

      // Mark that we have session meetings and switch to session tab
      setHasSessionMeetings(true);
      setActiveTab("oneSession");
      setIsCreatingSession(false);

      toast({
        title: "Session Meeting Created",
        description: "New session meeting has been created successfully.",
      });
    } catch (error) {
      console.error("Error creating session meeting:", error);

      if (axios.isAxiosError(error) && error.response?.data?.authRequired) {
        if (!session || !session.accessToken) {
          handleGoogleSignIn();
          return;
        } else {
          const authStatus = await checkGoogleAuthStatus();
          if (
            authStatus &&
            (!authStatus.hasGoogleAuth ||
              !authStatus.hasCalendarScope ||
              authStatus.isTokenExpired)
          ) {
            handleGoogleSignIn();
            return;
          }
        }
      }

      toast({
        title: "Error",
        description: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Failed to create session meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyMeetLink = async (meetLink: string) => {
    try {
      await navigator.clipboard.writeText(meetLink);
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
  };

  const joinMeeting = (meetLink: string) => {
    window.open(meetLink, "_blank");
  };

  const regeneratePermanentMeetLink = async () => {
    setIsLoading(true);
    try {
      const response = await api.post(
        `/api/workspace/${workspaceId}/meetings/regenerate`
      );

      if (response.data.googleMeetUrl) {
        setGoogleMeetUrl(response.data.googleMeetUrl);
        setPermanentMeetingData({
          meetLink: response.data.googleMeetUrl,
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

      if (axios.isAxiosError(error) && error.response?.data?.authRequired) {
        handleGoogleSignIn();
        return;
      }

      toast({
        title: "Error",
        description: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Failed to regenerate meeting link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionMeetings = async () => {
    setIsLoadingMeetings(true);
    try {
      const response = await api.get(
        `/api/workspace/${workspaceId}/meetings/session-meetings`
      );
      const meetings = response.data;
      setSessionMeetings(meetings);
      return meetings;
    } catch (error) {
      console.error("Error fetching session meetings:", error);
      toast({
        title: "Error",
        description: "Failed to load session meetings",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoadingMeetings(false);
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

  // Show authentication warning if needed
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

  // Determine if we should show the tabbed interface
  const showTabbedInterface = permanentMeetingData || hasSessionMeetings;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Video className="h-5 w-5" />
          <span className="sr-only">Meeting Room</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
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

        <div className="overflow-y-auto space-y-6 px-2 py-1">
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

          {!showTabbedInterface ? (
            // No permanent meeting link or session meetings exist
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
                <h4 className="font-medium">Or create a session meeting:</h4>
                <div className="space-y-2">
                  <Label htmlFor="session-title">Meeting Title</Label>
                  <Input
                    id="session-title"
                    value={sessionMeetingForm.title}
                    onChange={(e) =>
                      setSessionMeetingForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Enter meeting title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-description">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="session-description"
                    value={sessionMeetingForm.description}
                    onChange={(e) =>
                      setSessionMeetingForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Meeting agenda or description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-duration">Duration (minutes)</Label>
                  <Input
                    id="session-duration"
                    type="number"
                    value={sessionMeetingForm.duration}
                    onChange={(e) =>
                      setSessionMeetingForm((prev) => ({
                        ...prev,
                        duration: Number(e.target.value),
                      }))
                    }
                    min={15}
                    max={480}
                  />
                </div>

                <Button
                  onClick={createSessionMeeting}
                  disabled={
                    isLoading ||
                    !sessionMeetingForm.title.trim() ||
                    !canCreateMeetings
                  }
                  className="w-full"
                >
                  {isLoading
                    ? "Creating Meeting..."
                    : "Create One-Time Meeting"}
                </Button>
              </div>
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
                  disabled={!permanentMeetingData}
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
                        <Label htmlFor="new-session-title">Meeting Title</Label>
                        <Input
                          id="new-session-title"
                          value={sessionMeetingForm.title}
                          onChange={(e) =>
                            setSessionMeetingForm((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          placeholder="Enter meeting title"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-session-description">
                          Description (Optional)
                        </Label>
                        <Textarea
                          id="new-session-description"
                          value={sessionMeetingForm.description}
                          onChange={(e) =>
                            setSessionMeetingForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Meeting agenda or description"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-session-duration">
                          Duration (minutes)
                        </Label>
                        <Input
                          id="new-session-duration"
                          type="number"
                          value={sessionMeetingForm.duration}
                          onChange={(e) =>
                            setSessionMeetingForm((prev) => ({
                              ...prev,
                              duration: Number(e.target.value),
                            }))
                          }
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
                          onClick={createSessionMeeting}
                          disabled={
                            isLoading ||
                            !sessionMeetingForm.title.trim() ||
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
                        <div className="max-h-[250px] overflow-y-auto space-y-3">
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
                                  onClick={() => copyMeetLink(meeting.meetLink)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => joinMeeting(meeting.meetLink)}
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
              ) : // Permanent Meeting Details
              permanentMeetingData ? (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {permanentMeetingData.title}
                        </h3>
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
                          value={permanentMeetingData.meetLink}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            copyMeetLink(permanentMeetingData.meetLink)
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => joinMeeting(permanentMeetingData.meetLink)}
                      className="flex-1"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Meeting
                    </Button>
                    <Button
                      variant="outline"
                      onClick={regeneratePermanentMeetLink}
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
              ) : (
                // No permanent meeting but we have session meetings
                <div className="text-center py-6">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Permanent Meeting Room
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a permanent meeting room for this workspace that
                    all members can use anytime.
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
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
