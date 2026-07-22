import { isDefaultLabel, autoLabel, withSectionType } from './section-label';
import { Section, SectionType } from '../models/song.model';

function section(id: string, type: SectionType, label: string): Section {
  return { id, type, label, order: 0, lines: [], progression: [] };
}

describe('section-label (naming rules the Workbench relies on)', () => {
  describe('isDefaultLabel', () => {
    it('recognizes auto-generated labels', () => {
      for (const l of ['Intro', 'Verse', 'Verse 1', 'Verse 12', 'Prechorus', 'Chorus 2', 'outro']) {
        expect(isDefaultLabel(l)).toBe(true);
      }
    });

    it('treats hand-typed names as custom', () => {
      for (const l of ['Big Drop', 'Verse 1 (copy)', 'The Hook', 'Verse A', 'Chorus!', '']) {
        expect(isDefaultLabel(l)).toBe(false);
      }
    });
  });

  describe('autoLabel', () => {
    it('numbers verses and only numbers other types past the first', () => {
      expect(autoLabel([], 'verse')).toBe('Verse 1');
      expect(autoLabel([], 'chorus')).toBe('Chorus');
      expect(autoLabel([section('a', 'chorus', 'Chorus')], 'chorus')).toBe('Chorus 2');
      expect(
        autoLabel([section('a', 'verse', 'Verse 1'), section('b', 'chorus', 'Chorus')], 'verse'),
      ).toBe('Verse 2');
    });
  });

  describe('withSectionType', () => {
    it('renames a default label to match the new type, numbered against siblings', () => {
      const sections = [section('v1', 'verse', 'Verse 1'), section('c1', 'chorus', 'Chorus')];
      const next = withSectionType(sections, 'v1', 'chorus');
      const changed = next.find((s) => s.id === 'v1')!;
      expect(changed.type).toBe('chorus');
      expect(changed.label).toBe('Chorus 2'); // one chorus already exists
    });

    it('preserves a hand-customized label when the type changes', () => {
      const sections = [section('v1', 'verse', 'Big Drop')];
      const changed = withSectionType(sections, 'v1', 'bridge').find((s) => s.id === 'v1')!;
      expect(changed.type).toBe('bridge');
      expect(changed.label).toBe('Big Drop'); // custom name kept
    });

    it('does not count the section being changed when numbering', () => {
      // A lone verse retyped to bridge is "Bridge", not "Bridge 2".
      const changed = withSectionType([section('v1', 'verse', 'Verse 1')], 'v1', 'bridge').find(
        (s) => s.id === 'v1',
      )!;
      expect(changed.label).toBe('Bridge');
    });

    it('leaves other sections untouched', () => {
      const sections = [section('v1', 'verse', 'Verse 1'), section('b1', 'bridge', 'Bridge')];
      const next = withSectionType(sections, 'v1', 'chorus');
      expect(next.find((s) => s.id === 'b1')).toEqual(sections[1]);
    });
  });
});
