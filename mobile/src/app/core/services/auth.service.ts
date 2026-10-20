import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { AuthResponse, MeResponse, User } from '../models/auth.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  currentUser = signal<User | null>(null);
  isLoading = signal<boolean>(false);

  private get baseUrl(): string {
    return `${environment.apiUrl}/api/auth`;
  }

  checkSession(): Observable<User | null> {
    return this.http.get<MeResponse>(`${this.baseUrl}/me`).pipe(
      map(res => {
        const user = res.authenticated ? res.user : null;
        this.currentUser.set(user);
        return user;
      }),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      })
    );
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(res => {
        this.currentUser.set(res.user);
      })
    );
  }

  registerStudent(payload: {
    name: string;
    email: string;
    password: string;
    studentCode: string;
    program?: string;
    semester?: number;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload);
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/logout`, {}).pipe(
      tap(() => {
        this.currentUser.set(null);
      }),
      catchError(() => {
        this.currentUser.set(null);
        return of({ message: 'Sesión cerrada localmente.' });
      })
    );
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  isAlumno(): boolean {
    return this.currentUser()?.role === 'alumno';
  }

  isPsicologo(): boolean {
    return this.currentUser()?.role === 'psicologo';
  }
}
