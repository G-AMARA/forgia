import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericModalComponent } from './generic-adviser-modal';

describe('GenericModalComponent', () => {
  let component: GenericModalComponent;
  let fixture: ComponentFixture<GenericModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
