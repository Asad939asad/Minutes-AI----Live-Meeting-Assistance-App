import axios from 'axios';

const API_URL = 'http://localhost:8000';

export interface Meeting {
  id: number;  // Make sure this exists and matches backend
  title: string;
  date: string;
  duration: string;
  participants: number;
  summary: {
    keyPoints: string[];
    decisionsMade: string[];
    nextSteps: string[];
  };
  action_items: Array<{
    id: string;
    content: string;
    assignee: string;
    dueDate: string;
    status: string;
  }>;
  transcript: Array<{
    speaker: string;
    content: string;
    timestamp: string;
  }>;
  file_path: string;
}

export const meetingsService = {
  async listMeetings(skip = 0, limit = 10) {
    try {
      const response = await axios.get<Meeting[]>(`${API_URL}/meetings?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch meetings list:', error);
      throw error;
    }
  },

  async getMeeting(id: number) {
    try {
      const response = await axios.get<Meeting>(`${API_URL}/meetings/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch meeting with id ${id}:`, error);
      throw error;
    }
  }
};