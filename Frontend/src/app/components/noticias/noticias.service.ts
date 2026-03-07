import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NoticiasService {

  private API = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  obtenerNoticias(start: number) {
    return this.http.get<any[]>(`${this.API}/noticias?start=${start}`);
  }

  obtenerDetalle(url: string) {
    return this.http.get<any>(`${this.API}/noticia-detalle?url=${encodeURIComponent(url)}`);
  }
}

