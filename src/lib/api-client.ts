import axios from 'axios';

// Create an axios instance with default config
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Meeting API functions
export const meetingApi = {
  // Get all meetings for a workspace
  getMeetings: async (workspaceId: string) => {
    const response = await apiClient.get(`/workspace/${workspaceId}/meeting`);
    return response.data;
  },

  // Get a specific meeting
  getMeeting: async (workspaceId: string, meetingId: string) => {
    const response = await apiClient.get(
      `/workspace/${workspaceId}/meeting/${meetingId}`
    );
    return response.data;
  },

  // Create a new meeting
  createMeeting: async (workspaceId: string, meetingData: any) => {
    const response = await apiClient.post(
      `/workspace/${workspaceId}/meeting`,
      meetingData
    );
    return response.data;
  },

  // Update a meeting
  updateMeeting: async (
    workspaceId: string,
    meetingId: string,
    meetingData: any
  ) => {
    const response = await apiClient.patch(
      `/workspace/${workspaceId}/meeting/${meetingId}`,
      meetingData
    );
    return response.data;
  },

  // Delete a meeting
  deleteMeeting: async (workspaceId: string, meetingId: string) => {
    const response = await apiClient.delete(
      `/workspace/${workspaceId}/meeting/${meetingId}`
    );
    return response.data;
  },

  // Update attendee status
  updateAttendeeStatus: async (
    workspaceId: string,
    meetingId: string,
    status: string
  ) => {
    const response = await apiClient.put(
      `/workspace/${workspaceId}/meeting/${meetingId}`,
      { status }
    );
    return response.data;
  },

  // Check availability
  checkAvailability: async (
    workspaceId: string,
    data: {
      startDateTime: string;
      endDateTime: string;
      attendeeIds: string[];
    }
  ) => {
    const response = await apiClient.post(
      `/workspace/${workspaceId}/meeting/availability`,
      data
    );
    return response.data;
  },
};

export default apiClient;
