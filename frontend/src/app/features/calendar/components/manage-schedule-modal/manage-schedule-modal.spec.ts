import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageScheduleModal } from './manage-schedule-modal';

describe('ManageScheduleModal', () => {
  let component: ManageScheduleModal;
  let fixture: ComponentFixture<ManageScheduleModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageScheduleModal],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageScheduleModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
