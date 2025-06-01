import json
from fastapi import FastAPI, HTTPException, File, UploadFile
from pydantic import BaseModel
import assemblyai as aai
import shutil
import os

app = FastAPI(title="Meeting & Transcript API")


# ------------------------------
# Utility Functions (Your Business Logic)
# ------------------------------

def transcribe_audio_to_txt(mp3_file_path: str, output_txt_file: str = "transcription.txt") -> str:
    """
    Transcribes an MP3 file and saves the output to a text file.
    """
    # Set your AssemblyAI API key
    aai.settings.api_key = "700952c508434338a6c739d7bdc6ec77"  # Replace with your actual API key

    # Configure speaker diarization
    config = aai.TranscriptionConfig(speaker_labels=True)

    # Transcribe the file
    transcript = aai.Transcriber().transcribe(mp3_file_path, config)

    # Write the transcript to a text file
    with open(output_txt_file, "w", encoding="utf-8") as file:
        for utterance in transcript.utterances:
            file.write(f"Speaker {utterance.speaker}: {utterance.text}\n")

    # Read and return the content of the text file
    with open(output_txt_file, "r", encoding="utf-8") as file:
        return file.read()


# ------------------------------
# Request Models (Optional, if you want to specify additional form data)
# ------------------------------

class TranscribeRequest(BaseModel):
    output_txt_file: str = "transcription.txt"


# ------------------------------
# API Endpoints
# ------------------------------

@app.post("/transcribe")
async def api_transcribe_audio(output_txt_file: str = "transcription.txt", mp3_file: UploadFile = File(...)):
    try:
        # Save the uploaded file temporarily
        temp_mp3_path = "temp_audio.mp3"
        with open(temp_mp3_path, "wb") as buffer:
            shutil.copyfileobj(mp3_file.file, buffer)

        # Transcribe the audio file
        transcription = transcribe_audio_to_txt(temp_mp3_path, output_txt_file)

        # Clean up the temporary file after transcription
        os.remove(temp_mp3_path)

        return {"transcription": transcription}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
