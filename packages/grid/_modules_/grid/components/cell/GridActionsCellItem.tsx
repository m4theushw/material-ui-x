import * as React from 'react';
import IconButton, { IconButtonProps } from '@material-ui/core/IconButton';
import MenuItem, { MenuItemProps } from '@material-ui/core/MenuItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';

export type GridActionsCellItemProps = {
  label: string;
  icon?: React.ReactElement;
} & (
  | ({ alwaysVisible: true; icon: React.ReactElement } & IconButtonProps)
  | ({ alwaysVisible?: false } & MenuItemProps)
);

export const GridActionsCellItem = (props: GridActionsCellItemProps) => {
  const { label, icon, alwaysVisible, ...rest } = props;

  if (alwaysVisible) {
    return (
      <IconButton size="small" aria-label={label} {...(rest as any)}>
        {React.cloneElement(icon!, { fontSize: 'small' })}
      </IconButton>
    );
  }

  return (
    <MenuItem {...(rest as any)}>
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      {label}
    </MenuItem>
  );
};
