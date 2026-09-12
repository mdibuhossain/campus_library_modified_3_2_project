import { useMutation, useQuery } from "@apollo/client";
import { Alert, CircularProgress, LinearProgress, MenuItem, Select, Tooltip, Typography } from "@mui/material";
import Pagination from '@mui/material/Pagination';
import { useAuth } from "../../Hooks/useAuth";
import PageLayout from "../../Layout/PageLayout";
import { GET_USERS, GET_ROLES, ASSIGN_ROLE } from "../../queries/query";
import UserRowActions from "../../components/Admin/UserRowActions";
import { useEffect, useState } from "react";
import useUserFilters from "../../Hooks/useUserFilters";
import UserFilters from "../../components/Admin/UserFilters";

const PER_PAGE = 6;

const MakeAdmin = () => {
    const { user, token } = useAuth();
    const [page, setPage] = useState(1);
    const [error, setError] = useState("");

    const { data: { getUsers: users = [] } = {}, loading: usersLoading, refetch: refetchUsers } =
        useQuery(GET_USERS, { variables: { token }, skip: !token });
    const { data: { getRoles: roles = [] } = {} } =
        useQuery(GET_ROLES, { variables: { token }, skip: !token });

    const [assignRole, { loading: assigning }] = useMutation(ASSIGN_ROLE);

    const filterState = useUserFilters(users);
    const { result: visibleUsers, isFiltered } = filterState;
    const pageCount = Math.max(1, Math.ceil(visibleUsers.length / PER_PAGE));

    useEffect(() => {
        if (page > pageCount) setPage(1);
    }, [page, pageCount]);

    const rolesByName = new Map(roles.map((r) => [r.name, r]));
    // a protected role can be neither granted nor taken away
    const assignable = roles.filter((r) => !r.protected);

    const handleChange = (targetUser, roleName) => {
        setError("");
        assignRole({ variables: { _id: targetUser._id, roleName, token } })
            .then(() => refetchUsers())
            .catch((err) =>
                setError(err?.graphQLErrors?.[0]?.message || err.message)
            );
    };

    return (
        <PageLayout>
            <Typography variant="h5" sx={{ fontWeight: 600, textAlign: "center", my: 4 }}>
                User roles
            </Typography>
            <div className="flex flex-col 2xl:w-6/12 xl:w-7/12 lg:w-8/12 md:w-9/12 w-11/12 mx-auto mt-10 mb-10 bg-white p-5 rounded-lg shadow-2xl">
                {(assigning) && <LinearProgress />}

                {!usersLoading && (
                    <UserFilters state={filterState} className="mb-4" />
                )}
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
                {usersLoading ? (
                    <div className=" flex justify-center items-center">
                        <CircularProgress color="info" />
                    </div>
                ) : (
                    <>
                        {visibleUsers.slice((page - 1) * PER_PAGE, ((page - 1) * PER_PAGE) + PER_PAGE).map((item) => {
                            const isSelf = user?.email === item?.email;
                            const isProtected = !!rolesByName.get(item?.role)?.protected;
                            const locked = isSelf || isProtected;
                            const reason = isSelf
                                ? "You cannot change your own role"
                                : isProtected
                                    ? "This role is protected and cannot be changed"
                                    : "";
                            return (
                                <div key={item?._id} className="grid grid-cols-1 sm:grid-cols-3 m-2">
                                    <div className="flex items-center col-span-2">
                                        <div className="mr-2 w-12 hidden sm:block">
                                            <img
                                                src={item?.photoURL || "/assets/images/avator.webp"}
                                                className="rounded-full w-full"
                                                alt="Avatar"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-start w-full">
                                            <h5 className="text-sm font-medium leading-tight mr-2">
                                                {item?.displayName} <span className="text-xs">({item?.designation})</span>
                                            </h5>
                                            <p className="text-xs text-gray-500">
                                                {item?.email} {isSelf && "( me )"} (by-{item?.authType})
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-1 sm:justify-self-end sm:mt-0 mt-1">
                                        <Tooltip title={reason} placement="top" arrow>
                                            <span>
                                                <Select
                                                    size="small"
                                                    value={item?.role || ""}
                                                    disabled={locked || assigning}
                                                    onChange={(e) => handleChange(item, e.target.value)}
                                                    sx={{ minWidth: 150, fontSize: 13 }}
                                                >
                                                    {/* the current role is always listed, even when it
                                                        is protected and so not otherwise assignable */}
                                                    {isProtected &&
                                                        <MenuItem value={item.role}>{item.role}</MenuItem>}
                                                    {assignable.map((r) => (
                                                        <MenuItem key={r._id} value={r.name}>{r.name}</MenuItem>
                                                    ))}
                                                </Select>
                                            </span>
                                        </Tooltip>
                                        {/* superadmin only: jump to this member's
                                            full record, or open a chat with them */}
                                        <UserRowActions target={item} onError={setError} dense />
                                    </div>
                                </div>
                            );
                        })}
                        {visibleUsers.length === 0 && (
                            <Typography
                                variant="body2"
                                sx={{ color: "text.secondary", textAlign: "center", py: 5 }}
                            >
                                {isFiltered
                                    ? "No user matches these filters."
                                    : "No users yet."}
                            </Typography>
                        )}

                        {pageCount > 1 && (
                            <Pagination
                                count={pageCount}
                                page={Math.min(page, pageCount)}
                                sx={{ mt: 3, mb: 1 }}
                                shape="rounded" color="warning" showFirstButton showLastButton
                                onChange={(e, value) => setPage(value)}
                            />
                        )}
                    </>
                )}
            </div>
        </PageLayout>
    );
};

export default MakeAdmin;
