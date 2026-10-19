import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline,
  lockClosedOutline,
  mailOutline,
  idCardOutline,
  schoolOutline,
  checkmarkCircleOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardContent,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class RegisterPage {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  studentCode = '';
  program = '';
  semester: number | null = null;
  email = '';
  password = '';
  confirmPassword = '';

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  readonly academicPrograms = [
    'Ingeniería en Sistemas Computacionales',
    'Ingeniería Mecatrónica',
    'Ingeniería Industrial',
    'Ingeniería en Administración',
    'Ingeniería en Innovación Agrícola',
    'Licenciatura en Turismo'
  ];

  constructor() {
    addIcons({
      personOutline,
      lockClosedOutline,
      mailOutline,
      idCardOutline,
      schoolOutline,
      checkmarkCircleOutline,
      arrowBackOutline
    });
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.name.trim() || !this.studentCode.trim() || !this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Completa todos los campos obligatorios.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.isLoading = true;
    this.authService.registerStudent({
      name: this.name.trim(),
      studentCode: this.studentCode.trim().toUpperCase(),
      email: this.email.trim(),
      password: this.password,
      program: this.program || undefined,
      semester: this.semester ? Number(this.semester) : undefined
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = '¡Registro completado! Tu matrícula ha sido validada. Redirigiendo al login...';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1800);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'No se pudo completar el registro.';
      }
    });
  }
}
