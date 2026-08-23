import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericAdviserModal } from './generic-adviser-modal';

describe('GenericAdviserModal', () => {
  let component: GenericAdviserModal;
  let fixture: ComponentFixture<GenericAdviserModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericAdviserModal],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericAdviserModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
