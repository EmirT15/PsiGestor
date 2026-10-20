
import { Component, computed, inject, OnInit } from '@angular/core';

import {
  Calendar
} from '../../../calendar/components/calendar/calendar';

import {
  StudentHeader
} from '../../components/student-header/student-header';

import {
  AuthService
} from '../../../../core/services/auth.service';

@Component({
  selector: 'app-patient-availability',
  standalone: true,
  imports: [
    Calendar,
    StudentHeader
  ],
  templateUrl: './availability.html',
  styleUrl: './availability.css'
})
export class Availability implements OnInit {
  private readonly authService = inject(AuthService);

  readonly studentHeaderData = computed(() => {
    const user = this.authService.currentUser();

    if (!user || user.role !== 'alumno') {
      return null;
    }

    return {
      name: user.name,
      studentId:
        user.studentCode ||
        (user.studentId != null
          ? String(user.studentId)
          : 'No disponible'),
      role: 'Alumno'
    };
  });

  ngOnInit(): void {
    if (!this.authService.currentUser()) {
      this.authService.checkSession().subscribe();
    }
  }
}
