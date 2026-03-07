import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Senal {
  tipo: string;
  nombre: string;
  descripcion: string;
  imagen: string;
}

@Injectable({
  providedIn: 'root'
})
export class SenalesService {

  private API = 'http://localhost:3001/api'; // backend Node

  constructor(private http: HttpClient) {}

  obtenerSenales(): Observable<Senal[]> {
    return this.http.get<Senal[]>(`${this.API}/senales`);
  }
}