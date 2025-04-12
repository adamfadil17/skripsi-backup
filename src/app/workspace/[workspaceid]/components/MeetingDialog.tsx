'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CalendarDays, CalendarIcon, Copy, Edit, Trash2 } from 'lucide-react';
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
import { SiGooglemeet } from 'react-icons/si';
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

interface Meeting {
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  link: string;
  members: Member[];
}

interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface MeetingDialogProps {
  children: ReactNode;
}

const sampleMembers: Member[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    email: 'alex@example.com',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: '2',
    name: 'Sam Wilson',
    email: 'sam@example.com',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: '3',
    name: 'Taylor Kim',
    email: 'taylor@example.com',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: '4',
    name: 'Jordan Smith',
    email: 'jordan@example.com',
    avatar: '/placeholder.svg?height=32&width=32',
  },
  {
    id: '5',
    name: 'Casey Brown',
    email: 'casey@example.com',
    avatar: '/placeholder.svg?height=32&width=32',
  },
];

const initialMeetings: Meeting[] = [
  {
    title: 'Retrospective Data Research',
    date: new Date(2024, 2, 8),
    startTime: '10:30 AM',
    endTime: '11:30 AM',
    link: 'https://meet.google.com/jzr-uwem-rvm',
    members: [sampleMembers[0], sampleMembers[1]],
  },
  {
    title: 'Retrospective Data Research',
    date: new Date(2024, 2, 8),
    startTime: '10:30 AM',
    endTime: '11:30 AM',
    link: 'https://meet.google.com/jzr-uwem-rvm',
    members: [sampleMembers[0], sampleMembers[2]],
  },
  {
    title: 'Retrospective Data Research',
    date: new Date(2024, 2, 8),
    startTime: '10:30 AM',
    endTime: '11:30 AM',
    link: 'https://meet.google.com/jzr-uwem-rvm',
    members: [sampleMembers[1], sampleMembers[3]],
  },
  {
    title: 'Project Kickoff Meeting',
    date: new Date(2024, 2, 10),
    startTime: '9:00 AM',
    endTime: '10:00 AM',
    link: 'https://meet.google.com/abc-defg-hij',
    members: [sampleMembers[0], sampleMembers[4]],
  },
  {
    title: 'Weekly Team Sync',
    date: new Date(2024, 2, 11),
    startTime: '2:00 PM',
    endTime: '3:00 PM',
    link: 'https://meet.google.com/klm-nop-qrs',
    members: [sampleMembers[2], sampleMembers[3], sampleMembers[4]],
  },
];

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
];

const formSchema = z.object({
  title: z.string().min(1, {
    message: 'Please enter a meeting title.',
  }),
  date: z.date(),
  startTime: z.string().min(1, {
    message: 'Please specify the start time.',
  }),
  endTime: z.string().min(1, {
    message: 'Please specify the end time.',
  }),
  members: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        avatar: z.string().optional(),
      })
    )
    .min(1, {
      message: 'Please add at least one member to the meeting.',
    })
    .default([]),
  // link: z.string().min(1),
});

const generateMeetingLink = () => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `https://meet.google.com/${result}`;
};

