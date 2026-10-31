import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvailabilityForm } from './availability-form';

describe('AvailabilityForm', () => {
  let component: AvailabilityForm;
  let fixture: ComponentFixture<AvailabilityForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvailabilityForm],
    }).compileComponents();

    fixture = TestBed.createComponent(AvailabilityForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
