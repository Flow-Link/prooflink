"use client"

import { useEffect } from "react"

export default function DashboardRedirect() {
  useEffect(() => {
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || "http://localhost:3100"
    window.location.href = dashboardUrl
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500 mx-auto">
          <span className="text-2xl">⚡</span>
        </div>
        <p className="text-lg font-medium text-foreground">Redirecting to Dashboard...</p>
        <p className="mt-2 text-sm text-foreground/60">
          If you are not redirected,{" "}
          <a href="http://localhost:3100" className="text-blue-400 underline">
            click here
          </a>
        </p>
      </div>
    </div>
  )
}
