
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface StudentHeaderData {
  name: string;
  studentId: string;
  role: string;
  photoUrl?: string | null;
}

@Component({
  selector: 'app-student-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './student-header.html',
  styleUrl: './student-header.css',
})
export class StudentHeader {
  @Input() student: StudentHeaderData | null = null;

  get initials(): string {
    const name = this.student?.name?.trim();

    if (!name) {
      return '?';
    }

    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }
}
