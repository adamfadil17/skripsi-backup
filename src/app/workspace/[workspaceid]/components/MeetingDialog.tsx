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
  Edit,
  Trash2,
  MoreVertical,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
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
  const [permanentMeetingData, setPermanentMeetingData] =
    useState<PermanentMeetingData | null>(null);
  const [googleMeetUrl, setGoogleMeetUrl] = useState(initialGoogleMeetUrl);
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

  const [editingMeeting, setEditingMeeting] =
    useState<SessionMeetingData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [hasSessionMeetings, setHasSessionMeetings] = useState(false);

  const [googleAuthStatus, setGoogleAuthStatus] =
    useState<GoogleAuthStatus | null>(null);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"permanent" | "oneSession">(
    "permanent"
  );

  useEffect(() => {
    if (isOpen) {
      checkGoogleAuthStatus();
      fetchSessionMeetings().then((meetings) => {
        if (meetings && meetings.length > 0) {
          setHasSessionMeetings(true);
        }
      });
    }
  }, [isOpen]);

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

        setActiveTab("permanent");

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

      setSessionMeetings((prev) => [response.data, ...prev]);

      setSessionMeetingForm({
        title: `${workspaceName} Team Meeting`,
        description: "",
        duration: 60,
      });

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

  const updateSessionMeeting = async () => {
    if (!editingMeeting) return;

    if (!sessionMeetingForm.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Meeting title is required.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const response = await api.put(
        `/api/workspace/${workspaceId}/meetings/session-meetings/${editingMeeting.id}`,
        {
          title: sessionMeetingForm.title,
          description: sessionMeetingForm.description,
          duration: sessionMeetingForm.duration,
        }
      );

      setSessionMeetings((prev) =>
        prev.map((meeting) =>
          meeting.id === editingMeeting.id ? response.data : meeting
        )
      );

      setEditingMeeting(null);
      setSessionMeetingForm({
        title: `${workspaceName} Team Meeting`,
        description: "",
        duration: 60,
      });
      setIsCreatingSession(false);

      toast({
        title: "Meeting Updated",
        description: `Session meeting has been updated successfully.${
          response.data.calendarSynced
            ? " Google Calendar event was also updated."
            : " (Google Calendar sync failed)"
        }`,
      });
    } catch (error) {
      console.error("Error updating session meeting:", error);

      if (axios.isAxiosError(error) && error.response?.data?.authRequired) {
        handleGoogleSignIn();
        return;
      }

      toast({
        title: "Error",
        description: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Failed to update session meeting.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteSessionMeeting = async (meeting: SessionMeetingData) => {
    setIsDeleting(true);
    try {
      const response = await api.delete(
        `/api/workspace/${workspaceId}/meetings/session-meetings/${meeting.id}`
      );

      setSessionMeetings((prev) => prev.filter((m) => m.id !== meeting.id));

      const remainingMeetings = sessionMeetings.filter(
        (m) => m.id !== meeting.id
      );
      if (remainingMeetings.length === 0) {
        setHasSessionMeetings(false);
      }

      toast({
        title: "Meeting Deleted",
        description: `Session meeting "${
          meeting.title
        }" has been deleted successfully.${
          response.data.calendarSynced
            ? " Google Calendar event was also removed."
            : " (Google Calendar sync failed)"
        }`,
      });
    } catch (error) {
      console.error("Error deleting session meeting:", error);

      toast({
        title: "Error",
        description: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Failed to delete session meeting.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const startEditingMeeting = (meeting: SessionMeetingData) => {
    setEditingMeeting(meeting);
    setSessionMeetingForm({
      title: meeting.title,
      description: meeting.description || "",
      duration: 60,
    });
    setIsCreatingSession(true);
  };

  const cancelEditing = () => {
    setEditingMeeting(null);
    setSessionMeetingForm({
      title: `${workspaceName} Team Meeting`,
      description: "",
      duration: 60,
    });
    setIsCreatingSession(false);
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

  const showAuthWarning = Boolean(
    googleAuthStatus &&
      (!googleAuthStatus.hasGoogleAuth ||
        !googleAuthStatus.hasCalendarScope ||
        googleAuthStatus.isTokenExpired)
  );

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

  const showTabbedInterface = permanentMeetingData || hasSessionMeetings;

  return (
    <>
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
              <div className="space-y-4">
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
                  <div className="space-y-4">
                    {isCreatingSession ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            {editingMeeting
                              ? "Edit Session Meeting"
                              : "Create Session Meeting"}
                          </h4>
                          {editingMeeting && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="new-session-title">
                            Meeting Title
                          </Label>
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
                            onClick={() => {
                              if (editingMeeting) {
                                cancelEditing();
                              } else {
                                setIsCreatingSession(false);
                              }
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={
                              editingMeeting
                                ? updateSessionMeeting
                                : createSessionMeeting
                            }
                            disabled={
                              (editingMeeting ? isUpdating : isLoading) ||
                              !sessionMeetingForm.title.trim() ||
                              !canCreateMeetings
                            }
                            className="flex-1"
                          >
                            {editingMeeting
                              ? isUpdating
                                ? "Updating..."
                                : "Update Meeting"
                              : isLoading
                              ? "Creating Meeting..."
                              : "Create Session Meeting"}
                          </Button>
                        </div>
                      </div>
                    ) : (
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
                                  <div className="flex-1">
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
                                    {meeting.description && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {meeting.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="flex items-center gap-1"
                                    >
                                      <Users className="h-3 w-3" />
                                      Session
                                    </Badge>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() =>
                                            startEditingMeeting(meeting)
                                          }
                                          className="hover:cursor-pointer"
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            deleteSessionMeeting(meeting)
                                          }
                                          className="text-destructive hover:cursor-pointer"
                                          disabled={isDeleting}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          {isDeleting
                                            ? "Deleting..."
                                            : "Delete"}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() =>
                                      copyMeetLink(meeting.meetLink)
                                    }
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Link
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() =>
                                      joinMeeting(meeting.meetLink)
                                    }
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
                  <div className="space-y-4">
                    {permanentMeetingData ? (
                      <div>
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

                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() =>
                              joinMeeting(permanentMeetingData.meetLink)
                            }
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
                      <div className="text-center py-6">
                        <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No Permanent Meeting Room
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Generate a permanent meeting room for this workspace
                          that all members can use anytime.
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
