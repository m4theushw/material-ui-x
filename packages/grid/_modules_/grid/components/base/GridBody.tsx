import * as React from 'react';
import PropTypes from 'prop-types';
import { GridEvents } from '../../constants/eventsConstants';
import { useGridApiContext } from '../../hooks/root/useGridApiContext';
import { ElementSize } from '../../models/elementSize';
import { GridColumnsHeader } from '../columnHeaders/GridColumnHeaders';
import { GridColumnsContainer } from '../containers/GridColumnsContainer';
import { GridMainContainer } from '../containers/GridMainContainer';
import { GridWindowContainer } from '../containers/GridWindowContainer';
import { GridAutoSizer } from '../GridAutoSizer';
import { GridViewport } from '../GridViewport';
import { GridOverlays } from './GridOverlays';
import { useGridRootProps } from '../../hooks/utils/useGridRootProps';
import { GridVirtualizedContainer } from '../GridVirtualizedContainer';

interface GridBodyProps {
  children?: React.ReactNode;
}

function GridBody(props: GridBodyProps) {
  const { children } = props;
  const apiRef = useGridApiContext();
  const rootProps = useGridRootProps();

  const columnsHeaderRef = React.useRef<HTMLDivElement>(null);
  const columnsContainerRef = React.useRef<HTMLDivElement>(null);
  const renderingZoneRef = React.useRef<HTMLDivElement>(null);

  apiRef.current.columnHeadersContainerElementRef = columnsContainerRef;
  apiRef.current.columnHeadersElementRef = columnsHeaderRef;
  apiRef.current.renderingZoneRef = renderingZoneRef;

  const handleResize = React.useCallback(
    (size: ElementSize) => apiRef.current.publishEvent(GridEvents.resize, size),
    [apiRef],
  );

  return (
    <GridMainContainer>
      <GridOverlays />
      <GridColumnsContainer ref={columnsContainerRef}>
        <GridColumnsHeader ref={columnsHeaderRef} />
      </GridColumnsContainer>
      <GridAutoSizer
        nonce={rootProps.nonce}
        disableHeight={rootProps.autoHeight}
        onResize={handleResize}
      >
        {(size: any) => (
          <GridWindowContainer size={size}>
            <GridVirtualizedContainer style={{ width: '100%', height: '100%' }} />
          </GridWindowContainer>
        )}
      </GridAutoSizer>
      {children}
    </GridMainContainer>
  );
}

GridBody.propTypes = {
  // ----------------------------- Warning --------------------------------
  // | These PropTypes are generated from the TypeScript type definitions |
  // | To update them edit the TypeScript types and run "yarn proptypes"  |
  // ----------------------------------------------------------------------
  children: PropTypes.node,
} as any;

export { GridBody };
