import { Component } from '@angular/core';

import {
  Calendar
} from '../../../calendar/components/calendar/calendar';

@Component({
  selector: 'app-patient-availability',
  standalone: true,

  imports: [
    Calendar
  ],

  templateUrl: './availability.html',
  styleUrl: './availability.css'
})
export class Availability {}