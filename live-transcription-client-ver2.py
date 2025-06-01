import pyaudio
import wave
import requests
import time
import threading
import os
from tempfile import NamedTemporaryFile
from pydub import AudioSegment
from queue import Queue

# Define the FastAPI server URL for transcription
API_URL = "http://127.0.0.1:8000/transcribe"  # Assuming the API is running locally

# Audio settings
CHUNK_SIZE = 1024  # Number of frames per buffer
FORMAT = pyaudio.paInt16  # Audio format
CHANNELS = 1  # Mono audio
RATE = 16000  # Sample rate (16kHz)
RECORD_SECONDS = 6  # Time per recording snippet in seconds

# Queue to hold audio data for transcription
audio_queue = Queue()

def record_audio():
    """
    Continuously records audio and adds it to the audio_queue.
    """
    p = pyaudio.PyAudio()

    # Open the microphone stream
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK_SIZE)

    frames = []

    print("Recording...")

    while True:
        # Continuously record audio
        data = stream.read(CHUNK_SIZE)
        frames.append(data)

        if len(frames) >= int(RATE / CHUNK_SIZE * RECORD_SECONDS):
            # If we've recorded enough for a 5-second clip, put it in the queue
            with NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                with wave.open(temp_file.name, 'wb') as wf:
                    wf.setnchannels(CHANNELS)
                    wf.setsampwidth(p.get_sample_size(FORMAT))
                    wf.setframerate(RATE)
                    wf.writeframes(b''.join(frames))
                frames = []  # Reset frames for the next recording

            # Add the temporary WAV file to the queue for transcription
            audio_queue.put(temp_file.name)

    # Stop recording (this will never be reached in this example)
    stream.stop_stream()
    stream.close()
    p.terminate()


def convert_wav_to_mp3(wav_file_path):
    """
    Converts a WAV file to MP3 format.
    """
    mp3_filename = wav_file_path.replace(".wav", ".mp3")
    audio = AudioSegment.from_wav(wav_file_path)
    audio.export(mp3_filename, format="mp3")
    return mp3_filename


def transcribe_audio_file(file_path):
    """
    Sends the recorded audio file to the API for transcription and returns the result.
    """
    with open(file_path, "rb") as f:
        files = {"mp3_file": f}  # The correct key is 'mp3_file'
        data = {"output_txt_file": "transcription.txt"}  # Optional: specify the output text file name
        response = requests.post(API_URL, files=files, data=data)

    # Delete the temporary file after uploading
    os.remove(file_path)

    if response.status_code == 200:
        return response.json().get("transcription", "No transcription found.")
    else:
        return f"Error: {response.status_code}, {response.text}"


def process_audio_queue():
    """
    Processes audio files from the queue and sends them for transcription.
    """
    while True:
        # Get the next audio file from the queue
        temp_wav_file = audio_queue.get()

        # Convert WAV to MP3
        temp_mp3_file = convert_wav_to_mp3(temp_wav_file)

        # Send the MP3 file for transcription
        transcription = transcribe_audio_file(temp_mp3_file)

        # Print the transcription result to the console
        print(f"Transcription: {transcription}")

        # Wait for the next audio file
        audio_queue.task_done()


def live_transcribe():
    """
    Starts the recording and transcription process in parallel.
    """
    # Start the audio recording thread
    recording_thread = threading.Thread(target=record_audio, daemon=True)
    recording_thread.start()

    # Start the audio processing thread
    processing_thread = threading.Thread(target=process_audio_queue, daemon=True)
    processing_thread.start()

    # Keep the main thread alive
    while True:
        time.sleep(1)


if __name__ == "__main__":
    print("Starting live transcription...")
    live_transcribe()
