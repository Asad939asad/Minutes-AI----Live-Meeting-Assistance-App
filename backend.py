import json
from fastapi import FastAPI, HTTPException, Depends, Body
from pydantic import BaseModel
import assemblyai as aai
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
import os
import tempfile
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
app = FastAPI(title="Meeting & Transcript API")
import logging
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import queue
from googletrans import Translator, LANGUAGES
import threading
from openai import OpenAI
from typing import Dict, Any

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('transcription.log'),
        logging.StreamHandler()
    ]
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


# Add after FastAPI initialization
DATABASE_URL = "sqlite:///./meetings.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Add this after your existing models
class SQLQueryRequest(BaseModel):
    prompt: str

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    date = Column(String)
    duration = Column(String)
    participants = Column(Integer)
    summary = Column(JSON)
    action_items = Column(JSON)
    transcript = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String)

# Define the ChatRequest model
class ChatRequest(BaseModel):
    meeting_id: int
    question: str

# Create database tables
Base.metadata.create_all(bind=engine)
# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------------------
# API Endpoints
# ------------------------------



@app.get("/meetings/{meeting_id}")
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@app.get("/meetings")
def list_meetings(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db)):
    # reverse order
    meetings = db.query(Meeting).order_by(Meeting.id.desc()).offset(skip).limit(limit).all()
    return meetings

# ------------------------------
# Utility Functions (Your Business Logic)
# ------------------------------

def get_transcription_text(meeting_id: int, db: Session) -> str:
    """
    Fetches the transcription text from the database for a given meeting_id.
    """
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting.transcript


def transcribe_audio_to_txt(mp3_file_path: str, output_txt_file: str = "transcription.txt") -> str:
    # Set your AssemblyAI API key
    aai.settings.api_key = "5225e27640a146ceb1945625f984628e"  # Replace with your actual API key

    # Configure speaker diarization
    config = aai.TranscriptionConfig(speaker_labels=True)

    # Attempt transcription
    try:
        transcript = aai.Transcriber().transcribe(mp3_file_path, config)
    except Exception as e:
        # Log the error and continue (or return an empty string)
        print(f"Transcription error: {e}")
        transcript = None

    # Check if transcript is valid; if not, skip processing

    if not transcript or not hasattr(transcript, 'utterances') or not transcript.utterances:
        print("Transcript is None or missing utterances. Skipping processing.")
        return ""

    # Write the transcript to a text file
    with open(output_txt_file, "w", encoding="utf-8") as file:
        for utterance in transcript.utterances:
            file.write(f"Speaker {utterance.speaker}: {utterance.text}\n")

    # Read and return the content of the text file
    with open(output_txt_file, "r", encoding="utf-8") as file:
        return file.read()

def Chatting_Agent_module(meeting_id: int,question: str, db: Session):
    logging.info(f"Chatting_Agent_module called with meeting_id: {meeting_id}")


    # Configure Gemini API key
    genai.configure(api_key="AIzaSyCImE1UQ5kq86OxYaCqxZWDC-mO5--KCMQ")  # Replace with your actual API key

    # Fetch transcription text from database using meeting_id
    try:
        text_content = get_transcription_text(meeting_id, db)
        logging.info("Successfully fetched transcription text from database")
    except Exception as e:
        logging.error(f"Error fetching transcription text: {str(e)}")
        return {"error": str(e)}

    # Define the model
    model = genai.GenerativeModel("gemini-1.5-flash")

    logging.info(text_content)

    # Send request to Gemini API with the user's question and transcription
    response = model.generate_content(f"""
    The user asked: "{question}"
    Based on the following transcription, please provide a response:
    {text_content}
    
    Return JSON in EXACTLY this format:
    
    "some text"

    """)

    logging.info(response.text)

    return response.text  # Return JSON object
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
    print(meeting_notes_json)
    return meeting_notes_json

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




# Add this new endpoint to your app
@app.websocket("/ws/live-transcribe")
async def websocket_live_transcribe(websocket: WebSocket):
    await websocket.accept()
    audio_buffer = bytes()
    THRESHOLD = 1024 * 50  # e.g. 50KB of audio data (adjust as needed)
    try:
        while True:
            # Receive audio chunks (as bytes)
            data = await websocket.receive_bytes()
            audio_buffer += data

            # When enough data has been collected, transcribe and send back partial results
            if len(audio_buffer) >= THRESHOLD:
                with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                    tmp.write(audio_buffer)
                    tmp_path = tmp.name

                # Call your existing transcription function
                # (You might want to adjust the function so that it returns only the latest segment.)
                partial_transcript = transcribe_audio_to_txt(tmp_path, output_txt_file="temp_transcript.txt")
                
                # Send the partial transcript to the client
                await websocket.send_text(partial_transcript)
                
                # Clear the buffer and remove the temporary file
                audio_buffer = bytes()
                os.remove(tmp_path)
    except WebSocketDisconnect:
        print("Client disconnected from live transcription")

