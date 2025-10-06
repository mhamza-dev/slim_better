import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { LogOut, LayoutDashboard, Users, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AppLayout() {
    const { user, signOut } = useAuth()
    const location = useLocation()
    const localStorageSidebarOpen = localStorage.getItem('sidebarOpen')
    const [sidebarOpen, setSidebarOpen] = useState(localStorageSidebarOpen ? localStorageSidebarOpen === 'true' : true)

    const titleFromPath = (() => {
        const path = location.pathname.replace(/^\/+|\/+$/g, '') || 'dashboard'
        const key = path.split('/')[0]
        return key.charAt(0).toUpperCase() + key.slice(1)
    })()

    const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U'

    return (
        <div className="flex min-h-screen bg-[radial-gradient(1000px_400px_at_-10%_-10%,#e8f1ff,transparent),radial-gradient(800px_400px_at_110%_-10%,#f0f7ff,transparent)]">
            {/* Sidebar (slides on mobile, static on desktop) */}
            {sidebarOpen && (<aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-[#e6eef8] p-3 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="font-extrabold text-lg text-primary">Slim Better</div>
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => { setSidebarOpen((v) => !v); localStorage.setItem('sidebarOpen', "false") }}>
                        <Menu size={16} />
                    </Button>
                </div>

                <nav className="flex flex-col gap-2">
                    <NavLink to="/dashboard" className={({ isActive }) => `px-3 py-2 rounded-lg font-semibold inline-flex items-center gap-2 ${isActive ? 'bg-primary text-white' : 'text-primary hover:bg-blue-50'}`}><LayoutDashboard size={18} /> Dashboard</NavLink>
                    <NavLink to="/patients" className={({ isActive }) => `px-3 py-2 rounded-lg font-semibold inline-flex items-center gap-2 ${isActive ? 'bg-primary text-white' : 'text-primary hover:bg-blue-50'}`}><Users size={18} /> Patients</NavLink>
                </nav>

            </aside>)}
            {!sidebarOpen && (<aside className={`fixed inset-y-0 left-0 z-40 w-auto bg-white border-r border-[#e6eef8] p-3 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>

                <Button variant="ghost" size="sm" className="gap-2" onClick={() => { setSidebarOpen((v) => !v); localStorage.setItem('sidebarOpen', "true") }}>
                    <Menu size={16} />
                </Button>

            </aside>)}
            {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden" />}

            <div className="flex-1 flex flex-col">
                <header className="flex items-center justify-between px-4 py-2 bg-white/80 backdrop-blur border-b border-[#e6eef8]">
                    <div className="font-semibold text-primaryDark">{titleFromPath}</div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">{userInitial}</div>
                            <div className="hidden sm:block text-sm text-primaryDark">{user?.email || '—'}</div>
                        </div>
                        <Button onClick={signOut} variant="secondary" className="gap-2"><LogOut size={16} /> Sign out</Button>
                    </div>
                </header>
                <main className="p-3">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}


