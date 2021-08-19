import * as React from 'react';
import IconButton from '@material-ui/core/IconButton';
import MenuList from '@material-ui/core/MenuList';
import MoreVertIcon from '@material-ui/icons/MoreVert';
// @ts-expect-error fixed in Material-UI v5, types definitions were added.
import { unstable_useId as useId } from '@material-ui/core/utils';
import { GridRenderCellParams } from '../../models/params/gridCellParams';
import { gridClasses } from '../../gridClasses';
import { GridMenu } from '../menu/GridMenu';
import { GridActionsColDef } from '../../models/colDef/gridColDef';

const hasActions = (colDef): colDef is GridActionsColDef => typeof colDef.getActions === 'function';

export const GridActionsCell = (props: GridRenderCellParams) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const menuId = useId();
  const buttonId = useId();
  const { colDef, id, api } = props;

  if (!hasActions(colDef)) {
    throw new Error('Material-UI: Missing the `getActions` property in the `GridColDef`.');
  }

  const showMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const hideMenu = () => {
    setAnchorEl(null);
  };

  const options = colDef.getActions(api.getRowParams(id));
  const alwaysVisibleButtons = options.filter((option) => option.props.alwaysVisible);
  const notAlwaysVisibleButtons = options.filter((option) => !option.props.alwaysVisible);

  return (
    <div className={gridClasses.actionsCell}>
      {alwaysVisibleButtons.map((button, index) => React.cloneElement(button, { key: index }))}
      {notAlwaysVisibleButtons.length > 0 && (
        <IconButton
          id={buttonId}
          aria-label={api.getLocaleText('actionsCellMore')}
          aria-controls={menuId}
          aria-expanded={anchorEl ? 'true' : undefined}
          aria-haspopup="true"
          size="small"
          onClick={showMenu}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      )}
      {notAlwaysVisibleButtons.length > 0 && (
        <GridMenu
          id={menuId}
          onClickAway={hideMenu}
          onClick={hideMenu}
          open={Boolean(anchorEl)}
          target={anchorEl}
          position="bottom"
          aria-labelledby={buttonId}
        >
          <MenuList className="MuiDataGrid-gridMenuList">
            {notAlwaysVisibleButtons.map((button, index) =>
              React.cloneElement(button, { key: index }),
            )}
          </MenuList>
        </GridMenu>
      )}
    </div>
  );
};

export const renderActionsCell = (params) => <GridActionsCell {...params} />;
