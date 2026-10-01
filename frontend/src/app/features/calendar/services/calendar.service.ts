import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { Availability, DisabledSchedule } from '../models/availability.model';

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
}