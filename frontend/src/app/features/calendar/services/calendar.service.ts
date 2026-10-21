import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { Availability, DisabledSchedule } from '../models/availability.model';

export interface Student {
  id: number;
  studentId: string;
  name: string;
  program: string;
  semester: number;
}

export interface Appointment {
  id: number;
  student_id: number;
  student_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  modality: 'In person' | 'Online' | 'Presencial' | 'En línea' | string;
  location: string | null;
  meeting_url: string | null;
  reason: string;
  status: string;
  created_at: string;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  reschedule_reason?: string | null;
  rescheduled_at?: string | null;
  proposed_date?: string | null;
  proposed_start_time?: string | null;
  proposed_end_time?: string | null;
  proposed_availability_id?: number | null;
  reschedule_requested_by?: 'psicologo' | 'alumno' | null;
}

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
  private platformId = inject(PLATFORM_ID);

  // Evento para notificar cambios en la agenda
  private scheduleChangedSubject = new Subject<void>();
  scheduleChanged$ = this.scheduleChangedSubject.asObservable();

  notifyScheduleChanged(): void {
    this.scheduleChangedSubject.next();
  }

  // Propiedad centralizada para SSR (Docker) y Navegador
  private get baseUrl(): string {
    if (isPlatformServer(this.platformId)) {
      return 'http://backend:5000';
    }
    return 'http://localhost:5000';
  }

  testConnection(): Observable<string> {
    return this.http.get(this.baseUrl, {
      responseType: 'text'
    });
  }

  // --- DISPONIBILIDADES (AVAILABILITIES) ---

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

  // --- HORARIOS INHABILITADOS (DISABLED SCHEDULES) ---

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

  updateDisabledSchedule(id: number | string, data: Partial<DisableSchedulePayload>): Observable<DisabledSchedule> {
    return this.http.put<DisabledSchedule>(
      `${this.baseUrl}/disabled-schedules/${id}`,
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

  enableSchedule(id: number): Observable<void> {
    return this.rehabilitateSchedule(id);
  }

  checkConflicts(data: { startDate: string; endDate: string; startTime: string; endTime: string }): Observable<{ hasConflict: boolean; conflictCount: number }> {
    return this.http.post<{ hasConflict: boolean; conflictCount: number }>(
      `${this.baseUrl}/disabled-schedules/check-conflicts`,
      data
    );
  }

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
    endTime: string,
    reason?: string
  ): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/availabilities/${id}/reschedule`,
      {
        date,
        startTime,
        endTime,
        reason
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

  // =========================================================
  // GESTIÓN DE CITAS DEL ALUMNO (SPRINT 2)
  // =========================================================

  bookStudentAppointment(data: {
    date: string;
    start_time: string;
    end_time: string;
    duration: number;
    modality: 'Presencial' | 'En línea' | 'In person' | 'Online' | string;
    location?: string;
    meeting_url?: string;
    reason: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/appointments/book`,
      data,
      { withCredentials: true }
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  getStudentMyAppointments(): Observable<{ appointments: Appointment[] }> {
    return this.http.get<{ appointments: Appointment[] }>(
      `${this.baseUrl}/appointments/my`,
      { withCredentials: true }
    );
  }

  cancelStudentAppointment(appointmentId: number, reason: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/appointments/${appointmentId}/cancel`,
      { reason },
      { withCredentials: true }
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  requestStudentReschedule(
    appointmentId: number,
    proposedAvailabilityId: number,
    reason: string
  ): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/appointments/${appointmentId}/reschedule-request`,
      {
        proposed_availability_id: proposedAvailabilityId,
        reason
      },
      { withCredentials: true }
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  approveReschedule(appointmentId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/appointments/${appointmentId}/approve-reschedule`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  rejectReschedule(appointmentId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/appointments/${appointmentId}/reject-reschedule`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  approveAvailabilityReschedule(availabilityId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/availabilities/${availabilityId}/approve-reschedule`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }

  rejectAvailabilityReschedule(availabilityId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/availabilities/${availabilityId}/reject-reschedule`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.notifyScheduleChanged())
    );
  }
}
