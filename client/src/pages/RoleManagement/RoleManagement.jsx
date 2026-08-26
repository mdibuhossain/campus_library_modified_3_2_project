import { useMutation, useQuery } from "@apollo/client";
import {
    Alert, Button, Checkbox, Chip, CircularProgress, Divider, FormControlLabel,
    IconButton, LinearProgress, TextField, Tooltip, Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import { useState } from "react";
import { useAuth } from "../../Hooks/useAuth";
import PageLayout from "../../Layout/PageLayout";
import {
    GET_ROLES, GET_PERMISSION_KEYS, CREATE_ROLE, UPDATE_ROLE, DELETE_ROLE,
} from "../../queries/query";

const RoleManagement = () => {
    const { token } = useAuth();
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");

    const { data: { getRoles: roles = [] } = {}, loading, refetch } =
        useQuery(GET_ROLES, { variables: { token }, skip: !token, fetchPolicy: "network-only" });
    const { data: { getPermissionKeys: keys = [] } = {} } =
        useQuery(GET_PERMISSION_KEYS, { variables: { token }, skip: !token });

    const [createRole, { loading: creating }] = useMutation(CREATE_ROLE);
    const [updateRole, { loading: updating }] = useMutation(UPDATE_ROLE);
    const [deleteRole, { loading: deleting }] = useMutation(DELETE_ROLE);

    const run = (promise, ok) => {
        setError(""); setMessage("");
        return promise
            .then(() => { ok && setMessage(ok); return refetch(); })
            .catch((err) => setError(err?.graphQLErrors?.[0]?.message || err.message));
    };

    const handleCreate = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        run(
            createRole({ variables: { name: newName.trim(), description: newDescription, permissions: [], token } }),
            `Role "${newName.trim()}" created — now tick its permissions below`
        ).then(() => { setNewName(""); setNewDescription(""); });
    };

    // toggling a checkbox writes the whole permission list back
    const togglePermission = (role, key) => {
        const next = role.permissions.includes(key)
            ? role.permissions.filter((k) => k !== key)
            : [...role.permissions, key];
        run(updateRole({ variables: { _id: role._id, permissions: next, token } }));
    };

    const handleDelete = (role) => {
        if (!window.confirm(`Delete the role "${role.name}"?`)) return;
        run(deleteRole({ variables: { _id: role._id, token } }), `Role "${role.name}" deleted`);
    };

    return (
        <PageLayout>
            <Typography variant="h5" sx={{ fontWeight: 600, textAlign: "center", my: 4 }}>
                Roles &amp; permissions
            </Typography>
            <div className="2xl:w-7/12 xl:w-8/12 lg:w-9/12 md:w-10/12 w-11/12 mx-auto mb-16">
                {(creating || updating || deleting) && <LinearProgress />}
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
                {message && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>{message}</Alert>}

                {/* create */}
                <form onSubmit={handleCreate} className="bg-white p-5 rounded-lg shadow-lg mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <TextField
                        size="small" label="New role name" value={newName}
                        onChange={(e) => setNewName(e.target.value)} required
                    />
                    <TextField
                        size="small" label="Description (optional)" value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)} fullWidth
                    />
                    <Button type="submit" variant="contained" disabled={!newName.trim() || creating}>
                        create role
                    </Button>
                </form>

                {loading ? (
                    <div className="flex justify-center items-center py-10">
                        <CircularProgress color="info" />
                    </div>
                ) : (
                    roles.map((role) => (
                        <div key={role._id} className="bg-white p-5 rounded-lg shadow-lg mb-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <Typography variant="h6" sx={{ textTransform: "capitalize" }}>
                                        {role.name}
                                    </Typography>
                                    {role.protected &&
                                        <Tooltip title="Protected: cannot be edited, deleted, or reassigned. This is the lockout safeguard." arrow>
                                            <Chip icon={<LockIcon />} label="protected" size="small" color="warning" />
                                        </Tooltip>}
                                    {role.isDefault &&
                                        <Tooltip title="New signups get this role" arrow>
                                            <Chip label="default" size="small" color="info" />
                                        </Tooltip>}
                                    <Chip label={`${role.userCount} user${role.userCount === 1 ? "" : "s"}`} size="small" variant="outlined" />
                                </div>
                                <Tooltip
                                    title={
                                        role.protected ? "Protected roles cannot be deleted"
                                            : role.isDefault ? "The default role cannot be deleted"
                                                : role.userCount ? "Reassign its users first"
                                                    : ""
                                    }
                                    arrow
                                >
                                    <span>
                                        <IconButton
                                            onClick={() => handleDelete(role)}
                                            disabled={role.protected || role.isDefault || role.userCount > 0}
                                            size="small"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </div>
                            {role.description &&
                                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                                    {role.description}
                                </Typography>}
                            <Divider sx={{ my: 2 }} />
                            <div className="grid md:grid-cols-2 grid-cols-1">
                                {keys.map((perm) => (
                                    <Tooltip key={perm.key} title={perm.description} placement="top-start" arrow>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={role.permissions.includes(perm.key)}
                                                    disabled={role.protected || updating}
                                                    onChange={() => togglePermission(role, perm.key)}
                                                />
                                            }
                                            label={<span className="text-sm font-mono">{perm.key}</span>}
                                        />
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </PageLayout>
    );
};

export default RoleManagement;
