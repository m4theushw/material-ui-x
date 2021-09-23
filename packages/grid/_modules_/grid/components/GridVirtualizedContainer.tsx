import * as React from 'react';
import styled from '@mui/styles/styled';
import * as CSS from 'csstype';
import { useGridRootProps } from '../hooks/utils/useGridRootProps';
import { useGridApiContext } from '../hooks/root/useGridApiContext';
import { useGridSelector } from '../hooks/features/core/useGridSelector';
import { gridScrollBarSizeSelector } from '../hooks/root/gridContainerSizesSelector';
import {
  visibleGridColumnsSelector,
  gridColumnsTotalWidthSelector,
  gridColumnsMetaSelector,
} from '../hooks/features/columns/gridColumnsSelector';
import { gridRenderingSelector } from '../hooks/features/virtualization/renderingStateSelector';
import {
  gridFocusCellSelector,
  gridTabIndexCellSelector,
} from '../hooks/features/focus/gridFocusStateSelector';
import { gridSelectionStateSelector } from '../hooks/features/selection/gridSelectionSelector';
import {
  visibleSortedGridRowsAsArraySelector,
  visibleGridRowCountSelector,
} from '../hooks/features/filter/gridFilterSelector';
import { gridDensityRowHeightSelector } from '../hooks/features/density/densitySelector';
import { gridEditRowsStateSelector } from '../hooks/features/rows/gridEditRowsSelector';
import { GridRow } from './GridRow';
import { GridEmptyCell } from './cell/GridEmptyCell';
import { GridRowCells } from './cell/GridRowCells';
import { useGridState } from '../hooks/features/core/useGridState';

const Root = styled('div')({
  position: 'relative',
  overflow: 'auto',
});

// Uses binary search to avoid looping through all possible positions
function getIndexFromScroll(
  offset: number,
  positions: number[],
  sliceStart = 0,
  sliceEnd = positions.length,
): number {
  if (positions.length <= 0) {
    return -1;
  }

  if (sliceStart >= sliceEnd) {
    return sliceStart;
  }

  const pivot = sliceStart + Math.floor((sliceEnd - sliceStart) / 2);
  const itemOffset = positions[pivot];
  return offset <= itemOffset
    ? getIndexFromScroll(offset, positions, sliceStart, pivot)
    : getIndexFromScroll(offset, positions, pivot + 1, sliceEnd);
}

