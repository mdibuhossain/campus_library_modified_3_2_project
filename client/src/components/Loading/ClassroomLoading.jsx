import React from 'react'

function ClassroomLoading() {
    return (
        <div className="border border-blue-300 shadow rounded-md p-4 max-w-sm w-full">
            <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-6 py-1">
                    <div className="h-2 bg-slate-200 rounded"></div>
                    <div className="space-y-3">
                        <div className="h-2 bg-slate-200 rounded col-span-2"></div>
                        <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                        <div className="h-2 bg-slate-200 rounded col-span-1"></div>
                        <div className="bg-slate-200 rounded w-16 h-7"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ClassroomLoading