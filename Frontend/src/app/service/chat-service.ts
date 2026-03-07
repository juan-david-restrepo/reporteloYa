import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly apiKey = 'AIzaSyBGAppOM-QkC6vUWMPhrkyXAXOtSmdAzlI';
  private readonly API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

  constructor(private http: HttpClient) {}

  consultarChatbot(texto: string): Observable<string> {
    const body = {
      contents: [{
        parts: [{
          text: `Eres Robotransit, un asistente especializado en tránsito. Responde de forma clara y útil a esta consulta:\n${texto}`
        }]
      }]
    };

    return this.http.post<any>(this.API_URL, body).pipe(
      map(res => res?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se pudo obtener respuesta.'),
      catchError(err => {
        console.error(err);
        return throwError(() => 'Error al conectar con la IA.');
      })
    );
  }
}
