import React from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const RoleSelector = ({ role, setRole }) => {
  return (
    <FormControl fullWidth>
      <InputLabel>Role</InputLabel>
      <Select value={role} onChange={(e) => setRole(e.target.value)}>
        <MenuItem value="customer">Customer</MenuItem>
        <MenuItem value="enduser">End User</MenuItem>
      </Select>
    </FormControl>
  );
};

export default RoleSelector;