const MeetingDialog = ({ children }: MeetingDialogProps) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [generatedLink, setGeneratedLink] = useState(generateMeetingLink());
  const [availableMembers, setAvailableMembers] =
    useState<Member[]>(sampleMembers);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: selectedMeeting || {
      title: '',
      date: new Date(),
      startTime: '',
      endTime: '',
      link: 'meet.google.com/jzr-uwem-rvm',
      members: [],
    },
  });

  useEffect(() => {
    if (selectedMeeting) {
      form.reset({
        title: selectedMeeting.title,
        date: selectedMeeting.date,
        startTime: selectedMeeting.startTime,
        endTime: selectedMeeting.endTime,
        members: selectedMeeting.members,
      });
      setGeneratedLink(selectedMeeting.link);
    } else {
      form.reset({
        title: '',
        date: new Date(),
        startTime: '',
        endTime: '',
        members: [],
      });
      setGeneratedLink(generateMeetingLink());
    }
  }, [selectedMeeting, form]);

  // Add this new useEffect to watch for changes to the members field
  useEffect(() => {
    const currentMembers = form.getValues().members || [];
    // This will force the component to re-evaluate which members are available
    setAvailableMembers([...sampleMembers]);
  }, [form.watch('members')]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const meetingData = { ...data, link: generatedLink };
    if (selectedMeeting) {
      const updatedMeetings = meetings.map((meeting) =>
        meeting === selectedMeeting ? meetingData : meeting
      );
      setMeetings(updatedMeetings);
    } else {
      setMeetings([...meetings, meetingData]);
    }
    handleCancel();
  };

  const itemsPerPage = 3;
  const totalPages = Math.ceil(meetings.length / itemsPerPage);

  const handleCreateSchedule = () => {
    setSelectedMeeting(null);
    setGeneratedLink(generateMeetingLink());
    form.reset({
      title: '',
      date: new Date(),
      startTime: '',
      endTime: '',
      members: [],
    });
    setView('form');
  };

  const handleCancel = () => {
    setView('list');
    form.reset();
  };

  const handleEdit = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setGeneratedLink(meeting.link);
    form.reset({
      title: meeting.title,
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      members: meeting.members,
    });
    setView('form');
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(link);
    setTimeout(() => setCopied(null), 1300);
  };

  const paginatedMeetings = meetings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

          {view === 'form' ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="p-4 border rounded-md space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
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
                    name="link"
                    render={() => (
                      <FormItem>
                        <FormLabel>Link</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <div className="relative h-[40px] flex-1 flex items-center border border-gray-300 rounded-md py-2 px-3 bg-white">
                              <SiGooglemeet className="mr-2 text-primary h-4 w-4" />
                              <span className="text-sm break-all font-mono">
                                {generatedLink.replace('https://', '')}
                              </span>
                            </div>
                            <Tooltip open={copied === generatedLink}>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleCopyLink(generatedLink)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <span>Copied!</span>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
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
                    name="members"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invite Members</FormLabel>
                        <FormControl>
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2 mb-2">
                              {field.value.map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage
                                      src={member.avatar || '/placeholder.svg'}
                                      alt={member.name}
                                    />
                                    <AvatarFallback>
                                      {member.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{member.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 rounded-full"
                                    onClick={() => {
                                      const updatedMembers = field.value.filter(
                                        (m) => m.id !== member.id
                                      );
                                      field.onChange(updatedMembers);
                                    }}
                                  >
                                    <span className="sr-only">Remove</span>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <Select
                              onValueChange={(value) => {
                                const member = availableMembers.find(
                                  (m) => m.id === value
                                );
                                if (
                                  member &&
                                  !field.value.some((m) => m.id === member.id)
                                ) {
                                  field.onChange([...field.value, member]);
                                }
                              }}
                              value=""
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Add members to this meeting" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[200px] overflow-y-auto">
                                {availableMembers.filter(
                                  (member) =>
                                    !field.value.some((m) => m.id === member.id)
                                ).length === 0 ? (
                                  <div className="p-2 text-center text-sm text-muted-foreground">
                                    All members have been added
                                  </div>
                                ) : (
                                  availableMembers
                                    .filter(
                                      (member) =>
                                        !field.value.some(
                                          (m) => m.id === member.id
                                        )
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
                                                member.avatar ||
                                                '/placeholder.svg'
                                              }
                                              alt={member.name}
                                            />
                                            <AvatarFallback>
                                              {member.name.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span>{member.name}</span>
                                          <span className="text-muted-foreground text-xs">
                                            ({member.email})
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
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {selectedMeeting ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meet title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMeetings.map((meeting, i) => (
                      <TableRow key={i}>
                        <TableCell>{meeting.title}</TableCell>
                        <TableCell>{format(meeting.date, 'PPP')}</TableCell>
                        <TableCell>{meeting.startTime}</TableCell>
                        <TableCell>{meeting.endTime}</TableCell>
                        <TableCell>
                          <div className="flex -space-x-2 overflow-hidden">
                            {meeting.members.slice(0, 3).map((member, idx) => (
                              <TooltipProvider key={idx}>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Avatar className="h-8 w-8 border-2 border-background">
                                      <AvatarImage
                                        src={
                                          member.avatar || '/placeholder.svg'
                                        }
                                        alt={member.name}
                                      />
                                      <AvatarFallback>
                                        {member.name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{member.name}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ))}
                            {meeting.members.length > 3 && (
                              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-xs font-medium">
                                +{meeting.members.length - 3}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-2">
                            <span>{meeting.link.replace('https://', '')}</span>
                            <Tooltip open={copied === meeting.link}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopyLink(meeting.link)}
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
                            <Button
                              size={'sm'}
                              className="h-[32px]"
                              onClick={() =>
                                window.open(meeting.link, '_blank')
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
                                    >
                                      <span>
                                        <Trash2 className="h-4 w-4" />
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
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
                    )
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingDialog;
