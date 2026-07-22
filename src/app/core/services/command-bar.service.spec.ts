import { TestBed } from '@angular/core/testing';
import { CommandBarService } from './command-bar.service';

describe('CommandBarService (launcher state)', () => {
  let svc: CommandBarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    svc = TestBed.inject(CommandBarService);
  });

  it('starts closed', () => {
    expect(svc.isOpen()).toBe(false);
  });

  it('open() scopes to a section and sets it open', () => {
    svc.open({ sectionId: 'v2', query: 'grace' });
    expect(svc.isOpen()).toBe(true);
    expect(svc.sectionId()).toBe('v2');
    expect(svc.query()).toBe('grace');
  });

  it('open() with no opts leaves the target section unchanged', () => {
    svc.sectionId.set('chorus1');
    svc.open();
    expect(svc.isOpen()).toBe(true);
    expect(svc.sectionId()).toBe('chorus1'); // not clobbered
  });

  it('close() only toggles open, preserving the target for next time', () => {
    svc.open({ sectionId: 'bridge1' });
    svc.close();
    expect(svc.isOpen()).toBe(false);
    expect(svc.sectionId()).toBe('bridge1');
  });
});
