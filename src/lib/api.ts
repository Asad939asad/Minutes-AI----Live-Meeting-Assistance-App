const API_BASE_URL = 'http://localhost:8000';

export const transcribeAudio = async (audioFile: File) => {
  const formData = new FormData();
  formData.append('audio', audioFile);

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to transcribe audio');
  }

  return response.json();
};

export const processMeeting = async (transcriptPath: string, dueDate: string) => {
  const response = await fetch(`${API_BASE_URL}/process-meeting`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      txt_file_path: transcriptPath,
      due_date: dueDate,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to process meeting');
  }

  return response.json();
};