import { GridFilterItem, GridLinkOperator } from '../../../models/gridFilterItem';
import { GridFilterModel } from '../../../models/gridFilterModel';
import { GridRowId } from '../../../models/gridRows';

export const getDefaultGridFilterModel: () => GridFilterModel = () => ({
  items: [],
  linkOperator: GridLinkOperator.And,
});

export interface GridFilterState {
  filterModel: GridFilterModel;

  /**
   * Visibility status for each row.
   * A row is visible if it is passing the filters AND if its parent is expanded.
   * If a row is not registered in this lookup, it is visible.
   */
  visibleRowsLookup: Record<GridRowId, boolean>;

  /**
   * Amount of descendants that are passing the filters.
   * For the Tree Data, it includes all the intermediate depth levels (= amount of children + amount of grand children + ...).
   * For the Row Grouping by Column, it does not include the intermediate depth levels (= amount of descendant of maximum depth).
   * If a row is not registered in this lookup, it is supposed to have no descendant passing the filters.
   */
  filteredDescendantCountLookup: Record<GridRowId, number>;
}

export interface GridFilterInitialState {
  filterModel?: GridFilterModel;
}

/**
 * @param {GridRowId} rowId The id of the row we want to filter.
 * @param {(filterItem: GridFilterItem) => boolean} shouldApplyItem An optional callback to allow the filtering engine to only apply some items.
 */
export type GridAggregatedFilterItemApplier = (
  rowId: GridRowId,
  shouldApplyItem?: (filterItem: GridFilterItem) => boolean,
) => boolean;

export interface GridFilteringParams {
  isRowMatchingFilters: GridAggregatedFilterItemApplier | null;
}

export type GridFilteringMethod = (
  params: GridFilteringParams,
) => Pick<GridFilterState, 'visibleRowsLookup' | 'filteredDescendantCountLookup'>;

export type GridFilteringMethodCollection = { [methodName: string]: GridFilteringMethod };
