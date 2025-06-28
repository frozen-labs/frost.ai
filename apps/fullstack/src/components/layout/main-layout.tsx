import { Outlet } from '@tanstack/react-router'
import { Sidebar } from './sidebar'
import { Toaster } from '~/components/ui/sonner'

export function MainLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  )
}