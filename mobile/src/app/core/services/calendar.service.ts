import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { Availability, DisabledSchedule, Appointment, Student } from '../models/availability.model';
import { environment } from '../../../environments/environment';

export interface DisableSchedulePayload {
  availabilityId?: number;
  isRange?: boolean;
  date?: string;
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  reason: string;
  observation?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private http = inject(HttpClient);

  private scheduleChangedSubject = new Subject<void>();
  scheduleChanged$ = this.scheduleChangedSubject.asObservable();

  notifyScheduleChanged(): void {
    this.scheduleChangedSubject.next();
  }

  private get baseUrl(): string {
    return environment.apiUrl;
  }

  // --- DISPONIBILIDADES ---

  getAvailabilities(): Observable<Availability[]> {
    return this.http.get<Availability[]>(
      `${this.baseUrl}/availabilities`
    );
  }

  searchStudents(search: string): Observable<Student[]> {
    return this.http.get<Student[]>(
      `${this.baseUrl}/students`,
      {
        params: { search: search.trim() }
      }
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
      `${this.baseUrl}/availabilities`,
      data
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  // --- HORARIOS INHABILITADOS ---

  getDisabledSchedules(): Observable<DisabledSchedule[]> {
    return this.http.get<DisabledSchedule[]>(
      `${this.baseUrl}/disabled-schedules`
    );
  }

  disableSchedule(data: Partial<DisableSchedulePayload> | any): Observable<DisabledSchedule> {
    return this.http.post<DisabledSchedule>(
      `${this.baseUrl}/disabled-schedules`,
      data
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  rehabilitateSchedule(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/disabled-schedules/${id}`
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  // --- GESTIÓN DE CITAS ---

  cancelAppointment(
    id: number,
    reason: string,
    observation: string
  ): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/availabilities/${id}/cancel`,
      {
        reason,
        observation
      }
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  rescheduleAppointment(
    id: number,
    date: string,
    startTime: string,
    endTime: string
  ): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/availabilities/${id}/reschedule`,
      {
        date,
        startTime,
        endTime
      }
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  getAppointments(date?: string): Observable<{ appointments: Appointment[] }> {
    const url = `${this.baseUrl}/appointments`;
    if (date) {
      return this.http.get<{ appointments: Appointment[] }>(
        url,
        { params: { date } }
      );
    }
    return this.http.get<{ appointments: Appointment[] }>(url);
  }

  approveReschedule(id: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/availabilities/${id}/approve-reschedule`,
      {}
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  rejectReschedule(id: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/availabilities/${id}/reject-reschedule`,
      {}
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  approveAppointmentReschedule(appointmentId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/appointments/${appointmentId}/approve-reschedule`,
      {}
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  rejectAppointmentReschedule(appointmentId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/appointments/${appointmentId}/reject-reschedule`,
      {}
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  createAppointment(data: {
    student_id: number;
    student_name: string;
    date: string;
    start_time: string;
    end_time: string;
    duration: number;
    modality: 'In person' | 'Online';
    location?: string;
    meeting_url?: string;
    reason: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/appointments`,
      data
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }
}
