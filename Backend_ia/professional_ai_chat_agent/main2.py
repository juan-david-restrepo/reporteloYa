import os
import base64
import json
import asyncio
import aiohttp
from typing import List, Dict, Optional
from contextlib import asynccontextmanager

from gtts import gTTS
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")

SYSTEM_PROMPT = """Eres Robot Transit, un asistente virtual especializado en normas de tránsito y seguridad vial en Colombia.

REGLAS ABSOLUTAS:
1. SIEMPRE responde en español. NUNCA mezcles inglés ni cambies de idioma.
2. Solo responde sobre tránsito, leyes, señales, seguridad vial y regulaciones colombianas.
3. Si preguntan fuera del tema, di brevemente: "Solo puedo ayudarte con temas de tránsito en Colombia."
4. Máximo 2 oraciones por respuesta. Sé conciso.
5. Tono conversacional, natural y amigable.
6. Habla como un joven colombiano educado.
7. Responde enfocado en lo que el usuario pregunta. No divagues.

CONOCIMIENTO:
- Código Nacional de Tránsito (Ley 769 de 2002)
- Señales viales colombianas
- Normas de velocidad
- Licencias de conducción
- Comparendos y sanciones
- Seguridad vial
- Peatones y ciclistas
"""

GREETING = "Hola, soy Robot Transit, tu asistente personal de tránsito. ¿En qué te puedo colaborar?"

INACTIVITY_PHRASES = [
    "¿Sigues ahí? Estoy aquí para ayudarte.",
    "¿Hay algo más sobre tránsito que te gustaría saber?",
    "Cuando quieras, puedo responderte otra pregunta.",
    "¿Te puedo colaborar con algo más?",
    "Estoy listo si tienes otra consulta sobre normas de tránsito.",
    "¿Aún te encuentras ahí? Con gusto te ayudo.",
    "¿Tienes otra pregunta sobre tránsito?"
]


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_json(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception:
                self.disconnect(client_id)


manager = ConnectionManager()


class ConversationHistory:
    def __init__(self, max_history: int = 6):
        self.history: List[Dict[str, str]] = []
        self.max_history = max_history
        self.inactivity_index = 0

    def add(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        if len(self.history) > self.max_history:
            self.history.pop(0)

    def get_messages(self) -> List[Dict[str, str]]:
        return [{"role": "system", "content": SYSTEM_PROMPT}] + self.history

    def get_next_inactivity_phrase(self) -> str:
        phrase = INACTIVITY_PHRASES[self.inactivity_index % len(INACTIVITY_PHRASES)]
        self.inactivity_index += 1
        return phrase

    def clear(self):
        self.history = []
        self.inactivity_index = 0


async def generate_response(prompt: str, conversation: ConversationHistory) -> str:
    messages = conversation.get_messages()
    messages.append({"role": "user", "content": prompt})

    timeout = aiohttp.ClientTimeout(total=12)
    
    async with aiohttp.ClientSession(timeout=timeout) as session:
        try:
            async with session.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": messages,
                    "max_tokens": 200,
                    "temperature": 0.6,
                    "top_p": 0.9
                }
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    text = data["choices"][0]["message"]["content"].strip()
                    return text[:500]
                else:
                    error_text = await response.text()
                    print(f"Groq error {response.status}: {error_text[:200]}")
                    return "Lo siento, tuve un problema. ¿Podrías repetir tu pregunta?"
        except asyncio.TimeoutError:
            print("Groq timeout")
            return "La respuesta tardó demasiado. ¿Podrías intentar de nuevo?"
        except Exception as e:
            print(f"Groq error: {e}")
            return "Lo siento, estoy teniendo problemas. ¿Podrías intentarlo de nuevo?"


async def synthesize_elevenlabs(text: str, voice_id: str, api_key: str) -> Optional[bytes]:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.35,
            "similarity_boost": 0.9,
            "style": 0.25,
            "use_speaker_boost": True
        }
    }
    
    timeout = aiohttp.ClientTimeout(total=20)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(url, json=payload, headers=headers) as response:
            if response.status == 200:
                return await response.read()
            else:
                print(f"ElevenLabs error: {response.status}")
                return None


