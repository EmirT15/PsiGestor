import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { NavOption, User } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-psychologist-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './psychologist-header.component.html',
  styleUrl: './psychologist-header.component.css'
})
export class PsychologistHeaderComponent {
  public authService = inject(AuthService);

  // Signal reactivo tomado directamente del AuthService
  currentUser = this.authService.currentUser;

  // Estado del menú desplegable en pantallas pequeñas
  isMobileMenuOpen = signal<boolean>(false);

  // Opciones de navegación exclusivas para el rol Psicóloga
  navOptions: NavOption[] = [
    { label: 'Agenda', route: '/calendar' },
    { label: 'Citas', route: '/psychologist/appointments' },
    { label: 'Pacientes', route: '/psychologist/patients' },
    { label: 'Reportes', route: '/psychologist/reports' }
  ];

  toggleMenu(): void {
    this.isMobileMenuOpen.update(state => !state);
  }

  // Genera iniciales a partir del nombre si no hay imagen de perfil
  getInitials(name?: string): string {
    if (!name) return 'PS';
    return name
      .trim()
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}