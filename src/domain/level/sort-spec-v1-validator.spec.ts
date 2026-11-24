import { SortSpecV1Validator } from './sort-spec-v1-validator';

/** The JSON example of api-contracts §6, which must be valid. */
function contractExample(): Record<string, unknown> {
  return {
    radius: 2,
    blocked: [{ q: 0, r: 0 }],
    initialStacks: [{ cell: { q: 1, r: -1 }, chips: [0, 0, 1] }],
    colors: 4,
    tray: { size: 1, minHeight: 2, maxHeight: 6, maxColorsPerStack: 2 },
    goals: 5,
  };
}

const validator = new SortSpecV1Validator();

/** The fields reported for `spec`. */
function fieldsOf(spec: unknown): string[] {
  return validator.validate(spec).map((violation) => violation.field);
}

describe('SortSpecV1Validator', () => {
  it('should_accept_the_contract_example_when_it_is_valid', () => {
    // Act
    const violations = validator.validate(contractExample());

    // Assert
    expect(violations).toEqual([]);
  });

  it('should_reject_the_spec_when_it_is_not_an_object', () => {
    // Act / Assert
    expect(validator.validate([1, 2])).toEqual([
      { field: 'spec', issue: 'must be an object' },
    ]);
  });

  it('should_reject_the_radius_when_it_is_not_2', () => {
    // Act / Assert
    expect(fieldsOf({ ...contractExample(), radius: 3 })).toEqual([
      'spec.radius',
    ]);
  });

  it('should_report_missing_and_unknown_fields_when_the_keys_differ', () => {
    // Arrange
    const spec = { ...contractExample(), theme: 'dark' };
    delete spec.goals;

    // Act
    const fields = fieldsOf(spec);

    // Assert
    expect(fields).toEqual(
      expect.arrayContaining(['spec.goals', 'spec.theme']),
    );
  });

  it.each([
    ['a decimal q', { q: 0.5, r: 0 }],
    ['a string r', { q: 0, r: '1' }],
    ['a missing r', { q: 0 }],
  ])('should_reject_a_cell_when_it_has_%s', (_case, cell) => {
    // Act
    const fields = fieldsOf({ ...contractExample(), blocked: [cell] });

    // Assert
    expect(fields).toContain('spec.blocked[0]');
  });

  it.each([
    ['negative', -1],
    ['equal to colors', 4],
    ['a decimal', 1.5],
  ])('should_reject_a_chip_when_it_is_%s', (_case, chip) => {
    // Arrange
    const spec = {
      ...contractExample(),
      initialStacks: [{ cell: { q: 1, r: -1 }, chips: [0, chip] }],
    };

    // Act / Assert
    expect(fieldsOf(spec)).toEqual(['spec.initialStacks[0].chips[1]']);
  });

  it.each([
    ['empty', []],
    ['10 chips', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  ])('should_reject_the_chips_when_they_are_%s', (_case, chips) => {
    // Arrange
    const spec = {
      ...contractExample(),
      initialStacks: [{ cell: { q: 1, r: -1 }, chips }],
    };

    // Act / Assert
    expect(fieldsOf(spec)).toEqual(['spec.initialStacks[0].chips']);
  });

  it('should_reject_a_cell_when_it_is_outside_the_board', () => {
    // Act / Assert: (2, 1) is 3 steps from the centre (rule 1).
    expect(
      fieldsOf({ ...contractExample(), blocked: [{ q: 2, r: 1 }] }),
    ).toEqual(['spec.blocked[0]']);
  });

  it('should_reject_a_cell_when_it_repeats_inside_one_list', () => {
    // Act / Assert (rule 2)
    expect(
      fieldsOf({
        ...contractExample(),
        blocked: [
          { q: 0, r: 0 },
          { q: 0, r: 0 },
        ],
      }),
    ).toEqual(['spec.blocked[1]']);
  });

  it('should_reject_a_cell_when_it_repeats_across_both_lists', () => {
    // Act / Assert (rule 2): the stack sits on the blocked centre.
    expect(
      fieldsOf({
        ...contractExample(),
        initialStacks: [{ cell: { q: 0, r: 0 }, chips: [1] }],
      }),
    ).toEqual(['spec.initialStacks[0].cell']);
  });

  it('should_reject_the_level_when_no_free_cell_is_left', () => {
    // Arrange: all 19 cells of the radius-2 board are blocked (rule 4).
    const blocked: Array<{ q: number; r: number }> = [];
    for (let q = -2; q <= 2; q++) {
      for (let r = -2; r <= 2; r++) {
        if (Math.abs(q + r) <= 2) {
          blocked.push({ q, r });
        }
      }
    }

    // Act
    const fields = fieldsOf({
      ...contractExample(),
      blocked,
      initialStacks: [],
    });

    // Assert
    expect(blocked).toHaveLength(19);
    expect(fields).toEqual(['spec']);
  });

  it('should_reject_the_tray_when_min_height_is_above_max_height', () => {
    // Act / Assert
    expect(
      fieldsOf({
        ...contractExample(),
        tray: { size: 1, minHeight: 7, maxHeight: 6, maxColorsPerStack: 2 },
      }),
    ).toEqual(['spec.tray.maxHeight']);
  });

  it('should_accept_max_colors_per_stack_when_it_exceeds_max_height', () => {
    // Act / Assert: it is an upper bound (api-contracts §6).
    expect(
      validator.validate({
        ...contractExample(),
        tray: { size: 1, minHeight: 1, maxHeight: 2, maxColorsPerStack: 4 },
      }),
    ).toEqual([]);
  });

  it.each([
    ['colors below 2', { colors: 1 }, 'spec.colors'],
    ['colors above 8', { colors: 9 }, 'spec.colors'],
    ['goals of 0', { goals: 0 }, 'spec.goals'],
    ['goals above 99', { goals: 100 }, 'spec.goals'],
  ])('should_reject_the_spec_when_it_has_%s', (_case, change, field) => {
    // Act / Assert
    expect(fieldsOf({ ...contractExample(), ...change })).toContain(field);
  });

  it('should_reject_the_tray_when_its_size_is_not_1', () => {
    // Act / Assert
    expect(
      fieldsOf({
        ...contractExample(),
        tray: { size: 2, minHeight: 2, maxHeight: 6, maxColorsPerStack: 2 },
      }),
    ).toEqual(['spec.tray.size']);
  });

  it('should_report_each_field_when_it_has_the_wrong_json_type', () => {
    // Act
    const fields = fieldsOf({
      ...contractExample(),
      tray: 'small',
      blocked: { q: 0, r: 0 },
      initialStacks: [7, { cell: 'centre', chips: 'red' }],
    });

    // Assert
    expect(fields).toEqual([
      'spec.tray',
      'spec.blocked',
      'spec.initialStacks[0]',
      'spec.initialStacks[1].chips',
      'spec.initialStacks[1].cell',
    ]);
  });

  it('should_report_every_violation_when_several_fields_fail', () => {
    // Act
    const fields = fieldsOf({
      ...contractExample(),
      radius: 4,
      goals: 0,
      blocked: [{ q: 5, r: 5 }],
    });

    // Assert
    expect(fields).toEqual(
      expect.arrayContaining(['spec.radius', 'spec.goals', 'spec.blocked[0]']),
    );
    expect(fields).toHaveLength(3);
  });
});
