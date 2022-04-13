import * as React from 'react';
import { GridEventListener, GridEvents } from '../../../models/events';
import { DataGridProcessedProps } from '../../../models/props/DataGridProps';
import { GridApiCommunity } from '../../../models/api/gridApiCommunity';
import { GridRowApi } from '../../../models/api/gridRowApi';
import {
  GridRowModel,
  GridRowId,
  GridRowsProp,
  GridRowIdGetter,
  GridRowTreeNodeConfig,
  GridRowTreeConfig,
} from '../../../models/gridRows';
import { useGridApiMethod } from '../../utils/useGridApiMethod';
import { useGridLogger } from '../../utils/useGridLogger';
import {
  gridRowCountSelector,
  gridRowsLookupSelector,
  gridRowTreeSelector,
  gridRowIdsSelector,
  gridRowGroupingNameSelector,
} from './gridRowsSelector';
import { GridSignature, useGridApiEventHandler } from '../../utils/useGridApiEventHandler';
import { GridStateInitializer } from '../../utils/useGridInitializeState';
import { useGridVisibleRows } from '../../utils/useGridVisibleRows';
import { GridRowInternalCacheValue, GridRowsInternalCache, GridRowsState } from './gridRowsState';
import { checkGridRowIdIsValid } from './gridRowsUtils';

interface ConvertRowsPropToStateParams {
  prevCache: GridRowsInternalCache;
  getRowId: DataGridProcessedProps['getRowId'];
  rows?: GridRowsProp;
}

function getGridRowId(
  rowModel: GridRowModel,
  getRowId?: GridRowIdGetter,
  detailErrorMessage?: string,
): GridRowId {
  const id = getRowId ? getRowId(rowModel) : rowModel.id;
  checkGridRowIdIsValid(id, rowModel, detailErrorMessage);
  return id;
}

const convertRowsPropToState = ({
  prevCache: prevState,
  rows,
  getRowId,
}: ConvertRowsPropToStateParams): GridRowsInternalCache => {
  let value: GridRowInternalCacheValue;
  if (rows) {
    value = {
      idRowsLookup: {},
      ids: [],
    };
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const id = getGridRowId(row, getRowId);
      value.idRowsLookup[id] = row;
      value.ids.push(id);
    }
  } else {
    value = prevState.value;
  }

  return {
    value,
    rowsBeforePartialUpdates: rows ?? prevState.rowsBeforePartialUpdates,
  };
};

const getRowsStateFromCache = (
  rowsCache: GridRowsInternalCache,
  previousTree: GridRowTreeConfig | null,
  apiRef: React.MutableRefObject<GridApiCommunity>,
  rowCountProp: number | undefined,
  loadingProp: boolean | undefined,
): GridRowsState => {
  const { value } = rowsCache;
  const rowCount = rowCountProp ?? 0;

  const groupingResponse = apiRef.current.unstable_applyStrategyProcessor('rowTreeCreation', {
    ...value,
    previousTree,
  });

  const dataTopLevelRowCount =
    groupingResponse.treeDepth === 1
      ? groupingResponse.ids.length
      : Object.values(groupingResponse.tree).filter((node) => node.parent == null).length;

  return {
    ...groupingResponse,
    loading: loadingProp,
    totalRowCount: Math.max(rowCount, groupingResponse.ids.length),
    totalTopLevelRowCount: Math.max(rowCount, dataTopLevelRowCount),
  };
};

export const rowsStateInitializer: GridStateInitializer<
  Pick<DataGridProcessedProps, 'rows' | 'rowCount' | 'getRowId' | 'loading'>
> = (state, props, apiRef) => {
  apiRef.current.rowsCache = convertRowsPropToState({
    rows: props.rows,
    getRowId: props.getRowId,
    prevCache: {
      value: {
        idRowsLookup: {},
        ids: [],
      },
      rowsBeforePartialUpdates: [],
    },
  });

  return {
    ...state,
    rows: getRowsStateFromCache(
      apiRef.current.rowsCache,
      null,
      apiRef,
      props.rowCount,
      props.loading,
    ),
  };
};

