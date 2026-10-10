import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Appointment } from '../models/appointment.model';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:5000/appointments';

  createAppointment(appointment: Appointment): Observable<Appointment> {
    return this.http.post<Appointment>(
      this.apiUrl,
      appointment
    );
  }

  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(
      this.apiUrl
    );
  }
}