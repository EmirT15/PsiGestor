import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PsychologistHeaderComponent } from './components/psychologist-header/psychologist-header.component';

@Component({
  selector: 'app-psychologist-layout',
  standalone: true,
  imports: [RouterOutlet, PsychologistHeaderComponent],
  template: `
    <app-psychologist-header></app-psychologist-header>
    <main class="layout-content">
      <router-outlet></router-outlet>
    </main>
  `
})
export class PsychologistLayoutComponent {}