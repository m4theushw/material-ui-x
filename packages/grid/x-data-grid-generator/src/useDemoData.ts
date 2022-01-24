import * as React from 'react';
import LRUCache from 'lru-cache';
import { GridDemoData, getRealGridData } from './services/real-data-service';
import { getCommodityColumns } from './commodities.columns';
import { getEmployeeColumns } from './employees.columns';
import asyncWorker from './asyncWorker';
import {
  AddPathToDemoDataOptions,
  DemoTreeDataValue,
  addTreeDataOptionsToDemoData,
} from './services/tree-data-generator';
import { GridColumnVisibilityModel } from '../../_modules_';

const dataCache = new LRUCache<string, DemoTreeDataValue>({
  max: 10,
  maxAge: 60 * 5 * 1e3, // 5 minutes
});

export type DemoDataReturnType = {
  data: DemoTreeDataValue;
  loading: boolean;
  setRowLength: (count: number) => void;
  loadNewData: () => void;
};

type DataSet = 'Commodity' | 'Employee';

export interface UseDemoDataOptions {
  dataSet: DataSet;
  rowLength: number;
  maxColumns?: number;
  visibleFields?: string[];
  editable?: boolean;
  treeData?: AddPathToDemoDataOptions;
}

// Generate fake data from a seed.
// It's about x20 faster than getRealData.
async function extrapolateSeed(rowLength: number, data: GridDemoData): Promise<GridDemoData> {
  return new Promise<any>((resolve) => {
    const seed = data.rows;
    const rows = data.rows.slice();
    const tasks = { current: rowLength - seed.length };

    function work() {
      const row = {} as any;

      for (let j = 0; j < data.columns.length; j += 1) {
        const column = data.columns[j];
        const index = Math.round(Math.random() * (seed.length - 1));

        if (column.field === 'id') {
          row.id = `id-${tasks.current + seed.length}`;
        } else {
          row[column.field] = seed[index][column.field];
        }
      }

      rows.push(row);

      tasks.current -= 1;
    }

    asyncWorker({
      work,
      done: () => resolve({ ...data, rows }),
      tasks,
    });
  });
}

const deepFreeze = <T>(object: T): T => {
  // Retrieve the property names defined on object
  const propNames = Object.getOwnPropertyNames(object);

  // Freeze properties before freezing self

  // eslint-disable-next-line no-restricted-syntax
  for (const name of propNames) {
    const value = object[name as keyof T];

    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }

  return Object.freeze(object);
};

export const useDemoData = (options: UseDemoDataOptions): DemoDataReturnType => {
  const [rowLength, setRowLength] = React.useState(options.rowLength);
  const [index, setIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const getColumns = React.useCallback(() => {
    let columns =
      options.dataSet === 'Commodity'
        ? getCommodityColumns(options.editable)
        : getEmployeeColumns();

    if (options.visibleFields) {
      columns = columns.map((col) =>
        options.visibleFields?.includes(col.field) ? col : { ...col, hide: true },
      );
    }
    if (options.maxColumns) {
      columns = columns.slice(0, options.maxColumns);
    }

    return columns;
  }, [options.dataSet, options.editable, options.maxColumns, options.visibleFields]);

  const [data, setData] = React.useState<DemoTreeDataValue>(() => {
    const columns = getColumns();

    // TODO: Stop using `GridColDef.hide` in v6
    const columnVisibilityModel: GridColumnVisibilityModel = {};
    columns.forEach((col) => {
      if (col.hide) {
        columnVisibilityModel[col.field] = false;
      }
    });

    return addTreeDataOptionsToDemoData(
      {
        columns,
        rows: [],
        initialState: { columns: { columnVisibilityModel } },
      },
      options.treeData,
    );
  });

  React.useEffect(() => {
    const cacheKey = `${options.dataSet}-${rowLength}-${index}-${options.maxColumns}`;

    // Cache to allow fast switch between the JavaScript and TypeScript version
    // of the demos.
    if (dataCache.has(cacheKey)) {
      const newData = dataCache.get(cacheKey)!;
      setData(newData);
      setLoading(false);
      return undefined;
    }

    let active = true;

    (async () => {
      setLoading(true);

      let newData: DemoTreeDataValue;
      if (rowLength > 1000) {
        newData = await getRealGridData(1000, getColumns());
        newData = await extrapolateSeed(rowLength, newData);
      } else {
        newData = await getRealGridData(rowLength, getColumns());
      }

      if (!active) {
        return;
      }

      newData = addTreeDataOptionsToDemoData(newData, {
        maxDepth: options.treeData?.maxDepth,
        groupingField: options.treeData?.groupingField,
        averageChildren: options.treeData?.averageChildren,
      });

      // It's quite slow. No need for it in production.
      if (process.env.NODE_ENV !== 'production') {
        deepFreeze(newData);
      }

      dataCache.set(cacheKey, newData);
      setData(newData);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [
    rowLength,
    options.dataSet,
    options.maxColumns,
    options.treeData?.maxDepth,
    options.treeData?.groupingField,
    options.treeData?.averageChildren,
    index,
    getColumns,
  ]);

  return {
    data,
    loading,
    setRowLength,
    loadNewData: () => {
      setIndex((oldIndex) => oldIndex + 1);
    },
  };
};
