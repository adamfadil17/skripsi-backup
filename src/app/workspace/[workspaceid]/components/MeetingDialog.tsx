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

interface Meeting {
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  link: string;
}

interface MeetingDialogProps {
  children: ReactNode;
}

const initialMeetings: Meeting[] = [
  {
    title: 'Retrospective Data Research',
    date: new Date(2024, 2, 8),
    startTime: '10:30 AM',
    endTime: '11:30 AM',
    link: 'https://meet.google.com/jzr-uwem-rvm',
  },
  {
    title: 'Retrospective Data Research',
    date: new Date(2024, 2, 8),
    startTime: '10:30 AM',
    endTime: '11:30 AM',
    link: 'https://meet.google.com/jzr-uwem-rvm',
  },
  {
    title: 'Retrospective Data Research',
    date: new Date(2024, 2, 8),
    startTime: '10:30 AM',
    endTime: '11:30 AM',
    link: 'https://meet.google.com/jzr-uwem-rvm',
  },
  {
    title: 'Project Kickoff Meeting',
    date: new Date(2024, 2, 10),
    startTime: '9:00 AM',
    endTime: '10:00 AM',
    link: 'https://meet.google.com/abc-defg-hij',
  },
  {
    title: 'Weekly Team Sync',
    date: new Date(2024, 2, 11),
    startTime: '2:00 PM',
    endTime: '3:00 PM',
    link: 'https://meet.google.com/klm-nop-qrs',
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
  const [showForm, setShowForm] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [generatedLink, setGeneratedLink] = useState(generateMeetingLink()); //baru

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: selectedMeeting || {
      title: '',
      date: new Date(),
      startTime: '',
      endTime: '',
      link: 'meet.google.com/jzr-uwem-rvm',
    },
  });

  useEffect(() => {
    if (selectedMeeting) {
      form.reset({
        title: selectedMeeting.title,
        date: selectedMeeting.date,
        startTime: selectedMeeting.startTime,
        endTime: selectedMeeting.endTime,
      });
      setGeneratedLink(selectedMeeting.link);
    } else {
      form.reset({
        title: '',
        date: new Date(),
        startTime: '',
        endTime: '',
      });
      setGeneratedLink(generateMeetingLink());
    }
  }, [selectedMeeting, form]);

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
    console.log('Create Schedule clicked');
    setSelectedMeeting(null);
    setGeneratedLink(generateMeetingLink());
    form.reset({
      title: '',
      date: new Date(),
      startTime: '',
      endTime: '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    form.reset(); //baru
  };

  const handleEdit = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setGeneratedLink(meeting.link);
    form.reset({
      title: meeting.title,
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
    });
    setShowForm(true);
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
        className="sm:max-w-[800px]"
      >
        <DialogHeader>
          <DialogTitle>Meeting</DialogTitle>
          <DialogDescription>Manage your meeting schedule.</DialogDescription>
        </DialogHeader>
        <div className="mt-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {showForm
                ? selectedMeeting
                  ? 'Edit Schedule'
                  : 'Create Schedule'
                : 'Schedule'}{' '}
            </h2>
            <Button onClick={handleCreateSchedule}>
              <CalendarDays className="mr-1 h-4 w-4" />
              Create schedule
            </Button>
          </div>

          {showForm && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="mb-6 p-4 border rounded-md space-y-4"
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
                            <Tooltip open={copied}>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      generatedLink
                                    );
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1300);
                                  }}
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
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meet title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
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
                    <TableCell className="font-mono">{meeting.link}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size={'sm'}
                          className="h-[32px]"
                          onClick={() => window.open(meeting.link, '_blank')}
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
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingDialog;
