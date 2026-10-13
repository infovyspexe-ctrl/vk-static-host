// Combat owns disposable cells. The purchased fortress remains intact even
// after a loss or closing the tab mid-battle (classic, not attrition mode).
export function battleBase(base, unitTable, blockTable) {
  return { ...base, cells: new Map([...base.cells].map(([key, cell]) => {
    const spec = (cell.kind === 'unit' ? unitTable : blockTable)[cell.typeId];
    return [key, { ...cell, hp: spec.hp, ...(cell.kind === 'block' ? { reflect: spec.reflect ?? 0 } : {}) }];
  })) };
}
