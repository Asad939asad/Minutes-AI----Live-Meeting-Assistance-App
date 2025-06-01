import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link as LinkIcon, Mic, Upload } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { fadeIn } from "@/lib/animations";
import { useNavigate } from 'react-router-dom';
import { processMeeting } from '@/lib/api';
import { Loader2 } from "lucide-react";

interface LiveTranscriptProps {
  messages: string[];
}

function AudioWaveform({ isRecording }: { isRecording: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioContext = new AudioContext();
    analyserRef.current = audioContext.createAnalyser();
    analyserRef.current.fftSize = 256;
    const bufferLength = analyserRef.current.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    if (isRecording) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyserRef.current!);
        })
        .catch(err => console.error('Error accessing microphone:', err));
    }

    const draw = () => {
      if (!ctx || !analyserRef.current || !dataArrayRef.current) return;
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / 32;
      ctx.clearRect(0, 0, width, height);

      if (isRecording) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      }

      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      for (let i = 0; i < 32; i++) {
        let barHeight = isRecording 
          ? (dataArrayRef.current[i] || 0) * height / 256
          : Math.sin(Date.now() * 0.002 + i * 0.3) * 20 + 30;
        if (!isRecording) {
          barHeight *= 0.7;
        }
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;
        ctx.roundRect(x, y, barWidth, barHeight, 4);
      }
      ctx.fill();
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContext.state !== 'closed') audioContext.close();
    };
  }, [isRecording]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={100} 
      className="w-full h-[100px] bg-muted rounded-lg"
    />
  );
}

function LiveTranscript({ messages }: LiveTranscriptProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-[300px] w-full bg-muted rounded-lg p-4 overflow-y-auto">
      <div className="space-y-4">
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <div key={index} className="text-foreground">{msg}</div>
          ))
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Waiting for live transcription...
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  );
}

export function NewMeeting() {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // This state holds messages coming in from the realtime transcription websocket
  const [liveTranscript, setLiveTranscript] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Start recording for saving the file (MediaRecorder)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/mp3' });
        setAudioBlob(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setHasRecording(true);
    }
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Clear any previous live transcript messages
      setLiveTranscript([]);
      startRecording();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'audio/mpeg') {
      setUploadedFile(file);
      setAudioBlob(file);
      setHasRecording(true);
    } else {
      alert('Please upload an MP3 file');
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveMeeting = async () => {
    if (!audioBlob) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, uploadedFile?.name || 'recording.mp3');
      const transcribeResponse = await fetch('http://127.0.0.1:8000/transcribe', {
        method: 'POST',
        body: formData,
      });
      const { meeting_data,meeting_id  } = await transcribeResponse.json();
      console.log(meeting_data)
      const titleInput = document.querySelector('input[placeholder="Enter meeting title"]') as HTMLInputElement;
      const descriptionInput = document.querySelector('input[placeholder="Enter meeting description"]') as HTMLInputElement;
      navigate(`/meetings/${meeting_id}`, {
        state: {
          title: titleInput?.value || meeting_data.title,
          description: descriptionInput?.value || "",
          date: meeting_data.date,
          duration: meeting_data.duration,
          participants: meeting_data.participants,
          summary: meeting_data.summary,
          actionItems: meeting_data.actionItems.map((item: any) => ({
            ...item,
            status: 'pending'
          })),
          transcript: meeting_data.transcript.map((item: any) => ({
            speaker: item.speaker,
            content: item.content,
            timestamp: item.timestamp
          }))
        }
      });
    } catch (err) {
      console.error('Error saving meeting:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Set up the realtime transcription websocket and audio streaming
  useEffect(() => {
    if (isRecording) {
      // Open the websocket connection
      const ws = new WebSocket("ws://127.0.0.1:8000/ws/realtime-transcribe");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected for realtime transcription");
      };

      ws.onmessage = (event) => {
        // Append each new transcript message
        setLiveTranscript(prev => [...prev, event.data]);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error: ", error);
      };

      // Obtain a separate audio stream for realtime transcription
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          source.connect(processor);
          processor.connect(audioContext.destination);

          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBuffer = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              // Clamp the value and convert to 16-bit PCM
              let s = Math.max(-1, Math.min(1, inputData[i]));
              pcmBuffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(pcmBuffer.buffer);
            }
          };

          // Cleanup when the websocket closes or recording stops
          ws.onclose = () => {
            processor.disconnect();
            source.disconnect();
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
          };

          return () => {
            processor.disconnect();
            source.disconnect();
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
          };
        })
        .catch(err => {
          console.error("Error accessing microphone for realtime transcription:", err);
        });

      return () => {
        if (wsRef.current) wsRef.current.close();
      };
    }
  }, [isRecording]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">New Meeting</h1>
        <p className="text-muted-foreground text-lg">Start a new meeting and record minutes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex justify-center gap-4 mb-8">
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 max-w-[200px]",
                    !uploadedFile && "border-indigo-500 text-indigo-500"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isRecording}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload MP3
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="audio/mpeg"
                    onChange={handleFileUpload}
                  />
                </Button>
                <span className="text-muted-foreground self-center">or</span>
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  className={cn(
                    "flex-1 max-w-[200px]",
                    !uploadedFile && !isRecording && "border-indigo-500 text-indigo-500"
                  )}
                  onClick={handleRecordingToggle}
                  disabled={!!uploadedFile}
                >
                  <Mic className="mr-2 h-4 w-4" />
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </Button>
              </div>

              {uploadedFile ? (
                <div className="text-center p-6 bg-muted rounded-lg mb-8 flex-grow">
                  <p className="text-foreground font-medium">{uploadedFile.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <AudioWaveform isRecording={isRecording} />
                  </div>
                  <div className="flex items-center justify-center mb-8">
                    <Button
                      variant={isRecording ? "destructive" : "default"}
                      size="lg"
                      className={`rounded-full h-16 w-16 p-0 transition-all duration-200 ${
                        isRecording 
                          ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' 
                          : 'bg-indigo-500 hover:bg-indigo-600'
                      }`}
                      onClick={handleRecordingToggle}
                    >
                      <div className={`${isRecording ? 'h-6 w-6 bg-white rounded-sm' : 'h-6 w-6 bg-white rounded-full'}`} />
                    </Button>
                  </div>
                  
                </>
              )}

              {hasRecording && !isRecording && (
                <div className="text-center">
                  <Button 
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-lg"
                    onClick={handleSaveMeeting}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Meeting...
                      </>
                    ) : (
                      'Save Meeting'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-full">
          <CardContent className="p-6 h-full">
            {(true) && (
              <div className={cn("h-full flex flex-col", fadeIn)}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Mic className="h-5 w-5 text-indigo-500" />
                  Live Transcription
                </h2>
                <div className="flex-grow">
                  <LiveTranscript messages={liveTranscript} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}