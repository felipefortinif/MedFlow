import os
import tempfile
import json
from channels.generic.websocket import AsyncWebsocketConsumer
import asyncio
from vosk import Model, KaldiRecognizer
import subprocess

MODEL_PATH = os.environ.get('VOSK_MODEL_PATH', '/models/vosk-model-small-pt-0.3')
SAMPLE_RATE = 16000

class TranscribeConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.model = Model(MODEL_PATH)
        self.rec = KaldiRecognizer(self.model, SAMPLE_RATE)
        await self.accept()
        self.audio_buffer = b''

    async def disconnect(self, close_code):
        # Optionally, send final result
        if self.audio_buffer:
            await self.transcribe_and_send(self.audio_buffer, final=True)
        del self.model
        del self.rec

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data:
            self.audio_buffer += bytes_data
            # Try to decode and transcribe the buffer
            await self.transcribe_and_send(self.audio_buffer)

    async def transcribe_and_send(self, audio_bytes, final=False):
        # Write buffer to temp file
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=True) as temp_audio:
            temp_audio.write(audio_bytes)
            temp_audio.flush()
            # Decode to PCM using ffmpeg
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=True) as temp_wav:
                ffmpeg_cmd = [
                    'ffmpeg', '-y', '-i', temp_audio.name,
                    '-ar', str(SAMPLE_RATE), '-ac', '1', '-f', 'wav', temp_wav.name
                ]
                proc = await asyncio.create_subprocess_exec(*ffmpeg_cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
                await proc.communicate()
                if proc.returncode != 0:
                    await self.send(json.dumps({'error': 'Audio decode failed'}))
                    return
                # Read PCM data
                with open(temp_wav.name, 'rb') as f:
                    pcm_data = f.read()
                # Feed to Vosk
                if self.rec.AcceptWaveform(pcm_data):
                    result = self.rec.Result()
                else:
                    result = self.rec.PartialResult()
                await self.send(result)
        if final:
            await self.send(self.rec.FinalResult())
