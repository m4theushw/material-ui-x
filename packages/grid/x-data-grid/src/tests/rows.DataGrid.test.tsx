import * as React from 'react';
import { createRenderer, fireEvent, screen } from '@mui/monorepo/test/utils';
import { expect } from 'chai';
import { spy, stub } from 'sinon';
import Portal from '@mui/material/Portal';
import { DataGrid, DataGridProps, GridActionsCellItem } from '@mui/x-data-grid';
import { getColumnValues, getRow } from 'test/utils/helperFn';
import { getData } from 'storybook/src/data/data-service';
import { COMPACT_DENSITY_FACTOR } from 'packages/grid/_modules_/grid/hooks/features/density/useGridDensity';

const isJSDOM = /jsdom/.test(window.navigator.userAgent);

describe('<DataGrid /> - Rows', () => {
  const { render, clock } = createRenderer({ clock: 'fake' });

  const baselineProps = {
    autoHeight: isJSDOM,
    rows: [
      {
        clientId: 'c1',
        first: 'Mike',
        age: 11,
      },
      {
        clientId: 'c2',
        first: 'Jack',
        age: 11,
      },
      {
        clientId: 'c3',
        first: 'Mike',
        age: 20,
      },
    ],
    columns: [{ field: 'clientId' }, { field: 'first' }, { field: 'age' }],
  };

  describe('props: getRowId', () => {
    it('should allow to select a field as id', () => {
      const getRowId = (row) => `${row.clientId}`;
      render(
        <div style={{ width: 300, height: 300 }}>
          <DataGrid {...baselineProps} getRowId={getRowId} />
        </div>,
      );
      expect(getColumnValues()).to.deep.equal(['c1', 'c2', 'c3']);
    });
  });

  describe('props: rows', () => {
    it('should support new dataset', () => {
      const { rows, columns } = getData(5, 2);

      const Test = (props: Pick<DataGridProps, 'rows'>) => (
        <div style={{ width: 300, height: 300 }}>
          <DataGrid {...props} columns={columns} disableVirtualization />
        </div>
      );

      const { setProps } = render(<Test rows={rows.slice(0, 2)} />);
      expect(getColumnValues(0)).to.deep.equal(['0', '1']);
      setProps({ rows });
      expect(getColumnValues(0)).to.deep.equal(['0', '1', '2', '3', '4']);
    });
  });

  it('should ignore events coming from a portal in the cell', () => {
    const handleRowClick = spy();
    const InputCell = () => <input type="text" name="input" />;
    const PortalCell = () => (
      <Portal>
        <input type="text" name="portal-input" />
      </Portal>
    );

    render(
      <div style={{ width: 300, height: 300 }}>
        <DataGrid
          rows={[{ id: '1' }]}
          onRowClick={handleRowClick}
          columns={[
            {
              field: 'id',
              renderCell: () => <PortalCell />,
            },
            {
              field: 'input',
              renderCell: () => <InputCell />,
            },
          ]}
        />
      </div>,
    );
    fireEvent.click(document.querySelector('input[name="portal-input"]'));
    expect(handleRowClick.callCount).to.equal(0);
    fireEvent.click(document.querySelector('input[name="input"]'));
    expect(handleRowClick.callCount).to.equal(1);
  });

  it('should apply the CSS class returned by getRowClassName', () => {
    const getRowId = (row) => `${row.clientId}`;
    const handleRowClassName = (params) => (params.row.age < 20 ? 'under-age' : '');
    render(
      <div style={{ width: 300, height: 300 }}>
        <DataGrid getRowClassName={handleRowClassName} getRowId={getRowId} {...baselineProps} />
      </div>,
    );
    expect(getRow(0)).to.have.class('under-age');
    expect(getRow(1)).to.have.class('under-age');
    expect(getRow(2)).not.to.have.class('under-age');
  });

  describe('columnType: actions', () => {
    const TestCase = ({
      getActions,
      ...other
    }: { getActions?: () => JSX.Element[] } & Partial<DataGridProps>) => {
      return (
        <div style={{ width: 300, height: 300 }}>
          <DataGrid
            {...baselineProps}
            rows={[{ id: 1 }]}
            columns={[
              {
                field: 'actions',
                type: 'actions',
                getActions,
              },
            ]}
            {...other}
          />
        </div>
      );
    };

    it('should throw an error if getActions is missing', function test() {
      if (!isJSDOM) {
        this.skip();
      }
      expect(() => {
        render(<TestCase />);
      }).toErrorDev([
        'MUI: Missing the `getActions` property in the `GridColDef`.',
        'The above error occurred in the <GridActionsCell> component',
        'MUI: GridErrorHandler - An unexpected error occurred.',
      ]);
    });

    it('should call getActions with the row params', () => {
      const getActions = stub().returns([]);
      render(<TestCase getActions={getActions} />);
      expect(getActions.args[0][0].id).to.equal(1);
      expect(getActions.args[0][0].row).to.deep.equal({ id: 1 });
    });

    it('should always show the actions not marked as showInMenu', () => {
      render(
        <TestCase
          getActions={() => [
            <GridActionsCellItem icon={<span />} label="delete" />,
            <GridActionsCellItem label="print" showInMenu />,
          ]}
        />,
      );
      expect(screen.queryByRole('button', { name: 'delete' })).not.to.equal(null);
      expect(screen.queryByText('print')).to.equal(null);
    });

    it('should show in a menu the actions marked as showInMenu', async () => {
      render(<TestCase getActions={() => [<GridActionsCellItem label="print" showInMenu />]} />);
      expect(screen.queryByText('print')).to.equal(null);
      fireEvent.click(screen.getByRole('button', { name: 'more' }));
      expect(screen.queryByText('print')).not.to.equal(null);
    });

    it('should not select the row when clicking in an action', () => {
      render(
        <TestCase getActions={() => [<GridActionsCellItem icon={<span />} label="print" />]} />,
      );
      expect(getRow(0).className).not.to.contain('Mui-selected');
      fireEvent.click(screen.getByRole('button', { name: 'print' }));
      expect(getRow(0).className).not.to.contain('Mui-selected');
    });

    it('should not select the row when clicking in a menu action', async () => {
      render(
        <TestCase
          getActions={() => [<GridActionsCellItem icon={<span />} label="print" showInMenu />]}
        />,
      );
      expect(getRow(0).className).not.to.contain('Mui-selected');
      fireEvent.click(screen.getByRole('button', { name: 'more' }));
      expect(screen.queryByText('print')).not.to.equal(null);
      fireEvent.click(screen.queryByText('print'));
      expect(getRow(0).className).not.to.contain('Mui-selected');
    });

    it('should not select the row when opening the menu', () => {
      render(<TestCase getActions={() => [<GridActionsCellItem label="print" showInMenu />]} />);
      expect(getRow(0).className).not.to.contain('Mui-selected');
      fireEvent.click(screen.getByRole('button', { name: 'more' }));
      expect(getRow(0).className).not.to.contain('Mui-selected');
    });

    it('should close other menus before opening a new one', () => {
      render(
        <TestCase
          rows={[{ id: 1 }, { id: 2 }]}
          getActions={() => [<GridActionsCellItem label="print" showInMenu />]}
        />,
      );
      expect(screen.queryAllByRole('menu')).to.have.length(0);

      fireEvent.click(screen.getAllByRole('button', { name: 'more' })[0]);
      clock.runToLast();
      expect(screen.queryAllByRole('menu')).to.have.length(1);

      fireEvent.click(screen.getAllByRole('button', { name: 'more' })[1]);
      clock.runToLast();
      expect(screen.queryAllByRole('menu')).to.have.length(1);
    });
  });

  describe('prop: getRowHeight', () => {
    before(function beforeHook() {
      if (isJSDOM) {
        // Need layouting
        this.skip();
      }
    });

    const ROW_HEIGHT = 52;
    const TestCase = (props) => {
      const getRowId = (row) => `${row.clientId}`;
      return (
        <div style={{ width: 300, height: 300 }}>
          <DataGrid {...baselineProps} {...props} getRowId={getRowId} />
        </div>
      );
    };

    it('should set each row height whe rowHeight prop is used', () => {
      const { setProps } = render(<TestCase />);

      expect(getRow(0).clientHeight).to.equal(ROW_HEIGHT);
      expect(getRow(1).clientHeight).to.equal(ROW_HEIGHT);
      expect(getRow(2).clientHeight).to.equal(ROW_HEIGHT);

      setProps({ rowHeight: 30 });

      expect(getRow(0).clientHeight).to.equal(30);
      expect(getRow(1).clientHeight).to.equal(30);
      expect(getRow(2).clientHeight).to.equal(30);
    });

    it('should set the second row to have a different row height than the others', () => {
      render(<TestCase getRowHeight={({ id }) => (id === 'c2' ? 100 : null)} />);

      expect(getRow(0).clientHeight).to.equal(ROW_HEIGHT);
      expect(getRow(1).clientHeight).to.equal(100);
      expect(getRow(2).clientHeight).to.equal(ROW_HEIGHT);
    });

    it('should set density to all but the row with variable row height', () => {
      const { setProps } = render(
        <TestCase getRowHeight={({ id }) => (id === 'c2' ? 100 : null)} />,
      );

      expect(getRow(0).clientHeight).to.equal(ROW_HEIGHT);
      expect(getRow(1).clientHeight).to.equal(100);
      expect(getRow(2).clientHeight).to.equal(ROW_HEIGHT);

      setProps({ density: 'compact' });

      expect(getRow(0).clientHeight).to.equal(Math.floor(ROW_HEIGHT * COMPACT_DENSITY_FACTOR));
      expect(getRow(1).clientHeight).to.equal(100);
      expect(getRow(2).clientHeight).to.equal(Math.floor(ROW_HEIGHT * COMPACT_DENSITY_FACTOR));
    });

    it('should set the correct rowHeight and variable row height', () => {
      const { setProps } = render(
        <TestCase getRowHeight={({ id }) => (id === 'c2' ? 100 : null)} />,
      );

      expect(getRow(0).clientHeight).to.equal(ROW_HEIGHT);
      expect(getRow(1).clientHeight).to.equal(100);
      expect(getRow(2).clientHeight).to.equal(ROW_HEIGHT);

      setProps({ rowHeight: 30 });

      expect(getRow(0).clientHeight).to.equal(30);
      expect(getRow(1).clientHeight).to.equal(100);
      expect(getRow(2).clientHeight).to.equal(30);
    });
  });

  describe('prop: getRowMargin', () => {
    const TestCase = (props: Partial<DataGridProps>) => {
      const getRowId = (row: any) => `${row.clientId}`;
      return (
        <div style={{ width: 300, height: 300 }}>
          <DataGrid {...baselineProps} {...props} getRowId={getRowId} />
        </div>
      );
    };

    it('should call with the correct params', () => {
      const getRowMargin = stub().returns({});
      render(<TestCase getRowMargin={getRowMargin} />);
      expect(getRowMargin.args[0][0]).to.deep.equal({
        isFirst: true,
        isLast: false,
        id: `${baselineProps.rows[0].clientId}`,
        model: baselineProps.rows[0],
      });
      expect(getRowMargin.args[2][0]).to.deep.equal({
        isFirst: false,
        isLast: true,
        id: `${baselineProps.rows[2].clientId}`,
        model: baselineProps.rows[2],
      });
    });

    it('should consider the margin when computing the content size', function test() {
      if (isJSDOM) {
        // Need layouting
        this.skip();
      }
      const marginTop = 5;
      const marginBottom = 10;
      const rowHeight = 50;
      render(
        <TestCase
          rowHeight={rowHeight}
          getRowMargin={() => ({ top: marginTop, bottom: marginBottom })}
        />,
      );
      const virtualScrollerContent = document.querySelector('.MuiDataGrid-virtualScrollerContent');
      const expectedHeight = baselineProps.rows.length * (rowHeight + marginTop + marginBottom);
      expect(virtualScrollerContent).toHaveInlineStyle({
        width: '300px',
        height: `${expectedHeight}px`,
      });
    });
  });
});
