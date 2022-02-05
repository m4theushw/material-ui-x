import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { useDemoData } from '@mui/x-data-grid-generator';

export default function RowMarginGrid() {
  const { data } = useDemoData({
    dataSet: 'Commodity',
    rowLength: 100,
    maxColumns: 6,
  });

  const getRowMargin = React.useCallback((params) => {
    return { top: params.isFirst ? 0 : 5, bottom: params.isLast ? 0 : 5 };
  }, []);

  return (
    <div style={{ height: 400, width: '100%' }}>
      <DataGrid
        {...data}
        getRowMargin={getRowMargin}
        sx={{
          '& .MuiDataGrid-virtualScrollerRenderZone': {
            display: 'flex', // Prevents margin collapsing
            flexDirection: 'column',
          },
          '& .MuiDataGrid-row': {
            mt: '5px',
            mb: '5px',
            bgcolor: '#efefef',
          },
          '& .MuiDataGrid-row[data-rowindex="0"]': {
            // TODO use custom row component
            mt: 0,
          },
          '& .MuiDataGrid-row[data-rowindex="99"]': {
            mb: 0,
          },
        }}
      />
    </div>
  );
}
