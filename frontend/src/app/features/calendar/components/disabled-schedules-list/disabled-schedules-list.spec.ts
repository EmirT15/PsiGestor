import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisabledSchedulesList } from './disabled-schedules-list';

describe('DisabledSchedulesList', () => {
  let component: DisabledSchedulesList;
  let fixture: ComponentFixture<DisabledSchedulesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisabledSchedulesList],
    }).compileComponents();

    fixture = TestBed.createComponent(DisabledSchedulesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
