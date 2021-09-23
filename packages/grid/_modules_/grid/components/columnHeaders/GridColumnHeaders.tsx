import * as React from 'react';
import { useForkRef } from '@mui/material/utils';
import clsx from 'clsx';
import {
  visibleGridColumnsSelector,
  gridColumnsMetaSelector,
} from '../../hooks/features/columns/gridColumnsSelector';
import { GridState } from '../../hooks/features/core/gridState';
import { useGridSelector } from '../../hooks/features/core/useGridSelector';
import { gridRenderingSelector } from '../../hooks/features/virtualization/renderingStateSelector';
import { useGridApiContext } from '../../hooks/root/useGridApiContext';
import { GridEmptyCell } from '../cell/GridEmptyCell';
import { GridScrollArea } from '../GridScrollArea';
import { GridColumnHeadersItemCollection } from './GridColumnHeadersItemCollection';
import { gridDensityHeaderHeightSelector } from '../../hooks/features/density/densitySelector';
import { gridColumnReorderDragColSelector } from '../../hooks/features/columnReorder/columnReorderSelector';
import { gridContainerSizesSelector } from '../../hooks/root/gridContainerSizesSelector';
import { getDataGridUtilityClass } from '../../gridClasses';
import { composeClasses } from '../../utils/material-ui-utils';
import { useGridRootProps } from '../../hooks/utils/useGridRootProps';
import { GridComponentProps } from '../../GridComponentProps';
import { useNativeEventListener } from '../../hooks/root/useNativeEventListener';

export const gridScrollbarStateSelector = (state: GridState) => state.scrollBar;

type OwnerState = {
  classes?: GridComponentProps['classes'];
  dragCol: string;
};

const useUtilityClasses = (ownerState: OwnerState) => {
  const { dragCol, classes } = ownerState;

  const slots = {
    wrapper: ['columnHeaderWrapper', dragCol && 'columnHeaderDropZone'],
  };

  return composeClasses(slots, getDataGridUtilityClass, classes);
};

export const GridColumnsHeader = React.forwardRef<HTMLDivElement, {}>(function GridColumnsHeader(
  props,
  ref,
) {
  const apiRef = useGridApiContext();
  const columns = useGridSelector(apiRef, visibleGridColumnsSelector);
  const containerSizes = useGridSelector(apiRef, gridContainerSizesSelector);
  const columnsMeta = useGridSelector(apiRef, gridColumnsMetaSelector);
  const headerHeight = useGridSelector(apiRef, gridDensityHeaderHeightSelector);
  const renderCtx = useGridSelector(apiRef, gridRenderingSelector).renderContext;
  const { hasScrollX } = useGridSelector(apiRef, gridScrollbarStateSelector);
  const dragCol = useGridSelector(apiRef, gridColumnReorderDragColSelector);
  const rootProps = useGridRootProps();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const handleRef = useForkRef(ref, wrapperRef);

  const ownerState = { ...props, dragCol, classes: rootProps.classes };
  const classes = useUtilityClasses(ownerState);

  const renderedCols = React.useMemo(() => {
    if (renderCtx == null) {
      return [];
    }
    const firstColumnToRender = Math.max(renderCtx.firstColIdx! - 4, 0);
    const lastColumnToRender = Math.min(renderCtx.lastColIdx! + 4, columns.length);
    return columns.slice(firstColumnToRender, lastColumnToRender);
  }, [columns, renderCtx]);

  const handleScroll = React.useCallback(() => {
    if (!apiRef.current.windowRef?.current || !renderCtx) {
      return;
    }
    const { scrollLeft } = apiRef.current.windowRef.current;
    const firstColumnToRender = Math.max(renderCtx.firstColIdx! - 4, 0);
    const widthUpToFirstColumnToRender = columnsMeta.positions[firstColumnToRender];
    const translation = scrollLeft % widthUpToFirstColumnToRender || scrollLeft;
    wrapperRef.current!.style.transform = `translate3d(${-translation}px, 0px, 0px)`;
  }, [apiRef, columnsMeta.positions, renderCtx]);

  useNativeEventListener(apiRef, apiRef.current.windowRef!, 'scroll', handleScroll, {
    passive: true,
  });

  return (
    <React.Fragment>
      <GridScrollArea scrollDirection="left" />
      <div
        ref={handleRef}
        className={clsx(classes.wrapper, hasScrollX && 'scroll')}
        aria-rowindex={1}
        role="row"
        style={{ minWidth: containerSizes?.totalSizes?.width }}
      >
        <GridEmptyCell width={renderCtx?.leftEmptyWidth} height={headerHeight} />
        <GridColumnHeadersItemCollection columns={renderedCols} />
        <GridEmptyCell width={renderCtx?.rightEmptyWidth} height={headerHeight} />
      </div>
      <GridScrollArea scrollDirection="right" />
    </React.Fragment>
  );
});
