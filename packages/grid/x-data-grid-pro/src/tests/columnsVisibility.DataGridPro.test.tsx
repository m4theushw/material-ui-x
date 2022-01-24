import * as React from 'react';
import { spy } from 'sinon';
import { expect } from 'chai';
import { createRenderer } from '@mui/monorepo/test/utils';
import {
  DataGridPro,
  GridApiRef,
  useGridApiRef,
  DataGridProProps,
  GridRowsProp,
  GridColumns,
  gridColumnLookupSelector,
  gridColumnVisibilityModelSelector,
} from '@mui/x-data-grid-pro';

const isJSDOM = /jsdom/.test(window.navigator.userAgent);

const rows: GridRowsProp = [{ id: 1 }];

const columns: GridColumns = [{ field: 'id' }];

/**
 * TODO: Remove deprecated tests on v6
 */
describe('<DataGridPro /> - Columns Visibility', () => {
  const { render } = createRenderer();

  let apiRef: GridApiRef;

  const TestDataGridPro = (
    props: Omit<DataGridProProps, 'columns' | 'rows' | 'apiRef'> &
      Partial<Pick<DataGridProProps, 'rows' | 'columns'>>,
  ) => {
    apiRef = useGridApiRef();

    return (
      <div style={{ width: 300, height: 300 }}>
        <DataGridPro
          columns={columns}
          rows={rows}
          {...props}
          apiRef={apiRef}
          autoHeight={isJSDOM}
        />
      </div>
    );
  };

  describe('apiRef: setColumnVisibility', () => {
    describe('Model on initialState: do not update `GridColDef.hide`', () => {
      it('should update `columnVisibilityModel` but not `GridColDef.hide` in state', () => {
        render(
          <TestDataGridPro
            initialState={{ columns: { columnVisibilityModel: { idBis: false } } }}
          />,
        );
        apiRef.current.setColumnVisibility('id', false);
        expect(gridColumnLookupSelector(apiRef.current.state).id.hide).to.equal(false);
        expect(gridColumnVisibilityModelSelector(apiRef.current.state)).to.deep.equal({
          id: false,
          idBis: false,
        });

        apiRef.current.setColumnVisibility('id', true);
        expect(gridColumnLookupSelector(apiRef.current.state).id.hide).to.equal(false);
        expect(gridColumnVisibilityModelSelector(apiRef.current.state)).to.deep.equal({
          id: true,
          idBis: false,
        });
      });

      it('should call `onColumnVisibilityModelChange` with the new model', () => {
        const onColumnVisibilityModelChange = spy();

        render(
          <TestDataGridPro
            initialState={{ columns: { columnVisibilityModel: { idBis: false } } }}
            onColumnVisibilityModelChange={onColumnVisibilityModelChange}
          />,
        );

        apiRef.current.setColumnVisibility('id', false);
        expect(onColumnVisibilityModelChange.callCount).to.equal(1);
        expect(onColumnVisibilityModelChange.lastCall.firstArg).to.deep.equal({
          id: false,
          idBis: false,
        });

        apiRef.current.setColumnVisibility('id', true);
        expect(onColumnVisibilityModelChange.callCount).to.equal(2);
        expect(onColumnVisibilityModelChange.lastCall.firstArg).to.deep.equal({
          idBis: false,
          id: true,
        });
      });

      it('should not call `onColumnVisibilityChange`', () => {
        const onColumnVisibilityChange = spy();

        render(
          <TestDataGridPro
            initialState={{ columns: { columnVisibilityModel: { idBis: false } } }}
            onColumnVisibilityChange={onColumnVisibilityChange}
          />,
        );

        apiRef.current.setColumnVisibility('id', false);
        expect(onColumnVisibilityChange.callCount).to.equal(0);

        apiRef.current.setColumnVisibility('id', true);
        expect(onColumnVisibilityChange.callCount).to.equal(0);
      });
    });

    describe('No model on initialState or on the control prop on 1st render: use `GridColDef.hide` (deprecated)', () => {
      it('should update `columnVisibilityModel` and `GridColDef.hide` in state', () => {
        render(<TestDataGridPro />);

        apiRef.current.setColumnVisibility('id', false);
        expect(gridColumnLookupSelector(apiRef.current.state).id.hide).to.equal(true);
        expect(gridColumnVisibilityModelSelector(apiRef.current.state)).to.deep.equal({
          id: false,
        });

        apiRef.current.setColumnVisibility('id', true);
        expect(gridColumnLookupSelector(apiRef.current.state).id.hide).to.equal(false);
        expect(gridColumnVisibilityModelSelector(apiRef.current.state)).to.deep.equal({ id: true });
      });

      it('should call `onColumnVisibilityModelChange` with the new model', () => {
        const onColumnVisibilityModelChange = spy();

        render(<TestDataGridPro onColumnVisibilityModelChange={onColumnVisibilityModelChange} />);

        apiRef.current.setColumnVisibility('id', false);
        expect(onColumnVisibilityModelChange.callCount).to.equal(1);
        expect(onColumnVisibilityModelChange.lastCall.firstArg).to.deep.equal({ id: false });

        apiRef.current.setColumnVisibility('id', true);
        expect(onColumnVisibilityModelChange.callCount).to.equal(2);
        expect(onColumnVisibilityModelChange.lastCall.firstArg).to.deep.equal({ id: true });
      });

      it('should call `onColumnVisibilityChange` with the new visibility status', () => {
        const onColumnVisibilityChange = spy();

        render(<TestDataGridPro onColumnVisibilityChange={onColumnVisibilityChange} />);

        apiRef.current.setColumnVisibility('id', false);
        expect(onColumnVisibilityChange.callCount).to.equal(1);
        expect(onColumnVisibilityChange.lastCall.firstArg).to.have.property('isVisible', false);
        expect(onColumnVisibilityChange.lastCall.firstArg).to.have.property('field', 'id');

        apiRef.current.setColumnVisibility('id', true);
        expect(onColumnVisibilityChange.callCount).to.equal(2);
        expect(onColumnVisibilityChange.lastCall.firstArg).to.have.property('isVisible', true);
        expect(onColumnVisibilityChange.lastCall.firstArg).to.have.property('field', 'id');
      });
    });
  });

  describe('apiRef: setColumnVisibilityModel', () => {
    it('should update `setColumnVisibilityModel` in state and call `onColumnVisibilityModelChange`', () => {
      const onColumnVisibilityModelChange = spy();

      render(
        <TestDataGridPro
          initialState={{ columns: { columnVisibilityModel: { idBis: false } } }}
          onColumnVisibilityModelChange={onColumnVisibilityModelChange}
        />,
      );
      apiRef.current.setColumnVisibilityModel({});
      expect(onColumnVisibilityModelChange.callCount).to.equal(1);
      expect(onColumnVisibilityModelChange.lastCall.firstArg).to.deep.equal({});
    });
  });
});
