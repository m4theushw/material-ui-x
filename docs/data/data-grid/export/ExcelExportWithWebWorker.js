import * as React from 'react';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import {
  DataGridPremium,
  GridToolbarExport,
  GridToolbarContainer,
} from '@mui/x-data-grid-premium';
import { useDemoData } from '@mui/x-data-grid-generator';

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarExport
        excelOptions={{
          worker: () => new Worker(new URL('./worker.ts', import.meta.url)),
        }}
      />
    </GridToolbarContainer>
  );
}

export default function ExcelExportWithWebWorker() {
  const [inProgress, setInProgress] = React.useState(false);

  const { data } = useDemoData({
    dataSet: 'Commodity',
    rowLength: 10000,
    editable: true,
  });

  return (
    <Box sx={{ height: 520, width: '100%' }}>
      <Snackbar open={inProgress}>
        <Alert severity="info" icon={<CircularProgress size={24} />}>
          Exporting Excel file...
        </Alert>
      </Snackbar>
      <DataGridPremium
        {...data}
        loading={data.rows.length === 0}
        rowHeight={38}
        checkboxSelection
        components={{ Toolbar: CustomToolbar }}
        onExcelExportStateChange={(newState) => setInProgress(newState)}
      />
    </Box>
  );
}
