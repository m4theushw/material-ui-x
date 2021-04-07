import * as React from 'react';
import Checkbox from '@material-ui/core/Checkbox';
import { useGridSelector } from '../hooks/features/core/useGridSelector';
import { visibleSortedGridRowsSelector } from '../hooks/features/filter/gridFilterSelector';
import { gridRowCountSelector } from '../hooks/features/rows/gridRowsSelector';
import { selectedGridRowsCountSelector } from '../hooks/features/selection/gridSelectionSelector';
import { GridColumnHeaderParams } from '../models/params/gridColumnHeaderParams';
import { GridCellParams } from '../models/params/gridCellParams';
import { GridApiContext } from './GridApiContext';

export const GridHeaderCheckbox: React.FC<GridColumnHeaderParams> = () => {
  const apiRef = React.useContext(GridApiContext);
  const visibleRows = useGridSelector(apiRef, visibleSortedGridRowsSelector);

  const totalSelectedRows = useGridSelector(apiRef, selectedGridRowsCountSelector);
  const totalRows = useGridSelector(apiRef, gridRowCountSelector);

  const [isIndeterminate, setisIndeterminate] = React.useState(
    totalSelectedRows > 0 && totalSelectedRows !== totalRows,
  );
  const [isChecked, setChecked] = React.useState(
    totalSelectedRows === totalRows || isIndeterminate,
  );

  React.useEffect(() => {
    const isNewIndeterminate = totalSelectedRows > 0 && totalSelectedRows !== totalRows;
    const isNewChecked = (totalRows > 0 && totalSelectedRows === totalRows) || isIndeterminate;
    setChecked(isNewChecked);
    setisIndeterminate(isNewIndeterminate);
  }, [isIndeterminate, totalRows, totalSelectedRows]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    setChecked(checked);
    apiRef!.current.selectRows(
      visibleRows.map((row) => row.id),
      checked,
    );
  };

  return (
    <Checkbox
      indeterminate={isIndeterminate}
      checked={isChecked}
      onChange={handleChange}
      className="MuiDataGrid-checkboxInput"
      color="primary"
      inputProps={{ 'aria-label': 'Select All Rows checkbox' }}
    />
  );
};
GridHeaderCheckbox.displayName = 'GridHeaderCheckbox';

export const GridCellCheckboxRenderer: React.FC<GridCellParams> = React.memo((props) => {
  const { getValue, field, id } = props;
  const apiRef = React.useContext(GridApiContext);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    apiRef!.current.selectRow(id, checked, true);
  };

  return (
    <Checkbox
      checked={!!getValue(field)}
      onChange={handleChange}
      className="MuiDataGrid-checkboxInput"
      color="primary"
      inputProps={{ 'aria-label': 'Select Row checkbox' }}
    />
  );
});
GridCellCheckboxRenderer.displayName = 'GridCellCheckboxRenderer';
