import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, personOutline, refreshOutline, alertCircleOutline } from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';
import { CalendarService } from '../core/services/calendar.service';
import { Availability } from '../core/models/availability.model';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSpinner
  ]
})
export class Tab1Page implements OnInit {
  authService = inject(AuthService);
  private calendarService = inject(CalendarService);

  myAppointments: Availability[] = [];
  isLoading = false;

  constructor() {
    addIcons({ calendarOutline, timeOutline, personOutline, refreshOutline, alertCircleOutline });
  }

  ngOnInit(): void {
    this.loadMyAppointments();
    this.calendarService.scheduleChanged$.subscribe(() => {
      this.loadMyAppointments();
    });
  }

  loadMyAppointments(event?: any): void {
    this.isLoading = true;
    this.calendarService.getAvailabilities().subscribe({
      next: (all) => {
        const studentName = this.authService.currentUser()?.name?.toLowerCase() || '';
        // Filtramos las citas que pertenecen a este alumno o citas reservadas
        this.myAppointments = (all || []).filter(item => {
          if (item.status === 'Disponible' || item.status === 'Inhabilitado') return false;
          if (!studentName) return item.status === 'Reservado' || item.status === 'Cancelado';
          return item.studentName?.toLowerCase().includes(studentName);
        }).sort((a, b) => b.date.localeCompare(a.date));

        this.isLoading = false;
        if (event) event.target.complete();
      },
      error: () => {
        this.isLoading = false;
        if (event) event.target.complete();
      }
    });
  }
}
