'use client';

import {
  useEffect,
  useState,
  type ReactNode,
  useCallback,
  useMemo,
} from 'react';
import {
  CalendarDays,
  CalendarIcon,
  Copy,
  Edit,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { meetingApi } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import debounce from 'lodash/debounce';
import toast from 'react-hot-toast';
import { User } from '@prisma/client';
import { WorkspaceMember } from '@/types/types';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  meetingLink: string;
  googleCalendarId?: string;
  googleEventId?: string;
  attendees: MeetingAttendee[];
  createdBy: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface MeetingAttendee {
  id: string;
  meetingId: string;
  userId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface MeetingDialogProps {
  children: ReactNode;
  workspaceId: string;
  members: WorkspaceMember[]; // These should be workspace members
  currentUser: User;
}

interface AvailabilityStatus {
  status: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  attendees: {
    userId: string;
    name: string;
    email: string;
    available: boolean;
    reason: string;
  }[];
  suggestedTimes?: {
    startDateTime: string;
    endDateTime: string;
  }[];
}

const timeOptions = [
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
];

const formSchema = z.object({
  title: z.string().min(1, {
    message: 'Please enter a meeting title.',
  }),
  description: z.string().optional(),
  date: z.date(),
  startTime: z.string().min(1, {
    message: 'Please specify the start time.',
  }),
  endTime: z.string().min(1, {
    message: 'Please specify the end time.',
  }),
  attendeeIds: z
    .array(z.string())
    .min(1, {
      message: 'Please add at least one member to the meeting.',
    })
    .default([]),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * MeetingDialog component for creating and managing meetings
 * @param children - React children to render as the dialog trigger
 * @param workspaceId - ID of the current workspace
 * @param members - Array of workspace members who can be invited to meetings
 */
const MeetingDialog = ({
  children,
  workspaceId,
  members,
  currentUser,
}: MeetingDialogProps) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityStatus | null>(
    null
  );
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      date: new Date(),
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      attendeeIds: [],
    },
  });

  // Fetch meetings when component mounts
  useEffect(() => {
    if (workspaceId) {
      fetchMeetings();
    }
  }, [workspaceId]);

  // Reset form when selected meeting changes
  useEffect(() => {
    if (selectedMeeting) {
      form.reset({
        title: selectedMeeting.title,
        description: selectedMeeting.description || '',
        date: new Date(selectedMeeting.startDateTime),
        startTime: format(new Date(selectedMeeting.startDateTime), 'h:mm a'),
        endTime: format(new Date(selectedMeeting.endDateTime), 'h:mm a'),
        attendeeIds: selectedMeeting.attendees.map((a) => a.user.id),
      });
    } else {
      form.reset({
        title: '',
        description: '',
        date: new Date(),
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        attendeeIds: [],
      });
    }
  }, [selectedMeeting, form]);

  // Check availability when date, time, or attendees change
  const checkAvailability = useCallback(
    async (
      date: Date,
      startTime: string,
      endTime: string,
      attendeeIds: string[]
    ) => {
      if (!date || !startTime || !endTime || !attendeeIds.length) {
        return;
      }

      try {
        setCheckingAvailability(true);

        // Convert form data to API format
        const startDateTime = new Date(date);
        const startMatch = startTime.match(/(\d+):(\d+) (\w+)/);
        if (!startMatch) return;

        const [, startHours, startMinutes, startPeriod] = startMatch;
        startDateTime.setHours(
          Number.parseInt(startHours) +
            (startPeriod === 'PM' && Number.parseInt(startHours) !== 12
              ? 12
              : 0),
          Number.parseInt(startMinutes)
        );

        const endDateTime = new Date(date);
        const endMatch = endTime.match(/(\d+):(\d+) (\w+)/);
        if (!endMatch) return;

        const [, endHours, endMinutes, endPeriod] = endMatch;
        endDateTime.setHours(
          Number.parseInt(endHours) +
            (endPeriod === 'PM' && Number.parseInt(endHours) !== 12 ? 12 : 0),
          Number.parseInt(endMinutes)
        );

        const result = await meetingApi.checkAvailability(workspaceId, {
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          attendeeIds,
        });

        setAvailability(result);
      } catch (error) {
        console.error('Error checking availability:', error);
        toast.error('Failed to check availability');
      } finally {
        setCheckingAvailability(false);
      }
    },
    [workspaceId]
  );

  // Debounce the availability check to avoid too many API calls
  const debouncedCheckAvailability = useMemo(
    () => debounce(checkAvailability, 500),
    [checkAvailability]
  );

  // Watch form fields for changes to trigger availability check
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (
        (name === 'date' ||
          name === 'startTime' ||
          name === 'endTime' ||
          name === 'attendeeIds') &&
        value.date &&
        value.startTime &&
        value.endTime &&
        value.attendeeIds &&
        value.attendeeIds.length > 0
      ) {
        debouncedCheckAvailability(
          value.date as Date,
          value.startTime as string,
          value.endTime as string,
          value.attendeeIds as string[]
        );
      }
    });
    return () => subscription.unsubscribe();
  }, [form, debouncedCheckAvailability]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await meetingApi.getMeetings(workspaceId);
      setMeetings(data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);

      // Check availability one last time
      if (
        data.attendeeIds.length > 0 &&
        availability?.status === 'UNAVAILABLE'
      ) {
        toast.error(
          'All selected members are unavailable at this time. Consider choosing a different time.'
        );
        setLoading(false);
        return;
      }

      // Convert form data to API format
      const startDateTime = new Date(data.date);
      const startMatch = data.startTime.match(/(\d+):(\d+) (\w+)/);
      if (!startMatch) {
        toast.error('Invalid start time format');
        setLoading(false);
        return;
      }

      const [, startHours, startMinutes, startPeriod] = startMatch;
      startDateTime.setHours(
        Number.parseInt(startHours) +
          (startPeriod === 'PM' && Number.parseInt(startHours) !== 12 ? 12 : 0),
        Number.parseInt(startMinutes)
      );

      const endDateTime = new Date(data.date);
      const endMatch = data.endTime.match(/(\d+):(\d+) (\w+)/);
      if (!endMatch) {
        toast.error('Invalid end time format');
        setLoading(false);
        return;
      }

      const [, endHours, endMinutes, endPeriod] = endMatch;
      endDateTime.setHours(
        Number.parseInt(endHours) +
          (endPeriod === 'PM' && Number.parseInt(endHours) !== 12 ? 12 : 0),
        Number.parseInt(endMinutes)
      );

      const meetingData = {
        title: data.title,
        description: data.description,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        attendeeIds: data.attendeeIds,
      };

      if (selectedMeeting) {
        // Update existing meeting
        await meetingApi.updateMeeting(
          workspaceId,
          selectedMeeting.id,
          meetingData
        );
        toast.success('Your meeting has been updated successfully');
      } else {
        // Create new meeting
        await meetingApi.createMeeting(workspaceId, meetingData);
        toast.success(
          'Your meeting has been created successfully with Google Meet link'
        );
      }

      // Refresh meetings list
      await fetchMeetings();
      handleCancel();
    } catch (error: any) {
      console.error('Error saving meeting:', error);
      toast.error(error.response?.data?.error || 'Failed to save meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = () => {
    setSelectedMeeting(null);
    form.reset({
      title: '',
      description: '',
      date: new Date(),
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      attendeeIds: [],
    });
    setAvailability(null);
    setView('form');
  };

  const handleCancel = () => {
    setView('list');
    setSelectedMeeting(null);
    setAvailability(null);
  };

  const handleEdit = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setView('form');
  };

  const handleDelete = async (meetingId: string) => {
    try {
      setDeleting(meetingId);
      await meetingApi.deleteMeeting(workspaceId, meetingId);

      toast.success('The meeting has been deleted successfully');

      // Update local state
      setMeetings(meetings.filter((m) => m.id !== meetingId));
    } catch (error: any) {
      console.error('Error deleting meeting:', error);
      toast.error(error.response?.data?.error || 'Failed to delete meeting');
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(link);
    setTimeout(() => setCopied(null), 1300);
  };

  const handleUpdateAttendeeStatus = async (
    meetingId: string,
    status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'
  ) => {
    try {
      await meetingApi.updateAttendeeStatus(workspaceId, meetingId, status);

      toast.success(`You have ${status.toLowerCase()} the meeting invitation`);

      // Refresh meetings list
      await fetchMeetings();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleSelectSuggestedTime = (
    startDateTime: string,
    endDateTime: string
  ) => {
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    form.setValue('date', startDate);
    form.setValue('startTime', format(startDate, 'h:mm a'));
    form.setValue('endTime', format(endDate, 'h:mm a'));

    // Trigger availability check
    checkAvailability(
      startDate,
      format(startDate, 'h:mm a'),
      format(endDate, 'h:mm a'),
      form.getValues('attendeeIds')
    );
  };

  // Pagination
  const itemsPerPage = 3;
  const totalPages = Math.ceil(meetings.length / itemsPerPage);
  const paginatedMeetings = meetings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get current user's ID
  const currentUserId = currentUser?.id || null;

  // Availability status colors and icons
  const availabilityUI = {
    AVAILABLE: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      text: 'All members are available',
    },
    PARTIAL: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <AlertCircle className="h-5 w-5 text-yellow-600" />,
      text: 'Some members are unavailable',
    },
    UNAVAILABLE: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      text: 'All members are unavailable',
    },
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="w-[95vw] max-w-[900px] p-6 overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle>Meet</DialogTitle>
          <DialogDescription>Manage your meeting schedule.</DialogDescription>
        </DialogHeader>
        <div className="mt-0 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {view === 'form'
                ? selectedMeeting
                  ? 'Edit Schedule'
                  : 'Create Schedule'
                : 'Schedule'}
            </h2>
            {view === 'list' && (
              <Button onClick={handleCreateSchedule}>
                <CalendarDays className="mr-1 h-4 w-4" />
                Create schedule
              </Button>
            )}
          </div>

          {loading && view === 'list' ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : view === 'form' ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="p-4 border rounded-md space-y-4"
              >
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meet title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Retrospective Data Research"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Meeting description (optional)"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Meeting Link Info */}
                {selectedMeeting ? (
                  <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Google Meet Link</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {selectedMeeting.meetingLink}
                      </p>
                    </div>
                    <Tooltip open={copied === selectedMeeting.meetingLink}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8"
                          onClick={() =>
                            handleCopyLink(selectedMeeting.meetingLink)
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Copied!</span>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Google Meet Link</p>
                      <p className="text-xs text-muted-foreground">
                        A Google Meet link will be automatically generated when
                        the meeting is created
                      </p>
                    </div>
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2 mt-2">
                  <FormField
                    control={form.control}
                    name="attendeeIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invite Members</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2 mb-2">
                              {field.value.map((memberId) => {
                                const member = members.find(
                                  (m) => m.id === memberId
                                );
                                if (!member) return null;

                                return (
                                  <div
                                    key={member.id}
                                    className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full"
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage
                                        src={
                                          member.user.image ||
                                          '/images/placeholder.svg?height=24&width=24'
                                        }
                                        alt={member.user.name || 'User'}
                                      />
                                      <AvatarFallback>
                                        {member.user.name?.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">
                                      {member.user.name}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 rounded-full"
                                      onClick={() => {
                                        const updatedMembers =
                                          field.value.filter(
                                            (id) => id !== member.id
                                          );
                                        field.onChange(updatedMembers);
                                      }}
                                    >
                                      <span className="sr-only">Remove</span>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                            <Select
                              onValueChange={(value: string) => {
                                if (!field.value.includes(value)) {
                                  field.onChange([...field.value, value]);
                                }
                              }}
                              value=""
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Add members to this meeting" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px] overflow-y-auto">
                                {members.filter(
                                  (member) => !field.value.includes(member.id)
                                ).length === 0 ? (
                                  <div className="p-2 text-center text-sm text-muted-foreground">
                                    All members have been added
                                  </div>
                                ) : (
                                  members
                                    .filter(
                                      (member) =>
                                        !field.value.includes(member.id)
                                    )
                                    .map((member) => (
                                      <SelectItem
                                        key={member.id}
                                        value={member.id}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                            <AvatarImage
                                              src={
                                                member.user.image ||
                                                '/images/placeholder.svg?height=24&width=24'
                                              }
                                              alt={member.user.name || 'User'}
                                            />
                                            <AvatarFallback>
                                              {member.user.name?.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span>{member.user.name}</span>
                                          <span className="text-muted-foreground text-xs">
                                            ({member.user.email})
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Availability Status */}
                {checkingAvailability && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="text-sm">Checking availability...</span>
                  </div>
                )}

                {availability && !checkingAvailability && (
                  <div className="space-y-4">
                    <Alert
                      className={availabilityUI[availability.status].color}
                    >
                      <div className="flex items-center gap-2">
                        {availabilityUI[availability.status].icon}
                        <AlertTitle>
                          {availability.status === 'AVAILABLE'
                            ? 'All members are available'
                            : availability.status === 'PARTIAL'
                            ? 'Some members are unavailable'
                            : 'All members are unavailable'}
                        </AlertTitle>
                      </div>
                      <AlertDescription className="mt-2">
                        {availability.attendees.map((attendee) => (
                          <div
                            key={attendee.userId}
                            className="flex items-center gap-2 text-sm mt-1"
                          >
                            <Badge
                              variant="outline"
                              className={
                                attendee.available
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }
                            >
                              {attendee.available ? 'Available' : 'Unavailable'}
                            </Badge>
                            <span>{attendee.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({attendee.reason})
                            </span>
                          </div>
                        ))}
                      </AlertDescription>
                    </Alert>

                    {/* Suggested Times */}
                    {availability.status !== 'AVAILABLE' &&
                      availability.suggestedTimes &&
                      availability.suggestedTimes.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              Suggested Times
                            </CardTitle>
                            <CardDescription>
                              These times might work better for all participants
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {availability.suggestedTimes.map(
                                (time, index) => {
                                  const start = new Date(time.startDateTime);
                                  const end = new Date(time.endDateTime);
                                  return (
                                    <Button
                                      key={index}
                                      variant="outline"
                                      className="w-full justify-start bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800"
                                      onClick={() =>
                                        handleSelectSuggestedTime(
                                          time.startDateTime,
                                          time.endDateTime
                                        )
                                      }
                                    >
                                      <Clock className="mr-2 h-4 w-4 text-blue-600" />
                                      <span>
                                        {format(start, 'h:mm a')} -{' '}
                                        {format(end, 'h:mm a')} on{' '}
                                        {format(start, 'MMMM d, yyyy')}
                                      </span>
                                    </Button>
                                  );
                                }
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || availability?.status === 'UNAVAILABLE'}
                    className={
                      availability?.status === 'UNAVAILABLE'
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }
                  >
                    {loading && (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                    )}
                    {selectedMeeting ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              {meetings.length === 0 ? (
                <div className="text-center p-8 border rounded-md">
                  <h3 className="text-lg font-medium">No meetings scheduled</h3>
                  <p className="text-muted-foreground mt-2">
                    Create your first meeting by clicking the "Create schedule"
                    button.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Meet title</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Link</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedMeetings.map((meeting) => (
                          <TableRow key={meeting.id}>
                            <TableCell className="font-medium">
                              {meeting.title}
                            </TableCell>
                            <TableCell>
                              {format(new Date(meeting.startDateTime), 'PPP')}
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(meeting.startDateTime),
                                'h:mm a'
                              )}{' '}
                              -{' '}
                              {format(new Date(meeting.endDateTime), 'h:mm a')}
                            </TableCell>
                            <TableCell>
                              <div className="flex -space-x-2 overflow-hidden">
                                {meeting.attendees
                                  .slice(0, 3)
                                  .map((attendee) => (
                                    <TooltipProvider key={attendee.id}>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Avatar className="h-8 w-8 border-2 border-background">
                                            <AvatarImage
                                              src={
                                                attendee.user.image ||
                                                '/images/placeholder.svg?height=32&width=32'
                                              }
                                              alt={attendee.user.name}
                                            />
                                            <AvatarFallback>
                                              {attendee.user.name.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{attendee.user.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {attendee.status === 'ACCEPTED'
                                              ? 'Accepted'
                                              : attendee.status === 'DECLINED'
                                              ? 'Declined'
                                              : attendee.status === 'TENTATIVE'
                                              ? 'Maybe'
                                              : 'Pending'}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ))}
                                {meeting.attendees.length > 3 && (
                                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-xs font-medium">
                                    +{meeting.attendees.length - 3}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              <div className="flex items-center gap-2">
                                <span>
                                  {meeting.meetingLink.replace('https://', '')}
                                </span>
                                <Tooltip open={copied === meeting.meetingLink}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() =>
                                        handleCopyLink(meeting.meetingLink)
                                      }
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <span>Copied!</span>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                {currentUserId &&
                                  meeting.attendees.some(
                                    (a) => a.user.id === currentUserId
                                  ) && (
                                    <Select
                                      defaultValue={
                                        meeting.attendees.find(
                                          (a) => a.user.id === currentUserId
                                        )?.status || 'PENDING'
                                      }
                                      onValueChange={(value) =>
                                        handleUpdateAttendeeStatus(
                                          meeting.id,
                                          value as
                                            | 'ACCEPTED'
                                            | 'DECLINED'
                                            | 'TENTATIVE'
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-24 h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="ACCEPTED">
                                          Accept
                                        </SelectItem>
                                        <SelectItem value="TENTATIVE">
                                          Maybe
                                        </SelectItem>
                                        <SelectItem value="DECLINED">
                                          Decline
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                <Button
                                  size={'sm'}
                                  className="h-[32px]"
                                  onClick={() =>
                                    window.open(meeting.meetingLink, '_blank')
                                  }
                                >
                                  Join
                                </Button>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleEdit(meeting)}
                                        >
                                          <span>
                                            <Edit className="h-4 w-4" />
                                          </span>
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Edit Schedule</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() =>
                                            handleDelete(meeting.id)
                                          }
                                          disabled={deleting === meeting.id}
                                        >
                                          <span>
                                            {deleting === meeting.id ? (
                                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"></div>
                                            ) : (
                                              <Trash2 className="h-4 w-4" />
                                            )}
                                          </span>
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Delete Schedule</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-2">
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <Button
                            key={page}
                            variant="outline"
                            size="sm"
                            className={`h-8 w-8 p-0 ${
                              currentPage === page
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                                : ''
                            }`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingDialog;
