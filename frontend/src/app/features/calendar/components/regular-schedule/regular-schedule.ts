import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'
import {
  BreakSchedule,
  BreakScheduleConfig,
} from '../break-schedule/break-schedule';

interface WorkDay {
  id: number;
  name: string;
  shortName: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-regular-schedule',
 imports: [
  FormsModule,
  BreakSchedule,
],
  templateUrl: './regular-schedule.html',
  styleUrl: './regular-schedule.css',
})
export class RegularSchedule {
  
  appointmentDuration: number | null = null;

breakConfig: BreakScheduleConfig = {
  enabled: false,
  startTime: '',
  endTime: '',
};

updateBreakConfig(config: BreakScheduleConfig): void {
  this.breakConfig = config;
}
  workDays: WorkDay[] = [
    {
      id: 1,
      name: 'Lunes',
      shortName: 'LUN',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 2,
      name: 'Martes',
      shortName: 'MAR',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 3,
      name: 'Miércoles',
      shortName: 'MIÉ',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 4,
      name: 'Jueves',
      shortName: 'JUE',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 5,
      name: 'Viernes',
      shortName: 'VIE',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 6,
      name: 'Sábado',
      shortName: 'SÁB',
      enabled: false,
      startTime: '',
      endTime: '',
    },
    {
      id: 7,
      name: 'Domingo',
      shortName: 'DOM',
      enabled: false,
      startTime: '',
      endTime: '',
    },
  ];

  toggleDay(day: WorkDay): void {
    day.enabled = !day.enabled;
  }
}