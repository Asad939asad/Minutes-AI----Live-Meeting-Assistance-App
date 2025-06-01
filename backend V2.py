import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import assemblyai as aai
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File
import os
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Meeting & Transcript API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


# ------------------------------
# Utility Functions (Your Business Logic)
# ------------------------------

def transcribe_audio_to_txt(mp3_file: str, output_txt_file: str = "transcription.txt") -> str:
    """
    Transcribes an MP3 file and saves the output to a text file.
    """

    print("got transcription")
    # Set your AssemblyAI API key
    aai.settings.api_key = "5225e27640a146ceb1945625f984628e"  # Replace with your actual API key

    # Configure speaker diarization
    config = aai.TranscriptionConfig(speaker_labels=True)

    # Transcribe the file
    transcript = aai.Transcriber().transcribe(mp3_file, config)

    # Write the transcript to a text file
    with open(output_txt_file, "w", encoding="utf-8") as file:
        for utterance in transcript.utterances:
            file.write(f"Speaker {utterance.speaker}: {utterance.text}\n")

    # Read and return the content of the text file
    with open(output_txt_file, "r", encoding="utf-8") as file:
        return file.read()


def process_meeting_transcript(txt_file_path: str, due_date: str) -> dict:
    """
    Extracts meeting notes and assigns a due date to action items.
    """
    # Configure Gemini API key
    genai.configure(api_key="AIzaSyCImE1UQ5kq86OxYaCqxZWDC-mO5--KCMQ")  # Replace with your actual API key

    try:
        with open(txt_file_path, "r", encoding="utf-8") as file:
            text_content = file.read()
    except FileNotFoundError:
        return {"error": "File not found."}

    model = genai.GenerativeModel("gemini-1.5-flash")

    response = model.generate_content(f"""
    This is the meeting transcript:
    {text_content}

    Extract key action items from the meeting.
    - Each action item must have different dueDate for their tasks, assignee, and the provided Current Date is: {due_date}.
    - Include timestamps for when each task was discussed.

    Return JSON in EXACTLY this format:
    {{
      "meetingTranscript": [
        {{"timestamp": "", "speaker": "", "message": ""}}
      ],
      "meetingSummary": {{
        "keyPoints": [""],
        "decisionsMade": [""],
        "nextSteps": [""]
      }},
      "actionItems": [
        {{
          "task": "",
          "assignee": "",
          "dueDate": "{due_date}"
        }}
      ]
    }}
    """)

    try:
        raw_response = response.text.strip()
        if "```json" in raw_response:
            raw_response = raw_response.split("```json")[1].split("```")[0].strip()
        meeting_notes_json = json.loads(raw_response)
    except json.JSONDecodeError:
        meeting_notes_json = {"error": "Failed to parse response as JSON."}

    return meeting_notes_json


def generate_todo_list(txt_file_path: str, due_date: str) -> dict:
    """
    Extracts a to-do list from a meeting transcript and assigns a due date.
    """
    genai.configure(api_key="AIzaSyCImE1UQ5kq86OxYaCqxZWDC-mO5--KCMQ")  # Replace with your actual API key

    try:
        with open(txt_file_path, "r", encoding="utf-8") as file:
            text_content = file.read()
    except FileNotFoundError:
        return {"error": "File not found."}

    model = genai.GenerativeModel("gemini-1.5-flash")

    response = model.generate_content(f"""
    This is the meeting transcript:
    {text_content}

    Extract a **brief** to-do list from the meeting discussion.
    - Assign the provided Current date is {due_date}.
    Due date must be more than the current task.
    - Include **timestamps** for when each task was discussed.

    Return JSON in **EXACTLY** this format:
    {{
      "todoList": [
        {{
          "timestamp": "",
          "task": "",
          "assignee": "",
          "dueDate": "due_date"
        }}
      ]
    }}
    """)

    try:
        raw_response = response.text.strip()
        if "```json" in raw_response:
            raw_response = raw_response.split("```json")[1].split("```")[0].strip()
        todo_list_json = json.loads(raw_response)
    except json.JSONDecodeError:
        todo_list_json = {"error": "Failed to parse response as JSON."}

    return todo_list_json


def extract_questions_from_conversation(txt_file_path: str) -> dict:
    """
    Extracts important questions from a 5-minute conversation segment.
    """
    genai.configure(api_key="AIzaSyCImE1UQ5kq86OxYaCqxZWDC-mO5--KCMQ")  # Replace with your actual API key

    try:
        with open(txt_file_path, "r", encoding="utf-8") as file:
            text_content = file.read()
    except FileNotFoundError:
        return {"error": "File not found."}

    model = genai.GenerativeModel("gemini-1.5-flash")

    response = model.generate_content(f"""
    The following text is a small conversation that took place over approximately 5 minutes:

    {text_content}

    Your task is to extract only the **important** questions from the conversation.
    - Identify meaningful questions that require an answer or discussion.
    - Ignore rhetorical or irrelevant questions.
    - Maintain timestamps for when each question was asked.

    Return JSON in EXACTLY this format:
    {{
      "importantQuestions": [
        {{"timestamp": "", "question": "", "askedBy": ""}}
      ]
    }}
    """)

    try:
        raw_response = response.text.strip()
        if "```json" in raw_response:
            raw_response = raw_response.split("```json")[1].split("```")[0].strip()
        extracted_questions_json = json.loads(raw_response)
    except json.JSONDecodeError:
        extracted_questions_json = {"error": "Failed to parse response as JSON."}

    return extracted_questions_json


# ------------------------------
# Request Models
# ------------------------------

class TranscribeRequest(BaseModel):
    mp3_file_path: str
    output_txt_file: str = "transcription.txt"


class ProcessMeetingRequest(BaseModel):
    txt_file_path: str
    due_date: str  # Expect format YYYY-MM-DD


class TodoListRequest(BaseModel):
    txt_file_path: str
    due_date: str  # Expect format YYYY-MM-DD


class ExtractQuestionsRequest(BaseModel):
    txt_file_path: str


# ------------------------------
# API Endpoints
# ------------------------------

# Add this new function
async def save_uploaded_file(file: UploadFile) -> str:
    """Save an uploaded file and return its path"""
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    return file_path

# Modify the transcribe endpoint
@app.post("/transcribe")
async def api_transcribe_audio(audio: UploadFile = File(...)):
    try:
        # Save the uploaded file
        file_path = await save_uploaded_file(audio)
        
        # Generate output path
        output_path = file_path.replace('.mp3', '_transcript.txt')
        
        # Transcribe the audio
        transcription = transcribe_audio_to_txt(file_path, output_path)
        
        return {
            "transcription": transcription,
            "file_path": output_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process-meeting")
def api_process_meeting(req: ProcessMeetingRequest):
    result = process_meeting_transcript(req.txt_file_path, req.due_date)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/generate-todo")
def api_generate_todo(req: TodoListRequest):
    result = generate_todo_list(req.txt_file_path, req.due_date)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/extract-questions")
def api_extract_questions(req: ExtractQuestionsRequest):
    result = extract_questions_from_conversation(req.txt_file_path)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