# Modify the transcribe endpoint

# Add a new endpoint for chatting with the bot


@app.post("/generate-sql")
async def generate_and_execute_sql(
    request: SQLQueryRequest,
    db: Session = Depends(get_db)
):
    logging.info("Received SQL query request")
    # Configure OpenAI
      # Replace with your actual API key
    client = OpenAI(api_key="YOUR_OPENAI_API_KEY_HERE")

    logging.info("Configured OpenAI")
    # Extract schema from Meeting model
    schema = {
        "meetings": {
            "id": "Integer (Primary Key)",
            "title": "String",
            "date": "String",
            "duration": "String",
            "participants": "Integer",
            "summary": "JSON",
            "action_items": "JSON",
            "transcript": "JSON",
            "created_at": "DateTime",
            "file_path": "String"
        }
    }
    

    logging.info("Extracted schema from Meeting model")
    try:
        # Create the prompt for GPT
        system_prompt = f"""
        You are a SQL expert. Given the following database schema:
{schema}
\"\"\"sample schema data:
d	title	date	duration	participants	summary	action_items	transcript	created_at	file_path
1\tchungus\tFeb 15, 2025\t5 minutes\t2\t{{"keyPoints": ["A test was proposed."], "decisionsMade": ["To proceed with a test to observe the outcome."], "nextSteps": ["Conduct the test", "Analyze the test results"]}}\t[{{"id": "1", "content": "Conduct the test as discussed.", "assignee": "Speaker A", "dueDate": "Mar 10, 2024", "status": "pending"}}, {{"id": "2", "content": "Analyze the results of the test and report findings.", "assignee": "Speaker A", "dueDate": "Mar 15, 2024", "status": "pending"}}]\t[{{"speaker": "Speaker A", "content": "So let's just test this and see what happens.", "timestamp": "00:00"}}]\t2025-02-15 14:20:28.964933\tuploads/recording_transc\"\"\"

The database is SQLite on Al and the table name is 'meetings'.
Generate a SQL query for the following request:
{request.prompt}

Return ONLY the SQL query, nothing else.
The Query will be ran using the db.execute(text(query)) function.

If the request by the user is not related meetings or database, or performing some action then retun 00op831
"""
    
        
        logging.info("trying to send to openai")
        # Rest of the function remains the same...
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.prompt}
                ],
                temperature=0.3
        )
        except Exception as e:
            logging.error(f"Error sending request to OpenAI: {str(e)}")

        logging.info(response)
        
        sql_query = response.choices[0].message.content

        logging.warn(sql_query)

        # Remove triple backticks and possible language label
        clean_sql = sql_query.replace("```sql", "").replace("```", "").strip()

        try:
            result = db.execute(text(clean_sql))
        except Exception as e:
            logging.error(f"Error executing query: {str(e)}")

        if sql_query.lower().startswith('select'):
            data = [dict(row) for row in result]
            return {
                "success": True,
                "query": sql_query,
                "results": data
            }
        
        db.commit()
        # check if sql_query has 00op831 anywhere then make sql_quert to " " and message to "Invalid Request"
        if "00op831" in sql_query:
            return {
                "success": True,
                "query": "",
                "message": "Invalid Request"
            }
        return {
            "success": True,
            "query": sql_query,
            "message": "Query executed successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error executing query: {str(e)}"
        )
@app.post("/chat")
def chat_with_bot(req: ChatRequest, db: Session = Depends(get_db)):
    logging.info(f"Received chat request for meeting_id: {req.meeting_id} with question: {req.question}")
    response = Chatting_Agent_module(req.meeting_id, req.question, db)
    if "error" in response:
        logging.error(f"Chatting_Agent_module returned an error: {response['error']}")
        raise HTTPException(status_code=400, detail=response["error"])
    logging.info("Chatting_Agent_module processed successfully")

    return response

