import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
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

  isMobileMenuOpen = signal<boolean>(false);

  navOptions: NavOption[] = [
    { label: 'Mi Portal', route: '/portal-alumno' },
    { label: 'Disponibilidad', route: '/patient/availability' }
  ];

  toggleMenu(): void {
    this.isMobileMenuOpen.update(state => !state);
  }

  get displayStudent(): StudentHeaderData | null {
    if (this.student) {
      return this.student;
    }
    const user = this.authService.currentUser();
    if (user) {
      return {
        name: user.name,
        studentId: user.studentCode || (user.studentId != null ? String(user.studentId) : ''),
        role: user.role === 'alumno' ? 'Alumno' : user.role,
        photoUrl: user.avatarUrl
      };
    }
    return null;
  }

  get initials(): string {
    return this.getInitials(this.displayStudent?.name);
  }

  getInitials(name?: string): string {
    if (!name) return 'AL';
    return name
      .trim()
      .split(/\s+/)
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}
