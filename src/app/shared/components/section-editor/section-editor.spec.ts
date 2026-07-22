import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionEditor } from './section-editor';
import { Section, SectionType } from '../../../core/models/song.model';

function section(type: SectionType, label: string): Section {
  return { id: 's1', type, label, order: 0, lines: [], progression: [] };
}

describe('SectionEditor (header controls)', () => {
  let fixture: ComponentFixture<SectionEditor>;
  let ref: ComponentRef<SectionEditor>;

  function render(sec: Section): HTMLSelectElement {
    fixture = TestBed.createComponent(SectionEditor);
    ref = fixture.componentRef;
    ref.setInput('section', sec);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('select') as HTMLSelectElement;
  }

  it('shows the section type in the dropdown, not the first option', () => {
    // Regression: a freshly-added "outro" section was rendering the dropdown as "intro".
    const select = render(section('outro', 'Outro'));
    expect(select.value).toBe('outro');
  });

  it('reflects the type when the bound section changes', () => {
    const select = render(section('verse', 'Verse 1'));
    expect(select.value).toBe('verse');

    ref.setInput('section', section('chorus', 'Chorus'));
    fixture.detectChanges();
    expect(select.value).toBe('chorus');
  });

  it('keeps the dropdown and name in agreement for every section type', () => {
    for (const t of ['intro', 'verse', 'prechorus', 'chorus', 'bridge', 'hook', 'tag', 'outro'] as const) {
      const select = render(section(t, 'x'));
      expect(select.value).toBe(t);
    }
  });
});