@app.post("/transcribe")
async def api_transcribe_audio(audio: UploadFile = File(...), db: Session = Depends(get_db)  # Inject the session here
):
    try:
        logging.info(f"Starting transcription process for file: {audio.filename}")
        
        # Save the uploaded file
        file_path = await save_uploaded_file(audio)
        
        # Generate output path
        output_path = file_path.replace('.mp3', '_transcript.txt')
        
        # Transcribe the audio
        transcription = transcribe_audio_to_txt(file_path, output_path)
        
        # Process the transcription to generate meeting details
        current_date = datetime.now().strftime("%b %d, %Y")

        logging.info("Starting Gemini analysis of transcription...")
        
        # Use Gemini to analyze the transcription
        genai.configure(api_key="AIzaSyCImE1UQ5kq86OxYaCqxZWDC-mO5--KCMQ")
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""
        Analyze this meeting transcription:
        {transcription}
        
        Generate a comprehensive meeting summary in the following JSON format:
        {{
            "title": "Meeting Title",
            "date": "{current_date}",
            "duration": "XX minutes",
            "participants": number_of_participants,
            "summary": {{
                "keyPoints": [
                    "point 1",
                    "point 2"
                ],
                "decisionsMade": [
                    "decision 1",
                    "decision 2"
                ],
                "nextSteps": [
                    "step 1",
                    "step 2"
                ]
            }},
            "actionItems": [
                {{
                    "id": "1",
                    "content": "task description",
                    "assignee": "person name",
                    "dueDate": "Mar XX, 2024",
                    "status": "pending"
                }}
            ],
            "transcript": [
                {{
                    "speaker": "Speaker Name",
                    "content": "message content",
                    "timestamp": "MM:SS"
                }}
            ]
        }}
        
        Make sure to:
        1. Extract real speakers and their messages from the transcript
        2. Generate realistic action items based on the discussion
        3. Keep timestamps in MM:SS format
        4. Set appropriate due dates for action items in "Mar XX, 2024" format
        5. Mark all action items as "pending" initially
        """
        
        response = model.generate_content(prompt)
        
        try:
            raw_response = response.text.strip()
            if "```json" in raw_response:
                raw_response = raw_response.split("```json")[1].split("```")[0].strip()
            meeting_data = json.loads(raw_response)
            logging.info("Successfully parsed Gemini response")
            logging.info(raw_response)

            db_meeting = Meeting(
            title=meeting_data.get("title"),
            date=meeting_data.get("date"),
            duration=meeting_data.get("duration"),
            participants=meeting_data.get("participants"),
            summary=meeting_data.get("summary"),
            action_items=meeting_data.get("actionItems"),
            transcript=meeting_data.get("transcript"),
            file_path=output_path
        )
        
            db.add(db_meeting)
            db.commit()
            db.refresh(db_meeting)



        except json.JSONDecodeError:
            logging.error("Failed to parse Gemini response as JSON")
            meeting_data = {"error": "Failed to parse response as JSON."}
        
        return {
            "success": True,
            "file_path": output_path,
            "meeting_id": db_meeting.id,
            "meeting_data": meeting_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process-meeting")
def api_process_meeting(req: ProcessMeetingRequest):
    result = process_meeting_transcript(req.txt_file_path, req.due_date)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/extract-questions")
def api_extract_questions(req: ExtractQuestionsRequest):
    result = extract_questions_from_conversation(req.txt_file_path)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/translate-meeting")
async def translate_meeting(
    meeting_id: int = Body(...),
    language: str = Body(...),
    db: Session = Depends(get_db)
):
    # Convert language name (e.g. "French") to lowercase for matching
    language = language.lower()

    # Find the corresponding language code
    lang_code = None
    for code, name in LANGUAGES.items():
        if name.lower() == language:
            lang_code = code
            break

    if not lang_code:
        raise HTTPException(
            status_code=400,
            detail=f"Language '{language}' not supported"
        )

    # Fetch meeting from database
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    translator = Translator()

    # Translate only the text fields
    translated_title = (await translator.translate(
        meeting.title, src="en", dest=lang_code
    )).text

    # Assume meeting.summary is shaped like:
    # {
    #   "keyPoints": [str, str, ...],
    #   "decisionsMade": [str, ...],
    #   "nextSteps": [str, ...]
    # }
    translated_summary = {
        "keyPoints": [],
        "decisionsMade": [],
        "nextSteps": [],
    }
    for kp in meeting.summary["keyPoints"]:
        t_kp = (await translator.translate(kp, src="en", dest=lang_code)).text
        translated_summary["keyPoints"].append(t_kp)

    for dm in meeting.summary["decisionsMade"]:
        t_dm = (await translator.translate(dm, src="en", dest=lang_code)).text
        translated_summary["decisionsMade"].append(t_dm)

    for ns in meeting.summary["nextSteps"]:
        t_ns = (await translator.translate(ns, src="en", dest=lang_code)).text
        translated_summary["nextSteps"].append(t_ns)

    # Assume meeting.action_items is a list of objects like:
    # [
    #   { "id": str, "content": str, "assignee": str, "dueDate": str, "status": "pending"/"completed"},
    #   ...
    # ]
    translated_action_items = []
    for ai in meeting.action_items:
        t_content = (await translator.translate(ai["content"], src="en", dest=lang_code)).text
        t_assignee = (await translator.translate(ai["assignee"], src="en", dest=lang_code)).text
        # Keep 'pending' or 'completed' exactly so your frontend logic isn’t broken
        t_status = ai["status"]  # or translate if you must, but then handle carefully
        translated_action_items.append({
            "id": ai["id"],
            "content": t_content,
            "assignee": t_assignee,
            "dueDate": ai["dueDate"],
            "status": t_status
        })

    # Return a dictionary. FastAPI will serialize it to JSON automatically.
    return {
        "translated_title": translated_title,
        "translated_summary": translated_summary,
        "translated_action_items": translated_action_items,
    }

# ------------------------------
# New Realtime Transcription Websocket Endpoint
# ------------------------------

# This endpoint uses AssemblyAI's RealtimeTranscriber in a separate thread.
# Audio data sent by the client is fed into a thread-safe queue,
# and transcript text produced by AssemblyAI is sent back via another queue.
import string
@app.websocket("/ws/realtime-transcribe")
async def websocket_realtime_transcribe(websocket: WebSocket):
    await websocket.accept()

    # Thread-safe queues for audio data and transcript results
    audio_queue = queue.Queue()
    transcript_queue = queue.Queue()

    # Set the AssemblyAI API key for realtime transcription
    aai.settings.api_key = "700952c508434338a6c739d7bdc6ec77"  # Use your realtime API key

    # Generator that yields audio data from the audio_queue
    def audio_generator(q: queue.Queue):
        while True:
            data = q.get()
            if data is None:  # Sentinel to signal the end of the stream
                break
            yield data

    # Function that runs in a separate thread to handle realtime transcription
    def realtime_transcription_thread():
        last_text = ""  # Store the final transcript text

        def on_open(session_opened: aai.RealtimeSessionOpened):
            msg = f"session id: {session_opened.session_id}"
            # Remove punctuation and convert to lowercase
            clean_msg = msg.translate(str.maketrans("", "", string.punctuation))
            transcript_queue.put(clean_msg)

        def on_data(transcript: aai.RealtimeTranscript):
            nonlocal last_text
            if not transcript.text:
                return

            # Remove punctuation and convert to lowercase
            clean_text = transcript.text.translate(str.maketrans("", "", string.punctuation))

            # Only update when the transcript is final
            if isinstance(transcript, aai.RealtimeFinalTranscript):
                last_text = clean_text
                transcript_queue.put(last_text)

        def on_error(error: aai.RealtimeError):
            msg = f"error: {error}"
            clean_msg = msg.translate(str.maketrans("", "", string.punctuation)).lower()
            transcript_queue.put(clean_msg)

        def on_close():
            transcript_queue.put("closing session".lower())

        transcriber = aai.RealtimeTranscriber(
            on_data=on_data,
            on_error=on_error,
            sample_rate=44100,
            on_open=on_open,
            on_close=on_close,
        )
        transcriber.connect()
        transcriber.stream(audio_generator(audio_queue))
        transcriber.close()

    # Start the realtime transcription thread
    rt_thread = threading.Thread(target=realtime_transcription_thread, daemon=True)
    rt_thread.start()

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_bytes(), timeout=0.1)
                audio_queue.put(data)
            except asyncio.TimeoutError:
                pass

            # Check for transcript output and send it to the client
            while not transcript_queue.empty():
                transcript_text = transcript_queue.get_nowait()
                await websocket.send_text(transcript_text)

            await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        # Signal the transcription thread to end by sending a sentinel (None)
        audio_queue.put(None)
        logging.info("websocket disconnected, stopping realtime transcription")





