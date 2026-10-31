import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline,
  lockClosedOutline,
  schoolOutline,
  shieldCheckmarkOutline,
  heartOutline,
  logInOutline
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner
  ]
})
export class LoginPage {
  private authService = inject(AuthService);
  private router = inject(Router);

  selectedRole: 'psicologo' | 'alumno' = 'psicologo';
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor() {
    addIcons({
      personOutline,
      lockClosedOutline,
      schoolOutline,
      shieldCheckmarkOutline,
      heartOutline,
      logInOutline
    });
  }

  onRoleChange(event: any): void {
    this.selectedRole = event.detail.value;
    this.errorMessage = '';
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Por favor ingresa tu correo y contraseña.';
      return;
    }

    this.isLoading = true;
    this.authService.login({
      email: this.email.trim(),
      password: this.password
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        // Validar si el rol coincide con la pestaña seleccionada
        if (res.user.role !== this.selectedRole) {
          const expected = this.selectedRole === 'psicologo' ? 'Psicólogo' : 'Alumno';
          const actual = res.user.role === 'psicologo' ? 'Psicólogo' : 'Alumno';
          this.errorMessage = `Esta cuenta pertenece al perfil "${actual}". Cambia la pestaña a "${actual}" para ingresar.`;
          return;
        }

        if (res.user.role === 'psicologo') {
          this.router.navigate(['/psicologo']);
        } else {
          this.router.navigate(['/tabs']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.error || 'No se pudo iniciar sesión. Verifica tus credenciales.';
        this.errorMessage = msg;
      }
    });
  }
}
