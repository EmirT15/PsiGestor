import { Component, EventEmitter, Output } from '@angular/core';
import { RegularSchedule } from '../regular-schedule/regular-schedule';
import { DisabledSchedulesList } from '../disabled-schedules-list/disabled-schedules-list';

type ScheduleTab = 'regular' | 'disabled';

@Component({
  selector: 'app-manage-schedule-modal',
  imports: [
  RegularSchedule,
  DisabledSchedulesList
  ],
  templateUrl: './manage-schedule-modal.html',
  styleUrl: './manage-schedule-modal.css',
})
export class ManageScheduleModal {

  @Output() closed = new EventEmitter<void>();

  activeTab: ScheduleTab = 'regular';

  selectTab(tab: ScheduleTab): void {
    this.activeTab = tab;
  }

  close(): void {
    this.closed.emit();
  }

}