def synthesize_gtts(text: str, output_path: str):
    try:
        tts = gTTS(text=text, lang='es', slow=False)
        tts.save(output_path)
    except Exception as e:
        print(f"gTTS error: {e}")
        try:
            tts = gTTS(text=text, lang='es-co', slow=False)
            tts.save(output_path)
        except Exception as e2:
            print(f"gTTS fallback error: {e2}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Robot Transit iniciando...")
    yield
    print("Robot Transit cerrando...")


app = FastAPI(title="Robot Transit", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def get_index():
    return {"message": "Robot Transit WebSocket server running"}


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    conversation = ConversationHistory(max_history=6)
    audio_counter = 0
    cancelled = False
    is_active = True

    try:
        await manager.send_json({
            "type": "status",
            "status": "ready"
        }, client_id)

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=90.0)
            except asyncio.TimeoutError:
                try:
                    await manager.send_json({"type": "ping"}, client_id)
                except:
                    break
                continue
            except WebSocketDisconnect:
                break

            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue

            message_type = message.get("type")
            if message_type is None:
                continue

            if message_type == "interrupt":
                cancelled = True
                if audio_counter > 0:
                    audio_counter -= 1
                await manager.send_json({
                    "type": "status",
                    "status": "interrupted"
                }, client_id)
                continue

            if message_type == "ping":
                await manager.send_json({"type": "pong"}, client_id)
                continue

            if message_type == "user_speech":
                user_text = message.get("text", "").strip()
                
                if not user_text or len(user_text) < 2:
                    continue

                is_greeting = user_text == "__GREETING__"
                is_inactivity = user_text.startswith("__INACTIVITY__:")
                
                if is_greeting:
                    response_text = GREETING
                    conversation.clear()
                    conversation.add("assistant", response_text)
                elif is_inactivity:
                    response_text = conversation.get_next_inactivity_phrase()
                else:
                    cancelled = False
                    await manager.send_json({
                        "type": "status",
                        "status": "processing"
                    }, client_id)

                    conversation.add("user", user_text)
                    response_text = await generate_response(user_text, conversation)
                    conversation.add("assistant", response_text)

                if cancelled:
                    continue

                await manager.send_json({
                    "type": "ai_response",
                    "text": response_text
                }, client_id)

                audio_counter += 1
                temp_audio = f"temp_{client_id}_{audio_counter}.mp3"
                
                audio_data = None
                
                if ELEVENLABS_API_KEY and len(ELEVENLABS_API_KEY) > 20:
                    try:
                        audio_data = await synthesize_elevenlabs(
                            response_text[:400],
                            ELEVENLABS_VOICE_ID,
                            ELEVENLABS_API_KEY
                        )
                    except Exception as e:
                        print(f"ElevenLabs failed: {e}")

                if audio_data:
                    with open(temp_audio, "wb") as f:
                        f.write(audio_data)
                else:
                    synthesize_gtts(response_text[:400], temp_audio)

                if cancelled:
                    if os.path.exists(temp_audio):
                        os.remove(temp_audio)
                    continue

                try:
                    with open(temp_audio, "rb") as f:
                        audio_base64 = base64.b64encode(f.read()).decode()
                except Exception:
                    continue

                if os.path.exists(temp_audio):
                    os.remove(temp_audio)

                await manager.send_json({
                    "type": "audio",
                    "audio": audio_base64
                }, client_id)

                if is_active:
                    await manager.send_json({
                        "type": "status",
                        "status": "listening"
                    }, client_id)

            elif message_type == "reset":
                conversation.clear()
                audio_counter = 0

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        manager.disconnect(client_id)
        is_active = False


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)