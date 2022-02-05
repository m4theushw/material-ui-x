import * as React from 'react';
import { GridPreProcessor, useGridRegisterPreProcessor } from '../../core/preProcessing';
import { GridApiRef } from '../../../models/api/gridApiRef';
import { DataGridProcessedProps } from '../../../models/props/DataGridProps';
import { useCurrentPageRows } from '../../utils/useCurrentPageRows';
import { GridRowMarginParams } from '../../../models/params/gridRowParams';

/**
 * @requires useGridPageSize (method)
 * @requires useGridPage (method)
 */
export const useGridRowMargin = (
  apiRef: GridApiRef,
  props: Pick<DataGridProcessedProps, 'getRowMargin' | 'pagination' | 'paginationMode'>,
) => {
  const currentPage = useCurrentPageRows(apiRef, props);

  const { getRowMargin } = props;

  const addRowMargin = React.useCallback<GridPreProcessor<'rowHeight'>>(
    (initialValue, row) => {
      if (!getRowMargin) {
        return initialValue;
      }

      const index = currentPage.lookup[row.id];
      const isFirst = index === 0;
      const isLast = index === currentPage.rows.length - 1;
      const params: GridRowMarginParams = { ...row, isFirst, isLast };

      const margin = getRowMargin(params);

      return { ...initialValue, marginTop: margin.top ?? 0, marginBottom: margin.bottom ?? 0 };
    },
    [currentPage.lookup, currentPage.rows.length, getRowMargin],
  );

  useGridRegisterPreProcessor(apiRef, 'rowHeight', addRowMargin);
};
