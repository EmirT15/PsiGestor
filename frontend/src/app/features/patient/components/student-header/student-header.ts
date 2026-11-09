import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { NavOption } from '../../../../core/models/auth.model';

export interface StudentHeaderData {
  name: string;
  studentId: string;
  role: string;
  photoUrl?: string | null;
}

@Component({
  selector: 'app-student-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './student-header.html',
  styleUrl: './student-header.css',
})
export class StudentHeader {
  @Input() student: StudentHeaderData | null = null;

  public authService = inject(AuthService);
  private router = inject(Router);

  isMobileMenuOpen = signal(false);
  isProfileMenuOpen = signal(false);

  navOptions: NavOption[] = [
    { label: 'Inicio', route: '/portal-alumno' },
    { label: 'Disponibilidad', route: '/patient/availability' },
    { label: 'Mis citas', route: '/portal-alumno' }
  ];

  toggleMenu(): void {
    this.isMobileMenuOpen.update(state => !state);
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(state => !state);
  }

  closeMenus(): void {
    this.isMobileMenuOpen.set(false);
    this.isProfileMenuOpen.set(false);
  }

  logout(): void {
    this.closeMenus();
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  get displayStudent(): StudentHeaderData | null {
    if (this.student) {
      return this.student;
    }

    const user = this.authService.currentUser();

    if (!user || user.role !== 'alumno') {
      return null;
    }

    return {
      name: user.name,
      studentId: user.studentCode || (user.studentId != null ? String(user.studentId) : ''),
      role: 'Alumno',
      photoUrl: user.avatarUrl
    };
  }

  get initials(): string {
    return this.getInitials(this.displayStudent?.name);
  }

  getInitials(name?: string): string {
    if (!name?.trim()) {
      return 'AL';
    }

    return name
      .trim()
      .split(/\s+/)
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}
