import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router ,RouterLink, RouterLinkActive } from '@angular/router';
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
  private router = inject(Router);

  // Signal reactivo tomado directamente del AuthService
  currentUser = this.authService.currentUser;

  // Estado del menú desplegable en pantallas pequeñas
  isMobileMenuOpen = signal<boolean>(false);
  isProfileMenuOpen = signal<boolean>(false);

  // Opciones de navegación exclusivas para el rol Psicóloga
  navOptions: NavOption[] = [
    { label: 'Agenda', route: '/calendar' }
   // { label: 'Citas', route: '/psychologist/appointments' },
    //{ label: 'Pacientes', route: '/psychologist/patients' },
    //{ label: 'Reportes', route: '/psychologist/reports' }
  ];

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(state => !state);
    if (this.isMobileMenuOpen()) {
      this.isProfileMenuOpen.set(false);
    }
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileMenuOpen.update(state => !state);
    if (this.isProfileMenuOpen()) {
      this.isMobileMenuOpen.set(false);
    }
  }

  // Cierra el submenú de perfil al hacer clic fuera de él
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-zone-container')) {
      this.isProfileMenuOpen.set(false);
    }
  }

  onLogout(): void {
    this.isProfileMenuOpen.set(false);
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
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