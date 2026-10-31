import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  studentCode = '';
  password = '';
  confirmPassword = '';
  showPassword = false;

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (!this.name || !this.email || !this.studentCode || !this.password) {
      this.errorMessage.set('Por favor completa todos los campos requeridos.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.registerStudent({
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password,
      studentCode: this.studentCode.trim()
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set('¡Registro exitoso! Iniciando sesión...');
        setTimeout(() => {
          this.authService.login({
            email: this.email.trim(),
            password: this.password
          }).subscribe({
            next: () => this.router.navigate(['/portal-alumno']),
            error: () => this.router.navigate(['/login'])
          });
        }, 1200);
      },
      error: (err) => {
        this.isLoading.set(false);
        const errorDetail = err?.error?.error || 'No se pudo completar el registro.';
        this.errorMessage.set(errorDetail);
      }
    });
  }
}
