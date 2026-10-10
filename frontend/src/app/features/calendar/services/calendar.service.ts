import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Availability } from '../models/availability.model';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {

  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  testConnection(): Observable<string> {
    return this.http.get(this.apiUrl, {
      responseType: 'text'
    });
  }

  getAvailabilities(): Observable<Availability[]> {
    return this.http.get<Availability[]>(
      `${this.apiUrl}/availabilities`
    );
  }

  createAvailability(data: {
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    breakTime: number;
  }): Observable<Availability> {
    return this.http.post<Availability>(
      `${this.apiUrl}/availabilities`,
      data
    );
  }
}