export const useGridRows = (
  apiRef: React.MutableRefObject<GridApiCommunity>,
  props: Pick<
    DataGridProcessedProps,
    | 'rows'
    | 'getRowId'
    | 'rowCount'
    | 'throttleRowsMs'
    | 'signature'
    | 'pagination'
    | 'paginationMode'
    | 'loading'
  >,
): void => {
  if (process.env.NODE_ENV !== 'production') {
    // Freeze rows for immutability
    Object.freeze(props.rows);
  }

  const logger = useGridLogger(apiRef, 'useGridRows');
  const currentPage = useGridVisibleRows(apiRef, props);

  const lastUpdateMs = React.useRef(Date.now());
  const timeout = React.useRef<NodeJS.Timeout | null>(null);

  const getRow = React.useCallback<GridRowApi['getRow']>(
    (id) => (gridRowsLookupSelector(apiRef)[id] as any) ?? null,
    [apiRef],
  );

  const lookup = React.useMemo(
    () =>
      currentPage.rows.reduce<Record<GridRowId, number>>((acc, { id }, index) => {
        acc[id] = index;
        return acc;
      }, {}),
    [currentPage.rows],
  );

  const throttledRowsChange = React.useCallback(
    (newCache: GridRowsInternalCache, throttle: boolean) => {
      const run = () => {
        timeout.current = null;
        lastUpdateMs.current = Date.now();
        apiRef.current.setState((state) => ({
          ...state,
          rows: getRowsStateFromCache(
            apiRef.current.rowsCache,
            gridRowTreeSelector(apiRef),
            apiRef,
            props.rowCount,
            props.loading,
          ),
        }));
        apiRef.current.publishEvent(GridEvents.rowsSet);
        apiRef.current.forceUpdate();
      };

      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }

      apiRef.current.rowsCache = newCache;

      if (!throttle) {
        run();
        return;
      }

      const throttleRemainingTimeMs = props.throttleRowsMs - (Date.now() - lastUpdateMs.current);
      if (throttleRemainingTimeMs > 0) {
        timeout.current = setTimeout(run, throttleRemainingTimeMs);
        return;
      }

      run();
    },
    [props.throttleRowsMs, props.rowCount, props.loading, apiRef],
  );

  /**
   * API METHODS
   */
  const setRows = React.useCallback<GridRowApi['setRows']>(
    (rows) => {
      logger.debug(`Updating all rows, new length ${rows.length}`); 
      throttledRowsChange(
        convertRowsPropToState({
          rows,
          prevCache: apiRef.current.rowsCache,
          getRowId: props.getRowId,
        }),
        true,
      );
    },
    [apiRef, logger, props.getRowId, throttledRowsChange],
  );

  const updateRows = React.useCallback<GridRowApi['updateRows']>(
    (updates) => {
      if (props.signature === GridSignature.DataGrid && updates.length > 1) {
        // TODO: Add test with direct call to `apiRef.current.updateRows` in DataGrid after enabling the `apiRef` on the free plan.
        throw new Error(
          [
            "MUI: You can't update several rows at once in `apiRef.current.updateRows` on the DataGrid.",
            'You need to upgrade to the DataGridPro component to unlock this feature.',
          ].join('\n'),
        );
      }

      // we remove duplicate updates. A server can batch updates, and send several updates for the same row in one fn call.
      const uniqUpdates = new Map<GridRowId, GridRowModel>();

      updates.forEach((update) => {
        const id = getGridRowId(
          update,
          props.getRowId,
          'A row was provided without id when calling updateRows():',
        );

        if (uniqUpdates.has(id)) {
          uniqUpdates.set(id, { ...uniqUpdates.get(id), ...update });
        } else {
          uniqUpdates.set(id, update);
        }
      });

      const deletedRowIds: GridRowId[] = [];

      const newStateValue: GridRowInternalCacheValue = {
        idRowsLookup: { ...apiRef.current.rowsCache.value.idRowsLookup },
        ids: [...apiRef.current.rowsCache.value.ids],
      };

      uniqUpdates.forEach((partialRow, id) => {
        // eslint-disable-next-line no-underscore-dangle
        if (partialRow._action === 'delete') {
          delete newStateValue.idRowsLookup[id];
          deletedRowIds.push(id);
          return;
        }

        const oldRow = apiRef.current.getRow(id);
        if (!oldRow) {
          newStateValue.idRowsLookup[id] = partialRow;
          newStateValue.ids.push(id);
          return;
        }

        newStateValue.idRowsLookup[id] = { ...apiRef.current.getRow(id), ...partialRow };
      });

      if (deletedRowIds.length > 0) {
        newStateValue.ids = newStateValue.ids.filter((id) => !deletedRowIds.includes(id));
      }

      const state: GridRowsInternalCache = {
        ...apiRef.current.rowsCache,
        value: newStateValue,
      };

      throttledRowsChange(state, true);
    },
    [props.signature, props.getRowId, throttledRowsChange, apiRef],
  );

  const getRowModels = React.useCallback<GridRowApi['getRowModels']>(() => {
    const allRows = gridRowIdsSelector(apiRef);
    const idRowsLookup = gridRowsLookupSelector(apiRef);

    return new Map(allRows.map((id) => [id, idRowsLookup[id]]));
  }, [apiRef]);

  const getRowsCount = React.useCallback<GridRowApi['getRowsCount']>(
    () => gridRowCountSelector(apiRef),
    [apiRef],
  );

  const getAllRowIds = React.useCallback<GridRowApi['getAllRowIds']>(
    () => gridRowIdsSelector(apiRef),
    [apiRef],
  );

  const getRowIndexRelativeToVisibleRows = React.useCallback((id) => lookup[id], [lookup]);

  const setRowChildrenExpansion = React.useCallback<GridRowApi['setRowChildrenExpansion']>(
    (id, isExpanded) => {
      const currentNode = apiRef.current.getRowNode(id);
      if (!currentNode) {
        throw new Error(`MUI: No row with id #${id} found`);
      }
      const newNode: GridRowTreeNodeConfig = { ...currentNode, childrenExpanded: isExpanded };
      apiRef.current.setState((state) => {
        return {
          ...state,
          rows: {
            ...state.rows,
            tree: { ...state.rows.tree, [id]: newNode },
          },
        };
      });
      apiRef.current.forceUpdate();
      apiRef.current.publishEvent(GridEvents.rowExpansionChange, newNode);
    },
    [apiRef],
  );

  const getRowNode = React.useCallback<GridRowApi['getRowNode']>(
    (id) => gridRowTreeSelector(apiRef)[id] ?? null,
    [apiRef],
  );

  const rowApi: Omit<GridRowApi, 'rowsCache'> = {
    getRow,
    getRowModels,
    getRowsCount,
    getAllRowIds,
    setRows,
    updateRows,
    setRowChildrenExpansion,
    getRowNode,
    getRowIndexRelativeToVisibleRows,
  };

  /**
   * EVENTS
   */
  const groupRows = React.useCallback(() => {
    logger.info(`Row grouping pre-processing have changed, regenerating the row tree`);

    let rows: GridRowsProp | undefined;
    if (apiRef.current.rowsCache.rowsBeforePartialUpdates === props.rows) {
      // The `props.rows` has not changed since the last row grouping
      // We can keep the potential updates stored in `inputRowsAfterUpdates` on the new grouping
      rows = undefined;
    } else {
      // The `props.rows` has changed since the last row grouping
      // We must use the new `props.rows` on the new grouping
      // This occurs because this event is triggered before the `useEffect` on the rows when both the grouping pre-processing and the rows changes on the same render
      rows = props.rows;
    }
    throttledRowsChange(
      convertRowsPropToState({
        rows,
        getRowId: props.getRowId,
        prevCache: apiRef.current.rowsCache,
      }),
      false,
    );
  }, [logger, apiRef, props.rows, props.getRowId, throttledRowsChange]);

  const handleStrategyProcessorChange = React.useCallback<
    GridEventListener<GridEvents.activeStrategyProcessorChange>
  >(
    (methodName) => {
      if (methodName === 'rowTreeCreation') {
        groupRows();
      }
    },
    [groupRows],
  );

  const handleStrategyActivityChange = React.useCallback<
    GridEventListener<GridEvents.strategyAvailabilityChange>
  >(() => {
    // `rowTreeCreation` is the only processor ran when `strategyAvailabilityChange` is fired.
    // All the other processors listen to `rowsSet` which will be published by the `groupRows` method below.
    if (
      apiRef.current.unstable_getActiveStrategy('rowTree') !== gridRowGroupingNameSelector(apiRef)
    ) {
      groupRows();
    }
  }, [apiRef, groupRows]);

  useGridApiEventHandler(
    apiRef,
    GridEvents.activeStrategyProcessorChange,
    handleStrategyProcessorChange,
  );
  useGridApiEventHandler(
    apiRef,
    GridEvents.strategyAvailabilityChange,
    handleStrategyActivityChange,
  );

  useGridApiMethod(apiRef, rowApi, 'GridRowApi');

  /**
   * EFFECTS
   */
  React.useEffect(() => {
    return () => {
      if (timeout.current !== null) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  // The effect do not track any value defined synchronously during the 1st render by hooks called after `useGridRows`
  // As a consequence, the state generated by the 1st run of this useEffect will always be equal to the initialization one
  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // The new rows have already been applied (most likely in the `GridEvents.rowGroupsPreProcessingChange` listener)
    if (apiRef.current.rowsCache.rowsBeforePartialUpdates === props.rows) {
      return;
    }

    logger.debug(`Updating all rows, new length ${props.rows.length}`);
    throttledRowsChange(
      convertRowsPropToState({
        rows: props.rows,
        getRowId: props.getRowId,
        prevCache: apiRef.current.rowsCache,
      }),
      false,
    );
  }, [props.rows, props.rowCount, props.getRowId, logger, throttledRowsChange, apiRef]);
};
