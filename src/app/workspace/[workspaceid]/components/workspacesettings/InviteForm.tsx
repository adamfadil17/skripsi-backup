'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import toast from 'react-hot-toast';

const inviteFormSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MEMBER']),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteFormProps {
  workspaceId: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  onSubmit: (values: InviteFormValues) => void;
  onCancel: () => void;
}

const roleLabels: Record<InviteFormValues['role'], string> = {
  SUPER_ADMIN: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
};

function InviteForm({
  workspaceId,
  isSuperAdmin,
  isAdmin,
  onSubmit,
  onCancel,
}: InviteFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role: 'MEMBER',
    },
  });

  const handleSubmit = async (values: InviteFormValues) => {
    setLoading(true);

    try {
      const res = await axios.post(`/api/workspace/${workspaceId}/invitation`, {
        email: values.email,
        role: values.role,
      });

      if (res.data.status === 'success') {
        form.reset();
        toast.success(res.data.message || 'Invitation sent successfully.');
        onSubmit(values);
      } else {
        toast.error(res.data.message || 'Failed to send invitation.');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'An unexpected error occurred.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Tentukan role yang tersedia berdasarkan peran pengundang
  const availableRoles: InviteFormValues['role'][] = isSuperAdmin
    ? ['SUPER_ADMIN', 'ADMIN', 'MEMBER']
    : isAdmin
    ? ['MEMBER']
    : [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter email address"
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between items-start">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-3">
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loading || availableRoles.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || availableRoles.length === 0}
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default InviteForm;