const GridVirtualizedContainer = (props) => {
  const apiRef = useGridApiContext();
  const rootProps = useGridRootProps();
  const [, setGridState, forceUpdate] = useGridState(apiRef);
  const scrollBarState = useGridSelector(apiRef, gridScrollBarSizeSelector);
  const visibleColumns = useGridSelector(apiRef, visibleGridColumnsSelector);
  const columnsMeta = useGridSelector(apiRef, gridColumnsMetaSelector);
  const renderState = useGridSelector(apiRef, gridRenderingSelector);
  const cellFocus = useGridSelector(apiRef, gridFocusCellSelector);
  const cellTabIndex = useGridSelector(apiRef, gridTabIndexCellSelector);
  const selection = useGridSelector(apiRef, gridSelectionStateSelector);
  const visibleSortedRowsAsArray = useGridSelector(apiRef, visibleSortedGridRowsAsArraySelector);
  const rowHeight = useGridSelector(apiRef, gridDensityRowHeightSelector);
  const editRowsState = useGridSelector(apiRef, gridEditRowsStateSelector);
  const visibleRowCount = useGridSelector(apiRef, visibleGridRowCountSelector);
  const columnsTotalWidth = useGridSelector(apiRef, gridColumnsTotalWidthSelector);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const prevRenderContext = React.useRef({
    firstRowIndex: 0,
    lastRowIndex: 8,
    firstColumnIndex: 0,
    lastColumnIndex: 6,
  });

  apiRef.current.windowRef = rootRef;

  const filteredSelection = React.useMemo(
    () =>
      typeof rootProps.isRowSelectable === 'function'
        ? selection.filter((id) => rootProps.isRowSelectable!(apiRef.current.getRowParams(id)))
        : selection,
    [apiRef, rootProps.isRowSelectable, selection],
  );

  const selectionLookup = React.useMemo(
    () =>
      filteredSelection.reduce((lookup, rowId) => {
        lookup[rowId] = rowId;
        return lookup;
      }, {}),
    [filteredSelection],
  );

  const getRowStyle = (index: number): CSS.Properties<string | number> => {
    const firstRowToRender = Math.max(renderState.renderContext!.firstRowIdx! - 6, 0);
    const firstColumnToRender = Math.max(renderState.renderContext!.firstColIdx! - 4, 0);
    const top = (firstRowToRender + index) * rowHeight;
    const left = columnsMeta.positions[firstColumnToRender];
    return { position: 'absolute', top, left };
  };

  const getRowsElements = () => {
    if (renderState.renderContext == null) {
      return null;
    }

    const renderedRows = visibleSortedRowsAsArray.slice(
      Math.max(renderState.renderContext.firstRowIdx! - 6, 0),
      Math.min(renderState.renderContext.lastRowIdx! + 6, 100000),
    );

    return renderedRows.map(([id, row], idx) => (
      <GridRow
        key={id}
        id={id}
        selected={selectionLookup[id] !== undefined}
        rowIndex={renderState.renderContext!.firstRowIdx! + idx}
        style={getRowStyle(idx)}
      >
        <GridEmptyCell width={renderState.renderContext!.leftEmptyWidth} height={rowHeight} />
        <GridRowCells
          columns={visibleColumns}
          row={row}
          id={id}
          height={rowHeight}
          firstColIdx={Math.max(renderState.renderContext!.firstColIdx! - 4, 0)}
          lastColIdx={Math.min(renderState.renderContext!.lastColIdx! + 4, visibleColumns.length)}
          hasScrollX={scrollBarState.hasScrollX}
          hasScrollY={scrollBarState.hasScrollY}
          showCellRightBorder={rootProps.showCellRightBorder}
          extendRowFullWidth={!rootProps.disableExtendRowFullWidth}
          rowIndex={renderState.renderContext!.firstRowIdx! + idx}
          cellFocus={cellFocus}
          cellTabIndex={cellTabIndex}
          isSelected={selectionLookup[id] !== undefined}
          editRowState={editRowsState[id]}
          getCellClassName={rootProps.getCellClassName}
        />
        <GridEmptyCell width={renderState.renderContext!.rightEmptyWidth} height={rowHeight} />
      </GridRow>
    ));
  };

  const handleScroll = () => {
    const { scrollTop, scrollLeft } = rootRef.current!;

    const firstRowIndex = Math.floor(scrollTop / rowHeight);
    const lastRowIndex = firstRowIndex + 10;
    const rowsScrolledSincePreviousRender = Math.abs(
      firstRowIndex - prevRenderContext.current.firstRowIndex,
    );

    const firstColumnIndex = getIndexFromScroll(scrollLeft, columnsMeta.positions);
    const lastColumnIndex = getIndexFromScroll(
      scrollLeft + rootRef.current!.clientWidth,
      columnsMeta.positions,
    );
    const columnsScrolledSincePreviousRender = Math.abs(
      firstColumnIndex - prevRenderContext.current.firstColumnIndex,
    );

    if (rowsScrolledSincePreviousRender >= 3 || columnsScrolledSincePreviousRender >= 3) {
      setGridState((state) => ({
        ...state,
        rendering: {
          ...state.rendering,
          renderContext: {
            firstColIdx: firstColumnIndex,
            lastColIdx: lastColumnIndex,
            firstRowIdx: firstRowIndex,
            lastRowIdx: lastRowIndex,
          },
        },
      }));

      const newContext = {
        firstRowIndex,
        lastRowIndex,
        firstColumnIndex,
        lastColumnIndex,
      };
      prevRenderContext.current = newContext;
      forceUpdate();
    }
  };

  const contentSize = React.useMemo(() => {
    return { width: columnsTotalWidth, height: visibleRowCount * rowHeight };
  }, [columnsTotalWidth, visibleRowCount, rowHeight]);

  return (
    <Root ref={rootRef} onScroll={handleScroll} {...props}>
      <div style={contentSize}>{getRowsElements()}</div>
    </Root>
  );
};

export { GridVirtualizedContainer };
