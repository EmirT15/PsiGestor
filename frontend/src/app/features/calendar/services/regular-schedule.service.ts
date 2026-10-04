import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';


export interface RegularScheduleDayRequest {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}


export interface RegularScheduleBreakRequest {
  enabled: boolean;
  startTime: string;
  endTime: string;
}


export interface SaveRegularScheduleRequest {
  appointmentDuration: number;
  appointmentGapMinutes: number;

  workDays: RegularScheduleDayRequest[];

  break: RegularScheduleBreakRequest;
}


export interface RegularScheduleResponse {
  id: number;

  appointmentDuration: number;

  appointmentGapMinutes: number;

  break: {
    enabled: boolean;
    startTime: string | null;
    endTime: string | null;
  };

  workDays: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];

  createdAt: string;

  updatedAt: string;
}


@Injectable({
  providedIn: 'root'
})
export class RegularScheduleService {

  private readonly apiUrl =
    'http://localhost:5000';


  constructor(
    private http: HttpClient
  ) {}


  getRegularSchedule():
    Observable<RegularScheduleResponse | null> {

    return this.http.get<
      RegularScheduleResponse | null
    >(
      `${this.apiUrl}/regular-schedule`
    );
  }


  saveRegularSchedule(
    data: SaveRegularScheduleRequest
  ): Observable<RegularScheduleResponse> {

    return this.http.put<
      RegularScheduleResponse
    >(
      `${this.apiUrl}/regular-schedule`,
      data
    );
  }
}